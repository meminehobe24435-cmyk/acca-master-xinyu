import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toPublicQuestion } from "@/lib/serializers";

// GET /api/mock/attempt/:id — 考试中：题目（无答案）+ 已保存进度
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const attempt = await prisma.mockExamAttempt.findUnique({
    where: { id },
    include: {
      mockExam: {
        include: {
          paper: { select: { code: true, name: true, accent: true } },
        },
      },
    },
  });
  if (!attempt) return NextResponse.json({ error: "考试不存在" }, { status: 404 });
  if (session && attempt.userId && attempt.userId !== session.id) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const config = JSON.parse(attempt.mockExam.configJson) as {
    sections: { id: string; name: string; count: number; marksPerQuestion: number; questionIds: string[] }[];
  };
  const orderedIds = config.sections.flatMap((s) => s.questionIds ?? []);

  const allQs = await prisma.question.findMany({
    where: { id: { in: orderedIds } },
    include: {
      paper: { select: { code: true, name: true } },
      variant: { select: { code: true } },
      chapter: { select: { title: true } },
      topic: { select: { title: true } },
      knowledgePoint: { select: { title: true } },
      options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  const qMap = new Map(allQs.map((q) => [q.id, q]));
  const questions = orderedIds
    .filter((qid) => qMap.has(qid))
    .map((qid, idx) => ({ seq: idx + 1, question: toPublicQuestion(qMap.get(qid)!) }));

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      startAt: attempt.startAt,
      endAt: attempt.endAt,
      status: attempt.status,
      durationMin: attempt.mockExam.durationMin,
      totalMarks: attempt.mockExam.totalMarks,
      paperCode: attempt.mockExam.paper.code,
      paperName: attempt.mockExam.paper.name,
    },
    sections: config.sections.map((s) => ({
      id: s.id,
      name: s.name,
      count: s.count,
      marksPerQuestion: s.marksPerQuestion,
    })),
    questions,
    savedAnswers: JSON.parse(attempt.answersJson ?? "{}"),
  });
}

export const dynamic = "force-dynamic";
