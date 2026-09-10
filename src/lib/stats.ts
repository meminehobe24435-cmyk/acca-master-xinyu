// ===== 服务端统计辅助（Dashboard / 科目页 / Analytics 共用） =====
import { prisma } from "@/lib/db";
import { computeMasteryScore, computeExamReadiness } from "@/lib/mastery";
import { pct } from "@/lib/utils";

export interface PaperStats {
  totalQuestions: number;
  attempted: number;
  correct: number;
  attempts: number;
  accuracy: number; // 0-100
  wrongCount: number;
  favoriteCount: number;
  studySeconds: number;
  masteryAvg: number; // 0-100
  coverage: number; // 0-100 已练习知识点占比
  examReadiness: number;
  kpCount: number;
}

export async function getUserPaperStats(userId: string | null, paperId: string): Promise<PaperStats> {
  if (!userId) {
    const totalQuestions = await prisma.question.count({ where: { paperId, status: "published" } });
    const kpCount = await prisma.knowledgePoint.count({ where: { topic: { chapter: { paperId } } } });
    return {
      totalQuestions, attempted: 0, correct: 0, attempts: 0, accuracy: 0, wrongCount: 0,
      favoriteCount: 0, studySeconds: 0, masteryAvg: 0, coverage: 0, examReadiness: 0, kpCount,
    };
  }

  const paperQuestionIds = (
    await prisma.question.findMany({ where: { paperId }, select: { id: true } })
  ).map((q) => q.id);

  const [totalQuestions, kpCount, attempts, wrongs, favs, masteryRows, sessions, mocks] =
    await Promise.all([
      prisma.question.count({ where: { paperId, status: "published" } }),
      prisma.knowledgePoint.count({ where: { topic: { chapter: { paperId } } } }),
      prisma.questionAttempt.findMany({
        where: { userId, question: { paperId } },
        distinct: ["attemptDate"],
        select: { questionId: true, isCorrect: true, attemptDate: true, timeSpentSec: true },
      }),
      prisma.wrongQuestion.count({ where: { userId, mastered: false, question: { paperId } } }),
      prisma.favorite.count({
        where: { userId, targetType: "QUESTION", targetId: { in: paperQuestionIds } },
      }),
      prisma.masteryScore.findMany({
        where: { userId, knowledgePoint: { topic: { chapter: { paperId } } } },
        select: { score: true, knowledgePointId: true },
      }),
      prisma.studySession.findMany({
        where: { userId },
        select: { durationSec: true },
      }),
      prisma.mockExamAttempt.findMany({
        where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, mockExam: { paperId } },
        select: { score: true },
      }),
    ]);

  const correct = attempts.filter((a) => a.isCorrect).length;
  const accuracy = pct(correct, attempts.length);
  const masteryAvg = masteryRows.length
    ? Math.round(masteryRows.reduce((a, m) => a + m.score, 0) / masteryRows.length)
    : 0;
  const coverage = kpCount ? Math.round((masteryRows.length / kpCount) * 100) : 0;

  // 考试准备度
  const paperAttemptsAll = await prisma.questionAttempt.findMany({
    where: { userId, question: { paperId } },
    select: { isCorrect: true, attemptDate: true, question: { select: { difficulty: true } } },
  });
  const recent7 = paperAttemptsAll.filter(
    (a) => Date.now() - a.attemptDate.getTime() < 7 * 86400000
  ).length;
  const hard = paperAttemptsAll.filter((a) => a.question.difficulty >= 4);
  const hardAcc = hard.length
    ? hard.filter((a) => a.isCorrect).length / hard.length
    : null;
  const mockAvg = mocks.length
    ? mocks.reduce((a, m) => a + (m.score ?? 0), 0) / mocks.length
    : null;
  const examReadiness = computeExamReadiness({
    coverage: coverage / 100,
    accuracy: accuracy / 100,
    examAccuracy: hardAcc,
    mockAvg,
    recency: Math.min(1, recent7 / 10),
  });

  return {
    totalQuestions,
    attempted: attempts.length,
    correct,
    attempts: attempts.length,
    accuracy,
    wrongCount: wrongs,
    favoriteCount: favs,
    studySeconds: sessions.reduce((a, s) => a + s.durationSec, 0),
    masteryAvg,
    coverage,
    examReadiness,
    kpCount,
  };
}

