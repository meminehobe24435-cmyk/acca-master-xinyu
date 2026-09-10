import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/mistakes/:id — 单条操作（master/unmaster/category/delete）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  const wrong = await prisma.wrongQuestion.findFirst({ where: { id, userId: session.id } });
  if (!wrong) return NextResponse.json({ error: "记录不存在" }, { status: 404 });

  if (action === "master") {
    await prisma.wrongQuestion.update({ where: { id }, data: { mastered: true, stage: 5 } });
  } else if (action === "unmaster") {
    await prisma.wrongQuestion.update({ where: { id }, data: { mastered: false, stage: 0, nextReviewAt: new Date() } });
  } else if (action === "category") {
    await prisma.wrongQuestion.update({ where: { id }, data: { errorCategory: body?.category ?? null } });
  } else if (action === "delete") {
    await prisma.wrongQuestion.delete({ where: { id } });
  } else {
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
