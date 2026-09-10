import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toPublicQuestion, attachUserStatus } from "@/lib/serializers";

// GET /api/questions/:id — 公开题目（不含答案）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      paper: { select: { code: true, name: true } },
      variant: { select: { code: true } },
      chapter: { select: { title: true } },
      topic: { select: { title: true } },
      knowledgePoint: { select: { title: true } },
      options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!q || q.status !== "published") {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }
  const statuses = await attachUserStatus(session?.id ?? null, q.id);
  return NextResponse.json({ question: toPublicQuestion(q, statuses) });
}

export const dynamic = "force-dynamic";
