import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword, validatePassword } from "@/lib/auth";

const schema = z.object({
  displayName: z.string().max(40).optional(),
  examDate: z.string().nullable().optional(),
  dailyGoal: z.number().int().min(5).max(200).optional(),
  weeklyDays: z.number().int().min(1).max(7).optional(),
  newPassword: z.string().optional(),
  oldPassword: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) data.displayName = parsed.data.displayName;
  if (parsed.data.examDate !== undefined) data.examDate = parsed.data.examDate ? new Date(parsed.data.examDate) : null;
  if (parsed.data.dailyGoal !== undefined) data.dailyGoal = parsed.data.dailyGoal;
  if (parsed.data.weeklyDays !== undefined) data.weeklyDays = parsed.data.weeklyDays;

  if (parsed.data.newPassword) {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    const { verifyPassword } = await import("@/lib/auth");
    if (!(await verifyPassword(parsed.data.oldPassword ?? "", user.passwordHash))) {
      return NextResponse.json({ error: "原密码不正确" }, { status: 400 });
    }
    const issue = validatePassword(parsed.data.newPassword);
    if (issue) return NextResponse.json({ error: issue }, { status: 400 });
    data.passwordHash = await hashPassword(parsed.data.newPassword);
  }

  await prisma.user.update({ where: { id: session.id }, data });
  return NextResponse.json({ ok: true });
}
