import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/achievements — 我的成就列表
export async function GET() {
  const session = await getSession();
  const defs = await prisma.achievement.findMany({ orderBy: { order: "asc" } });
  const mine = session
    ? await prisma.userAchievement.findMany({ where: { userId: session.id } })
    : [];
  const unlockedMap = new Map(mine.map((m) => [m.achievementId, m.unlockedAt]));
  return NextResponse.json({
    achievements: defs.map((a) => ({
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id)?.toISOString() ?? null,
    })),
  });
}

export const dynamic = "force-dynamic";
