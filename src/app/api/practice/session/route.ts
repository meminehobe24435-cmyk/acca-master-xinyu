import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/practice/session?mode=&paper=&chapter=&topic=&kp=&count=&review=1
// 返回题目 id 列表（练习会话由客户端按顺序取题）
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const session = await getSession();
  const userId = session?.id ?? null;
  const mode = sp.get("mode") ?? "smart";
  const paper = sp.get("paper");
  const chapter = sp.get("chapter");
  const topic = sp.get("topic");
  const kp = sp.get("kp");
  const count = Math.min(100, Math.max(1, Number(sp.get("count") ?? 20)));

  const baseWhere: Record<string, unknown> = { status: "published" };
  if (paper) baseWhere.paperId = paper;
  if (chapter) baseWhere.chapterId = chapter;
  if (topic) {
    baseWhere.topicId = topic;
  } else if (kp) {
    baseWhere.knowledgePointId = kp;
  }

  const all = await prisma.question.findMany({
    where: baseWhere,
    select: {
      id: true,
      difficulty: true,
      knowledgePointId: true,
      attemptCount: true,
    },
  });

  let pool = all;
  let order: string[] = [];

  // 用户偏好加权（登录用户）
  let userPrefs: { kpWeak: Map<string, number>; wrongIds: string[]; lastAttempts: Map<string, string> } = {
    kpWeak: new Map(),
    wrongIds: [],
    lastAttempts: new Map(),
  };
  if (userId) {
    const [mastery, wrongs, recent] = await Promise.all([
      prisma.masteryScore.findMany({ where: { userId }, select: { knowledgePointId: true, score: true } }),
      prisma.wrongQuestion.findMany({
        where: { userId, mastered: false },
        select: { questionId: true, nextReviewAt: true },
      }),
      prisma.questionAttempt.findMany({
        where: { userId },
        orderBy: { attemptDate: "desc" },
        take: 500,
        select: { questionId: true, attemptDate: true },
      }),
    ]);
    userPrefs = {
      kpWeak: new Map(mastery.map((m) => [m.knowledgePointId, m.score])),
      wrongIds: wrongs.map((w) => w.questionId),
      lastAttempts: new Map(recent.map((r) => [r.questionId, r.attemptDate.toString()])),
    };
  }

  if (mode === "mistakes") {
    if (!userId) return NextResponse.json({ questionIds: [], message: "请先登录" });
    const wrongIds = userPrefs.wrongIds;
    pool = all.filter((q) => wrongIds.includes(q.id));
  } else if (mode === "favorites") {
    if (!userId) return NextResponse.json({ questionIds: [], message: "请先登录" });
    const favs = await prisma.favorite.findMany({
      where: { userId, targetType: "QUESTION" },
      select: { targetId: true },
    });
    const favIds = new Set(favs.map((f) => f.targetId));
    pool = all.filter((q) => favIds.has(q.id));
  } else if (mode === "random") {
    pool = all;
  }

  // 典型混合算法：错题 ~35% + 薄弱知识点 ~35% + 随机 ~30%
  let ids: string[] = [];
  if (mode === "smart") {
    const scoreOf = (q: (typeof all)[number]) => {
      const weak = q.knowledgePointId ? (userPrefs.kpWeak.get(q.knowledgePointId) ?? null) : null;
      let score = 0;
      if (userPrefs.wrongIds.includes(q.id)) score += 28;
      if (weak !== null) score += (100 - weak) * 0.3;
      const last = userPrefs.lastAttempts.get(q.id);
      if (last) {
        const days = (Date.now() - new Date(last).getTime()) / 86400000;
        if (days > 14) score += 12;
      } else if (userId) {
        score += 6; // 未做过
      }
      // 高频（attemptCount 高的题）加分
      score += Math.min(10, q.attemptCount * 0.1);
      // 随机扰动
      score += Math.random() * 6;
      return score;
    };
    ids = [...pool]
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .slice(0, Math.min(count, pool.length))
      .map((q) => q.id);
    // 轻度乱序（保留前 30% 权重排序）
    const head = ids.slice(0, Math.ceil(ids.length * 0.3));
    const tail = ids.slice(Math.ceil(ids.length * 0.3)).sort(() => Math.random() - 0.5);
    order = [...head, ...tail];
  } else {
    order = pool.map((q) => q.id).sort(() => Math.random() - 0.5).slice(0, count);
  }

  return NextResponse.json({ questionIds: order, total: order.length });
}

export const dynamic = "force-dynamic";
