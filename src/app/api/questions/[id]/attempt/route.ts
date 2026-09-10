import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkAnswer } from "@/lib/questions/check";
import { toAnswerBundle } from "@/lib/serializers";
import { recordAttempt } from "@/lib/activities";

const schema = z.object({
  answer: z.unknown(),
  timeSpentSec: z.number().min(0).max(7200).optional(),
  mode: z.string().max(32).optional(),
});

// POST /api/questions/:id/attempt — 提交答案，服务端校验（前端永不接触正确答案）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      paper: { select: { code: true, name: true } },
    },
  });
  if (!q || q.status !== "published") {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const result = checkAnswer(
    { type: q.type, marks: q.marks, answerJson: q.answerJson, options: q.options },
    parsed.data.answer
  );

  const answerJson = JSON.stringify(parsed.data.answer);
  const unlocked = await recordAttempt({
    userId: session?.id ?? null,
    questionId: q.id,
    questionKpId: q.knowledgePointId,
    questionDifficulty: q.difficulty,
    isCorrect: result.isCorrect,
    score: result.score,
    maxScore: result.maxScore,
    answerJson,
    timeSpentSec: parsed.data.timeSpentSec ?? 0,
    mode: parsed.data.mode ?? "PRACTICE",
  });

  return NextResponse.json({
    result: toAnswerBundle(q, result),
    unlockedAchievements: unlocked,
  });
}

export const dynamic = "force-dynamic";
