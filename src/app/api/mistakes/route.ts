import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/mistakes?paper=&category=&status=active|mastered|all
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const paper = sp.get("paper");
  const category = sp.get("category");
  const status = sp.get("status") ?? "active";

  const where: Record<string, unknown> = { userId: session.id };
  if (paper) where.question = { paperId: paper };
  if (category) where.errorCategory = category;
  if (status === "active") where.mastered = false;
  if (status === "mastered") where.mastered = true;

  const wrongs = await prisma.wrongQuestion.findMany({
    where,
    orderBy: [{ mastered: "asc" }, { nextReviewAt: "asc" }],
    include: {
      question: {
        include: {
          paper: { select: { code: true, name: true } },
          knowledgePoint: { select: { title: true } },
        },
      },
    },
  });

  const [total, active, mastered, due] = await Promise.all([
    prisma.wrongQuestion.count({ where: { userId: session.id } }),
    prisma.wrongQuestion.count({ where: { userId: session.id, mastered: false } }),
    prisma.wrongQuestion.count({ where: { userId: session.id, mastered: true } }),
    prisma.wrongQuestion.count({ where: { userId: session.id, mastered: false, nextReviewAt: { lte: new Date() } } }),
  ]);

  return NextResponse.json({
    total,
    active,
    mastered,
    due,
    wrongs: wrongs.map((w) => ({
      id: w.id,
      questionId: w.questionId,
      firstWrongAt: w.firstWrongAt,
      lastWrongAt: w.lastWrongAt,
      wrongCount: w.wrongCount,
      stage: w.stage,
      nextReviewAt: w.nextReviewAt,
      errorCategory: w.errorCategory,
      userLabel: w.userLabel,
      mastered: w.mastered,
      question: {
        paperCode: w.question.paper.code,
        paperName: w.question.paper.name,
        textMd: w.question.textMd,
        difficulty: w.question.difficulty,
        kpTitle: w.question.knowledgePoint?.title ?? null,
      },
    })),
  });
}

export const dynamic = "force-dynamic";
