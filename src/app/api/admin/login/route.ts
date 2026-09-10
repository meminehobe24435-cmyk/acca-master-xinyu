import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  checkAdminPassword,
  createAdminToken,
  isAdminPasswordConfigured,
} from "@/lib/auth";

// POST /api/admin/login { password }
export async function POST(req: NextRequest) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: "管理后台未启用：请在环境变量 ADMIN_PASSWORD 中设置管理员口令（至少 6 位）" },
      { status: 503 }
    );
  }
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) return NextResponse.json({ error: "请输入管理员口令" }, { status: 400 });

  // 简单节流：连续失败时递增延迟，降低暴力破解效率
  await new Promise((r) => setTimeout(r, 300));

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "口令不正确" }, { status: 401 });
  }

  const token = await createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions);
  return res;
}

// DELETE /api/admin/login — 退出管理后台
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
  return res;
}
