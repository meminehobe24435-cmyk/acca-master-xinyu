import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  targetDate: z.string().min(1),
  dailyGoal: z.number().int().min(5).max(200).default(30),
  dailyMinutes: z.number().int().min(10).max(600).default(60),
  daysPerWeek: z.number().int().min(1).max(7).default(5),
});

// POST /api/plan — 保存计划并按剩余天数生成每日任务（未来 14 天）
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const targetDate = new Date(parsed.data.targetDate);
  if (targetDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "考试日期必须晚于今天" }, { status: 400 });
  }

  await prisma.studyPlan.upsert({
    where: { userId: session.id },
    update: {
      targetDate,
      dailyGoalQuestions: parsed.data.dailyGoal,
      dailyMinutes: parsed.data.dailyMinutes,
      daysPerWeek: parsed.data.daysPerWeek,
    },
    create: {
      userId: session.id,
      targetDate,
      dailyGoalQuestions: parsed.data.dailyGoal,
      dailyMinutes: parsed.data.dailyMinutes,
      daysPerWeek: parsed.data.daysPerWeek,
    },
  });

  // 按掌握度分布任务：优先薄弱章节（取用户未练习的章节）
  const userQuestions = await prisma.question.findMany({
    where: {
      status: "published",
      knowledgePoint: { masteryScores: { some: { userId: session.id } } },
    },
    select: { chapterId: true },
  });
  const practicedChapterIds = new Set(userQuestions.map((q) => q.chapterId).filter(Boolean) as string[]);

  const chapters = await prisma.chapter.findMany({
    orderBy: [{ paper: { order: "asc" } }, { order: "asc" }],
    include: { paper: { select: { code: true } } },
  });
  const weakChapters = chapters.filter((c) => !practicedChapterIds.has(c.id)).slice(0, 6);
  const fallbackChapters = chapters.filter((c) => practicedChapterIds.has(c.id)).slice(0, 2);
  const queue = [...weakChapters.slice(0, 4), ...fallbackChapters];

  // 生成未来 14 天任务（每周 daysPerWeek 天）
  const tasks: {
    userId: string; date: Date; type: string; title: string; paperCode: string | null;
    referenceId: string | null; targetCount: number; source: string;
  }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    if (tasks.length >= 30) break;
    const date = new Date(today.getTime() + dayOffset * 86400000);
    const dow = date.getDay() === 0 ? 7 : date.getDay();
    if (dow > parsed.data.daysPerWeek) continue;

    const ch = queue[Math.floor(tasks.length / Math.max(1, parsed.data.daysPerWeek * 2)) % Math.max(1, queue.length)];
    if (ch) {
      tasks.push({
        userId: session.id,
        date,
        type: "CHAPTER_QUESTIONS",
        title: `${ch.paper.code} · ${ch.title} 章节练习`,
        paperCode: ch.paper.code,
        referenceId: ch.id,
        targetCount: parsed.data.dailyGoal,
        source: "PLAN",
      });
    } else {
      tasks.push({
        userId: session.id,
        date,
        type: "MISTAKE_REVIEW",
        title: "错题复习（间隔重复）",
        paperCode: null,
        referenceId: null,
        targetCount: 10,
        source: "AUTO",
      });
    }
  }

  // 清除旧计划任务，写入新任务
  await prisma.dailyTask.deleteMany({ where: { userId: session.id, source: "PLAN" } });
  for (const t of tasks) {
    await prisma.dailyTask.create({ data: t });
  }

  // 更新用户考试日期
  await prisma.user.update({
    where: { id: session.id },
    data: { examDate: targetDate, dailyGoal: parsed.data.dailyGoal, weeklyDays: parsed.data.daysPerWeek },
  });

  return NextResponse.json({ ok: true, taskCount: tasks.length, daysLeft: Math.ceil((targetDate.getTime() - Date.now()) / 86400000) });
}

// GET /api/plan — 查看计划
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const plan = await prisma.studyPlan.findUnique({ where: { userId: session.id } });
  const tasks = await prisma.dailyTask.findMany({
    where: { userId: session.id },
    orderBy: { date: "asc" },
    take: 30,
  });
  return NextResponse.json({
    plan: plan
      ? {
          targetDate: plan.targetDate,
          dailyGoal: plan.dailyGoalQuestions,
          dailyMinutes: plan.dailyMinutes,
          daysPerWeek: plan.daysPerWeek,
        }
      : null,
    tasks: tasks.map((t) => ({
      id: t.id,
      date: t.date,
      type: t.type,
      title: t.title,
      paperCode: t.paperCode,
      referenceId: t.referenceId,
      targetCount: t.targetCount,
      doneCount: t.doneCount,
      source: t.source,
      completed: t.completed,
    })),
  });
}

export const dynamic = "force-dynamic";
