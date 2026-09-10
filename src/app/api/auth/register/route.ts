import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  hashPassword,
  validatePassword,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email("邮箱格式不正确"),
  username: z
    .string()
    .min(2, "用户名至少 2 个字符")
    .max(24, "用户名最多 24 个字符")
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名仅支持字母/数字/下划线/中文"),
  password: z.string().min(1, "请输入密码"),
  displayName: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "参数错误" }, { status: 400 });
    }
    const pwIssue = validatePassword(parsed.data.password);
    if (pwIssue) return NextResponse.json({ error: pwIssue }, { status: 400 });

    const { email, username, password } = parsed.data;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    if (existing) {
      const field = existing.email === email ? "邮箱" : "用户名";
      return NextResponse.json({ error: `${field}已被注册` }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName: parsed.data.displayName || username,
        avatarHue: Math.floor(Math.random() * 360),
      },
    });

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    });

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json({ error: "注册失败，请稍后再试" }, { status: 500 });
  }
}
