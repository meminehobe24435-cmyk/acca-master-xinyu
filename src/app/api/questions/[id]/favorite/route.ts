import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/questions/:id/favorite { collectionId? } — 切换收藏
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const collectionId = body?.collectionId ? String(body.collectionId) : null;

  const existing = await prisma.favorite.findUnique({
    where: { userId_targetType_targetId: { userId: session.id, targetType: "QUESTION", targetId: id } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }
  await prisma.favorite.create({
    data: {
      userId: session.id,
      targetType: "QUESTION",
      targetId: id,
      collectionId,
      note: null,
    },
  });
  return NextResponse.json({ favorited: true });
}
