import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/knowledge/:id/favorite — 收藏知识点
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const existing = await prisma.favorite.findUnique({
    where: { userId_targetType_targetId: { userId: session.id, targetType: "KNOWLEDGE_POINT", targetId: id } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }
  await prisma.favorite.create({
    data: { userId: session.id, targetType: "KNOWLEDGE_POINT", targetId: id },
  });
  return NextResponse.json({ favorited: true });
}
