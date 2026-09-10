import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  verifyPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "请输入邮箱与密码" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "登录失败，请稍后再试" }, { status: 500 });
  }
}
