import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkAnswer } from "@/lib/questions/check";
import { recordAttempt } from "@/lib/activities";

const schema = z.object({
  answers: z.record(z.unknown()),
  submitEarly: z.boolean().optional(),
});

// POST /api/mock/attempt/:id/submit — 交卷（服务端评分；超时自动提交走同一接口）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const attempt = await prisma.mockExamAttempt.findUnique({
    where: { id },
    include: { mockExam: { include: { paper: true } } },
  });
  if (!attempt) return NextResponse.json({ error: "考试不存在" }, { status: 404 });
  if (session && attempt.userId && attempt.userId !== session.id) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }
  if (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED") {
    return NextResponse.json({ error: "已交卷", attemptId: attempt.id }, { status: 409 });
  }

  const isAuto = !parsed.data.submitEarly && new Date() > attempt.endAt;
  const config = JSON.parse(attempt.mockExam.configJson) as {
    sections: { id: string; name: string; count: number; marksPerQuestion: number; questionIds: string[] }[];
  };
  const orderedIds = config.sections.flatMap((s) => s.questionIds ?? []);

  const questions = await prisma.question.findMany({
    where: { id: { in: orderedIds } },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  const qOrderMap = new Map(orderedIds.map((qid, i) => [qid, i]));
  questions.sort((a, b) => (qOrderMap.get(a.id) ?? 0) - (qOrderMap.get(b.id) ?? 0));

  let totalScore = 0;
  let totalMarks = 0;
  const results: Record<
    string,
    { answer: unknown; isCorrect: boolean; score: number; maxScore: number }
  > = {};
  let answeredCount = 0;

  const userAnswers = parsed.data.answers ?? {};

  for (const q of questions) {
    const answer = userAnswers[q.id] ?? null;
    const check = checkAnswer(
      { type: q.type, marks: q.marks, answerJson: q.answerJson, options: q.options },
      answer
    );
    const answered = answer !== null && answer !== undefined && !(typeof answer === "string" && answer.trim() === "");
    if (answered) answeredCount++;
    results[q.id] = {
      answer,
      isCorrect: check.isCorrect,
      score: check.score,
      maxScore: check.maxScore,
    };
    totalScore += check.score;
    totalMarks += check.maxScore;
  }

  // 服务端统计：按章节/知识点
  const gradedQIds = Object.keys(results);
  const metaRows = await prisma.question.findMany({
    where: { id: { in: gradedQIds } },
    select: {
      id: true,
      chapter: { select: { id: true, title: true } },
      knowledgePointId: true,
      knowledgePoint: { select: { title: true } },
      paperId: true,
    },
  });
  const chapterStats = new Map<string, { title: string; earned: number; total: number; correct: number; count: number }>();
  const kpStats = new Map<string, { title: string; earned: number; total: number; correct: number; count: number }>();
  for (const m of metaRows) {
    const r = results[m.id];
    if (!r) continue;
    const cKey = m.chapter?.id ?? "none";
    const cs = chapterStats.get(cKey) ?? { title: m.chapter?.title ?? "未分类", earned: 0, total: 0, correct: 0, count: 0 };
    cs.earned += r.score; cs.total += r.maxScore; cs.correct += r.isCorrect ? 1 : 0; cs.count += 1;
    chapterStats.set(cKey, cs);
    const kKey = m.knowledgePointId ?? "none";
    const ks = kpStats.get(kKey) ?? { title: m.knowledgePoint?.title ?? "未分类", earned: 0, total: 0, correct: 0, count: 0 };
    ks.earned += r.score; ks.total += r.maxScore; ks.correct += r.isCorrect ? 1 : 0; ks.count += 1;
    kpStats.set(kKey, ks);
  }

  const sectionStats = config.sections.map((s) => {
    const secIds = s.questionIds ?? [];
    const secQs = questions.filter((q) => secIds.includes(q.id));
    const earned = secQs.reduce((a, q) => a + (results[q.id]?.score ?? 0), 0);
    const total = secQs.reduce((a, q) => a + (results[q.id]?.maxScore ?? 0), 0);
    return {
      id: s.id,
      name: s.name,
      earned,
      total,
      attempted: secQs.filter((q) => results[q.id] && results[q.id]!.answer !== null).length,
      count: secQs.length,
    };
  }).filter((s) => s.count > 0);

  const finalScore = Math.round((totalScore / Math.max(1, totalMarks)) * 100);
  const status = isAuto ? "AUTO_SUBMITTED" : "SUBMITTED";

  await prisma.mockExamAttempt.update({
    where: { id: attempt.id },
    data: {
      status,
      submittedAt: new Date(),
      answersJson: JSON.stringify(results),
      score: finalScore,
      totalMarks,
      sectionStatsJson: JSON.stringify(sectionStats),
    },
  });

  // 联动用户学习记录（客观题记 attempt；主观题也记入）
  if (attempt.userId) {
    for (const q of questions) {
      const r = results[q.id];
      if (!r || r.answer === null) continue;
      await recordAttempt({
        userId: attempt.userId,
        questionId: q.id,
        questionKpId: q.knowledgePointId,
        questionDifficulty: q.difficulty,
        isCorrect: r.isCorrect,
        score: r.score,
        maxScore: r.maxScore,
        answerJson: JSON.stringify(r.answer),
        timeSpentSec: 0,
        mode: "MOCK",
      });
    }
  }

  return NextResponse.json({
    attemptId: attempt.id,
    score: finalScore,
    totalMarks,
    answeredCount,
    questionCount: questions.length,
    status,
    sectionStats,
    chapterStats: [...chapterStats.values()].sort((a, b) => b.total - a.total),
    kpStats: [...kpStats.values()].sort((a, b) => b.total - a.total).slice(0, 15),
  });
}

export const dynamic = "force-dynamic";
