import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toPublicQuestion } from "@/lib/serializers";

// GET /api/questions/:id/similar — 同类相似题：同知识点 3 道 + 稍难 2 道（错题推荐）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: "题目不存在" }, { status: 404 });

  const sameKp = await prisma.question.findMany({
    where: {
      status: "published",
      knowledgePointId: q.knowledgePointId ?? undefined,
      id: { not: id },
    },
    include: {
      paper: { select: { code: true, name: true } },
      variant: { select: { code: true } },
      chapter: { select: { title: true } },
      topic: { select: { title: true } },
      knowledgePoint: { select: { title: true } },
      options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const harder = await prisma.question.findMany({
    where: {
      status: "published",
      paperId: q.paperId,
      difficulty: { gte: Math.min(5, q.difficulty + 1) },
      id: { not: id },
      ...(q.knowledgePointId ? { knowledgePointId: { not: q.knowledgePointId } } : {}),
    },
    include: {
      paper: { select: { code: true, name: true } },
      variant: { select: { code: true } },
      chapter: { select: { title: true } },
      topic: { select: { title: true } },
      knowledgePoint: { select: { title: true } },
      options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { difficulty: "asc" },
    take: 2,
  });

  return NextResponse.json({
    similar: [...sameKp, ...harder].map((x) => toPublicQuestion(x, {
      favorited: false,
      inWrongBook: false,
      wrongCount: 0,
      masteryScore: null,
    })),
  });
}

export const dynamic = "force-dynamic";
