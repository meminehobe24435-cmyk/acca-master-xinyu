import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "acca_session";
export const ADMIN_COOKIE = "acca_admin";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 天
const ADMIN_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 天

/** 单用户模式：默认学习者 */
export const DEFAULT_USER = {
  email: "xinyu@acca-master.local",
  username: "xinyu",
  displayName: "歆瑜",
} as const;

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: string;
  displayName?: string | null;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-only-change-me-please-32-characters-minimum!!";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    username: user.username,
    role: user.role,
    displayName: user.displayName ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: (payload.email as string) ?? "",
      username: (payload.username as string) ?? "",
      role: (payload.role as string) ?? "USER",
      displayName: (payload.displayName as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

// ===== 单用户模式：学习端无需登录 =====

let defaultUserPromise: Promise<SessionUser> | null = null;

/** 确保默认学习者存在（幂等，进程内缓存） */
export async function ensureDefaultUser(): Promise<SessionUser> {
  if (!defaultUserPromise) {
    defaultUserPromise = (async () => {
      const existing = await prisma.user.findUnique({ where: { email: DEFAULT_USER.email } });
      if (existing) {
        return {
          id: existing.id,
          email: existing.email,
          username: existing.username,
          role: existing.role,
          displayName: existing.displayName,
        };
      }
      const created = await prisma.user.create({
        data: {
          email: DEFAULT_USER.email,
          username: DEFAULT_USER.username,
          displayName: DEFAULT_USER.displayName,
          passwordHash: await hashPassword(`local-${Math.random().toString(36).slice(2)}-no-login`),
          role: "USER",
          avatarHue: 265,
        },
      });
      return {
        id: created.id,
        email: created.email,
        username: created.username,
        role: created.role,
        displayName: created.displayName,
      };
    })().catch((e) => {
      defaultUserPromise = null;
      throw e;
    });
  }
  return defaultUserPromise;
}

/** 原始 Cookie 会话（可能为 null） */
export async function getOptionalSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * 学习端的“当前用户”。
 * 单用户模式：永远返回默认学习者（无需登录、无需注册）。
 */
export async function getSession(): Promise<SessionUser> {
  const real = await getOptionalSession();
  if (real) {
    const exists = await prisma.user.findUnique({ where: { id: real.id }, select: { id: true } });
    if (exists) return real;
  }
  return ensureDefaultUser();
}

/** 兼容旧调用 */
export async function requireUser(): Promise<SessionUser> {
  return getSession();
}

// ===== 管理后台独立保护（ADMIN_PASSWORD）=====

export function isAdminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 6);
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ scope: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.scope === "admin" && payload.sub === "admin";
  } catch {
    return false;
  }
}

/** 是否已通过管理员口令验证 */
export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

/** 校验管理员口令（定长比较，降低时序侧信道风险） */
export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || expected.length < 6) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 管理端 API 守卫 */
export async function guardAdminApi(): Promise<
  { ok: true } | { ok: false; status: number; body: { error: string } }
> {
  if (!isAdminPasswordConfigured()) {
    return { ok: false, status: 503, body: { error: "管理后台未启用：请在环境变量中设置 ADMIN_PASSWORD" } };
  }
  if (!(await isAdminAuthed())) {
    return { ok: false, status: 401, body: { error: "需要管理员验证" } };
  }
  return { ok: true };
}

/** 兼容旧 API：管理端路由统一调用（未通过则抛出异常，由路由统一捕获） */
export async function requireAdmin(): Promise<void> {
  const check = await guardAdminApi();
  if (!check.ok) {
    const err = new Error(check.status === 503 ? "ADMIN_DISABLED" : "ADMIN_FORBIDDEN");
    (err as Error & { status?: number }).status = check.status;
    throw err;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  // 生产环境默认 Secure；本地 HTTP 测试/自托管时设 AUTH_INSECURE_COOKIE=1
  secure: process.env.NODE_ENV === "production" && process.env.AUTH_INSECURE_COOKIE !== "1",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SEC,
};

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && process.env.AUTH_INSECURE_COOKIE !== "1",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ADMIN_MAX_AGE_SEC,
};

/** 密码规则（仅供未来多用户扩展使用） */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "密码至少 8 位";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "密码需同时包含字母与数字";
  return null;
}
