import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { pct } from "@/lib/utils";
import { computeMasteryScore } from "@/lib/mastery";

// GET /api/analytics?period=7|30|all
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const period = req.nextUrl.searchParams.get("period") ?? "30";
  const days = period === "all" ? null : Number(period) || 30;

  const from = days
    ? new Date(Date.now() - days * 86400000)
    : null;

  const [attempts, sessions, masteryRows, wrongsAll, favoritesCount, user] = await Promise.all([
    prisma.questionAttempt.findMany({
      where: { userId: session.id, ...(from ? { attemptDate: { gte: from } } : {}) },
      orderBy: { attemptDate: "asc" },
      select: { isCorrect: true, attemptDate: true, timeSpentSec: true, question: { select: { difficulty: true, knowledgePointId: true } } },
    }),
    prisma.studySession.findMany({
      where: { userId: session.id, endAt: { not: null }, ...(from ? { startAt: { gte: from } } : {}) },
      select: { durationSec: true, startAt: true },
    }),
    prisma.masteryScore.findMany({
      where: { userId: session.id },
      select: { score: true, knowledgePointId: true, attempts: true, correct: true },
    }),
    prisma.wrongQuestion.findMany({
      where: { userId: session.id },
      select: { firstWrongAt: true, mastered: true, errorCategory: true },
    }),
    prisma.favorite.count({ where: { userId: session.id, targetType: "QUESTION" } }),
    prisma.user.findUnique({ where: { id: session.id }, select: { streakCount: true, totalStudyMinutes: true } }),
  ]);

  const correct = attempts.filter((a) => a.isCorrect).length;
  const wrong = attempts.length - correct;
  const avgTime = attempts.length
    ? Math.round(attempts.reduce((a, x) => a + x.timeSpentSec, 0) / attempts.length)
    : 0;

  // 每日聚合
  const dailyMap = new Map<string, { attempts: number; correct: number; seconds: number }>();
  for (const a of attempts) {
    const key = a.attemptDate.toISOString().slice(0, 10);
    const cur = dailyMap.get(key) ?? { attempts: 0, correct: 0, seconds: 0 };
    cur.attempts += 1;
    cur.correct += a.isCorrect ? 1 : 0;
    cur.seconds += a.timeSpentSec;
    dailyMap.set(key, cur);
  }
  for (const s of sessions) {
    const key = s.startAt.toISOString().slice(0, 10);
    const cur = dailyMap.get(key) ?? { attempts: 0, correct: 0, seconds: 0 };
    cur.seconds += s.durationSec;
    dailyMap.set(key, cur);
  }
  const daily = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      attempts: v.attempts,
      accuracy: v.attempts ? Math.round((v.correct / v.attempts) * 100) : 0,
      seconds: v.seconds,
    }));

  // 掌握度分布
  const masteredKps = masteryRows.filter((m) => m.score >= 80).length;
  const weakKps = masteryRows.filter((m) => m.score < 40).length;
  const developingKps = masteryRows.filter((m) => m.score >= 40 && m.score < 80).length;
  const totalKpsAll = await prisma.knowledgePoint.count();

  // 错题趋势：新增（本周）/ 已掌握 / 仍薄弱
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const newWrongThisWeek = wrongsAll.filter((w) => w.firstWrongAt >= weekAgo).length;
  const masteredWrong = wrongsAll.filter((w) => w.mastered).length;
  const weakWrong = wrongsAll.length - masteredWrong;
  const fixRate = wrongsAll.length ? pct(masteredWrong, wrongsAll.length) : 0;

  // 错误原因分布
  const categoryMap = new Map<string, number>();
  for (const w of wrongsAll) {
    const c = w.errorCategory ?? "OTHER";
    categoryMap.set(c, (categoryMap.get(c) ?? 0) + 1);
  }

  // 科目正确率（该周期内）
  const paperMap = new Map<string, { attempts: number; correct: number; code: string }>();
  const paperRows = await prisma.questionAttempt.findMany({
    where: { userId: session.id, ...(from ? { attemptDate: { gte: from } } : {}) },
    select: { isCorrect: true, question: { select: { paper: { select: { code: true } } } } },
  });
  for (const a of paperRows) {
    const code = a.question.paper.code;
    const cur = paperMap.get(code) ?? { attempts: 0, correct: 0, code };
    cur.attempts += 1;
    cur.correct += a.isCorrect ? 1 : 0;
    paperMap.set(code, cur);
  }
  const paperStats = [...paperMap.values()].map((p) => ({
    code: p.code,
    attempts: p.attempts,
    accuracy: pct(p.correct, p.attempts),
  }));

  // 热力图（90 天）
  const heatMap = new Map<string, number>();
  for (const a of attempts) {
    const key = a.attemptDate.toISOString().slice(0, 10);
    heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
  }
  const heatmap = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(Date.now() - (89 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: heatMap.get(key) ?? 0 };
  });

  return NextResponse.json({
    metrics: {
      attempts: attempts.length,
      correct,
      wrong,
      accuracy: pct(correct, attempts.length),
      avgTimeSec: avgTime,
      studySeconds: attempts.reduce((a, x) => a + x.timeSpentSec, 0) + sessions.reduce((a, s) => a + s.durationSec, 0),
      streak: user?.streakCount ?? 0,
      masteredKps,
      weakKps,
      developingKps,
      totalKps: totalKpsAll,
      wrongActive: weakWrong,
      wrongMastered: masteredWrong,
      fixRate,
      newWrongThisWeek,
      favorites: favoritesCount,
    },
    daily,
    paperStats,
    heatmap,
    categories: [...categoryMap.entries()].map(([k, v]) => ({ category: k, count: v })),
  });
}

export const dynamic = "force-dynamic";
