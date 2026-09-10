import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/plan/tasks/:id — 手动完成任务
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const task = await prisma.dailyTask.findFirst({ where: { id, userId: session.id } });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  const completed = !task.completed;
  await prisma.dailyTask.update({
    where: { id },
    data: { completed, doneCount: completed ? task.targetCount : task.doneCount },
  });
  return NextResponse.json({ ok: true, completed });
}