export interface DashboardData {
  today: { attempts: number; correct: number; accuracy: number; seconds: number; goal: number };
  streak: number;
  last7: { attempts: number; correct: number; seconds: number; date: string }[];
  currentPaper: { id: string; code: string; name: string; accent: string | null; stats: PaperStats } | null;
  topKps: { id: string; title: string; score: number; paperCode: string; standardReference: string | null }[];
  weakKps: { id: string; title: string; score: number; paperCode: string }[];
  dueWrong: { total: number; due: number; today: number };
  suggestions: { kpTitle: string; paperCode: string; reason: string; questionCount: number }[];
  readiness: { code: string; name: string; score: number }[];
  heatmap: { date: string; count: number }[];
  questionsTotal: number;
  achieved: number;
  allAchievements: number;
  todayTasks: { id: string; title: string; type: string; targetCount: number; doneCount: number; completed: boolean }[];
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [attempts, sessions, streakUser, wrongs, mastery, tasks, achievements, achAll, totals] =
    await Promise.all([
      prisma.questionAttempt.findMany({
        where: { userId },
        orderBy: { attemptDate: "desc" },
        take: 400,
        select: {
          isCorrect: true,
          attemptDate: true,
          timeSpentSec: true,
          question: { select: { paperId: true, difficulty: true } },
        },
      }),
      prisma.studySession.findMany({
        where: { userId, endAt: { not: null } },
        select: { durationSec: true, startAt: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { streakCount: true, dailyGoal: true },
      }),
      prisma.wrongQuestion.findMany({
        where: { userId, mastered: false },
        orderBy: { nextReviewAt: "asc" },
        select: {
          nextReviewAt: true,
          question: { select: { paper: { select: { id: true } } } },
        },
      }),
      prisma.masteryScore.findMany({
        where: { userId },
        orderBy: { score: "asc" },
        include: {
          knowledgePoint: {
            select: {
              id: true,
              title: true,
              standardReference: true,
              topic: {
                select: {
                  chapter: {
                    select: {
                      paper: { select: { code: true, name: true, id: true, accent: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.dailyTask.findMany({
        where: { userId, date: { gte: dayStart, lt: new Date(dayStart.getTime() + 86400000) } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
      prisma.achievement.count(),
      prisma.question.count({ where: { status: "published" } }),
    ]);

  const todayAttempts = attempts.filter((a) => a.attemptDate.getTime() >= dayStart.getTime());
  const todayCorrect = todayAttempts.filter((a) => a.isCorrect).length;
  const todaySeconds =
    todayAttempts.reduce((a, x) => a + x.timeSpentSec, 0) +
    sessions.filter((s) => s.startAt.getTime() >= dayStart.getTime()).reduce((a, s) => a + s.durationSec, 0);

  // 每日热力图（12 周）
  const heatmap: { date: string; count: number }[] = [];
  const heatMap = new Map<string, number>();
  for (const a of attempts) {
    const key = a.attemptDate.toISOString().slice(0, 10);
    heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
  }
  for (let i = 83; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    heatmap.push({ date: key, count: heatMap.get(key) ?? 0 });
  }

  // 近 7 天
  const last7: DashboardData["last7"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStart = new Date(d);
    dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(dStart.getTime() + 86400000);
    const day = attempts.filter(
      (a) => a.attemptDate.getTime() >= dStart.getTime() && a.attemptDate.getTime() < dEnd.getTime()
    );
    last7.push({
      date: d.toISOString().slice(0, 10),
      attempts: day.length,
      correct: day.filter((a) => a.isCorrect).length,
      seconds: day.reduce((a, x) => a + x.timeSpentSec, 0),
    });
  }

  // 当前学习科目（最近 200 次最高频）
  const paperFreq = new Map<string, number>();
  for (const a of attempts.slice(0, 200)) {
    paperFreq.set(a.question.paperId, (paperFreq.get(a.question.paperId) ?? 0) + 1);
  }
  const topPaperId = [...paperFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  let currentPaper: DashboardData["currentPaper"] = null;
  if (topPaperId) {
    const paper = await prisma.paper.findUnique({ where: { id: topPaperId } });
    if (paper) {
      const stats = await getUserPaperStats(userId, paper.id);
      currentPaper = { id: paper.id, code: paper.code, name: paper.name, accent: paper.accent, stats };
    }
  }

  // 知识点：weak = 最薄弱 5 个；top = 熟练 top 5
  const kpsAll = mastery
    .map((m) => ({
      id: m.knowledgePoint.id,
      title: m.knowledgePoint.title,
      score: m.score,
      paperCode: m.knowledgePoint.topic.chapter.paper.code,
      standardReference: m.knowledgePoint.standardReference,
    }))
    .filter((k) => k.score > 0);
  const weakKps = [...kpsAll].sort((a, b) => a.score - b.score).slice(0, 5);
  const topKps = [...kpsAll].sort((a, b) => b.score - a.score).slice(0, 5);

  // 建议：基于薄弱知识点关联题目数 + 到期错题
  const suggestions: DashboardData["suggestions"] = [];
  for (const k of weakKps.slice(0, 4)) {
    const count = await prisma.question.count({
      where: { status: "published", knowledgePoint: { id: k.id } },
    });
    if (count > 0) {
      suggestions.push({
        kpTitle: k.title,
        paperCode: k.paperCode,
        reason: "掌握度薄弱（" + k.score + "/100）",
        questionCount: count,
      });
    }
  }
  const due = wrongs.filter((w) => w.nextReviewAt.getTime() <= Date.now()).length;
  const todayDue = wrongs.filter(
    (w) => w.nextReviewAt.getTime() <= Date.now() + 86400000
  ).length;

  // 考试准备度（科目级）
  const readiness = await Promise.all(
    [...paperFreq.keys()].slice(0, 4).map(async (pid) => {
      const paper = await prisma.paper.findUnique({
        where: { id: pid },
        select: { code: true, name: true },
      });
      const stats = await getUserPaperStats(userId, pid);
      return { code: paper?.code ?? "", name: paper?.name ?? "", score: stats.examReadiness };
    })
  );

  return {
    today: {
      attempts: todayAttempts.length,
      correct: todayCorrect,
      accuracy: pct(todayCorrect, todayAttempts.length),
      seconds: todaySeconds,
      goal: streakUser?.dailyGoal ?? 30,
    },
    streak: streakUser?.streakCount ?? 0,
    last7,
    currentPaper,
    topKps,
    weakKps,
    dueWrong: { total: wrongs.length, due, today: todayDue },
    suggestions,
    readiness: readiness.filter((r) => r.score > 0),
    heatmap,
    questionsTotal: totals,
    achieved: achievements.length,
    allAchievements: achAll,
    todayTasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      targetCount: t.targetCount,
      doneCount: t.doneCount,
      completed: t.completed,
    })),
  };
}
