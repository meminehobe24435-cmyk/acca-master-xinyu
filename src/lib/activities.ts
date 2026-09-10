// ===== 答题记录中枢：一次作答后联动更新 统计/掌握度/错题本/连续天数/成就 =====
import { prisma } from "@/lib/db";
import { computeMasteryScore } from "@/lib/mastery";
import { applyReview } from "@/lib/srs";
import { ACHIEVEMENT_DEFS } from "@/lib/constants";

export interface RecordAttemptInput {
  userId: string | null;
  questionId: string;
  questionKpId: string | null;
  questionDifficulty: number;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  answerJson: string;
  timeSpentSec: number;
  mode: string;
  attemptDate?: Date;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isYesterday(prev: Date, now: Date): boolean {
  return startOfDay(new Date(now.getTime() - 24 * 3600 * 1000)).getTime() === startOfDay(prev).getTime();
}

/** 记录一次答题并联动更新；返回新解锁的成就 code 列表 */
export async function recordAttempt(input: RecordAttemptInput): Promise<string[]> {
  const now = input.attemptDate ?? new Date();
  const created = await prisma.questionAttempt.create({
    data: {
      userId: input.userId,
      questionId: input.questionId,
      mode: input.mode,
      answerJson: input.answerJson,
      isCorrect: input.isCorrect,
      score: input.score,
      timeSpentSec: input.timeSpentSec,
      attemptDate: now,
    },
  });

  // 题目统计
  await prisma.question.update({
    where: { id: input.questionId },
    data: {
      attemptCount: { increment: 1 },
      correctCount: { increment: input.isCorrect ? 1 : 0 },
      qualityScore: undefined,
    },
  });

  if (!input.userId) return [];

  const unlocked: string[] = [];

  // ---- 连续学习天数 ----
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (user) {
    let streak = user.streakCount;
    const last = user.lastStudyDate;
    if (!last || !isSameDay(last, now)) {
      streak = last && isYesterday(last, now) ? streak + 1 : 1;
      await prisma.user.update({
        where: { id: input.userId },
        data: { streakCount: streak, lastStudyDate: now },
      });
    }
  }

  // ---- 掌握度（知识点级） ----
  if (input.questionKpId) {
    const recentAttempts = await prisma.questionAttempt.findMany({
      where: { userId: input.userId, question: { knowledgePointId: input.questionKpId } },
      orderBy: { attemptDate: "desc" },
      take: 20,
      include: { question: { select: { difficulty: true } } },
    });
    const normalized = recentAttempts.map((a) => ({
      isCorrect: a.isCorrect ?? false,
      difficulty: a.question.difficulty,
      timeSpentSec: a.timeSpentSec,
      daysAgo: Math.floor((Date.now() - a.attemptDate.getTime()) / 86400000),
    }));
    const score = computeMasteryScore(normalized);
    const cur = await prisma.masteryScore.findUnique({
      where: { userId_knowledgePointId: { userId: input.userId, knowledgePointId: input.questionKpId } },
    });
    const correct = (cur?.correct ?? 0) + (input.isCorrect ? 1 : 0);
    const attempts = (cur?.attempts ?? 0) + 1;
    await prisma.masteryScore.upsert({
      where: { userId_knowledgePointId: { userId: input.userId, knowledgePointId: input.questionKpId } },
      update: { score, attempts, correct, lastCorrect: input.isCorrect, lastAttemptAt: now },
      create: {
        userId: input.userId,
        knowledgePointId: input.questionKpId,
        score,
        attempts,
        correct,
        lastCorrect: input.isCorrect,
        lastAttemptAt: now,
      },
    });
  }

  // ---- 错题本（间隔重复） ----
  const wrong = await prisma.wrongQuestion.findUnique({
    where: { userId_questionId: { userId: input.userId, questionId: input.questionId } },
  });
  if (!input.isCorrect) {
    if (wrong) {
      await prisma.wrongQuestion.update({
        where: { id: wrong.id },
        data: {
          lastWrongAt: now,
          wrongCount: { increment: 1 },
          stage: 0,
          mastered: false,
          nextReviewAt: now,
          lastAnswerJson: input.answerJson,
        },
      });
    } else {
      await prisma.wrongQuestion.create({
        data: {
          userId: input.userId,
          questionId: input.questionId,
          firstWrongAt: now,
          lastWrongAt: now,
          wrongCount: 1,
          stage: 0,
          nextReviewAt: now,
          lastAnswerJson: input.answerJson,
          mastered: false,
        },
      });
    }
  } else if (wrong && !wrong.mastered) {
    const next = applyReview(
      { stage: wrong.stage, mastered: wrong.mastered, nextReviewAt: wrong.nextReviewAt, wrongCount: wrong.wrongCount },
      true,
      0
    );
    await prisma.wrongQuestion.update({
      where: { id: wrong.id },
      data: { stage: next.stage, mastered: next.mastered, nextReviewAt: next.nextReviewAt },
    });
  }

  // ---- 成就 ----
  unlocked.push(...(await checkAchievements(input.userId)));

  return unlocked;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

const achievementCache = new Map<string, { at: number; unlocked: string[] }>();

/** 幂等成就检查（30s 缓存避免每答一题全量统计） */
async function checkAchievements(userId: string): Promise<string[]> {
  const cached = achievementCache.get(userId);
  if (cached && Date.now() - cached.at < 30000) return cached.unlocked;

  const [questionCount, correctCount, streakCtx, masteredCount, mockCount, avgMock] =
    await Promise.all([
      prisma.questionAttempt.count({ where: { userId } }),
      prisma.questionAttempt.count({ where: { userId, isCorrect: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { streakCount: true } }),
      prisma.masteryScore.count({ where: { userId, score: { gte: 80 } } }),
      prisma.mockExamAttempt.count({ where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } }),
      prisma.mockExamAttempt.aggregate({
        where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
        _avg: { score: true },
      }),
    ]);

  const accuracy = correctCount / Math.max(1, questionCount);
  const streak = streakCtx?.streakCount ?? 0;

  const unlocked: string[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    switch (def.code) {
      case "first_question":
        if (questionCount >= 1) unlocked.push(def.code);
        break;
      case "questions_100":
        if (questionCount >= 100) unlocked.push(def.code);
        break;
      case "questions_500":
        if (questionCount >= 500) unlocked.push(def.code);
        break;
      case "questions_1000":
        if (questionCount >= 1000) unlocked.push(def.code);
        break;
      case "streak_3":
        if (streak >= 3) unlocked.push(def.code);
        break;
      case "streak_7":
        if (streak >= 7) unlocked.push(def.code);
        break;
      case "streak_30":
        if (streak >= 30) unlocked.push(def.code);
        break;
      case "accuracy_90_50":
        if (questionCount >= 50 && accuracy >= 0.9) unlocked.push(def.code);
        break;
      case "mastery_10":
        if (masteredCount >= 10) unlocked.push(def.code);
        break;
      case "mastery_50":
        if (masteredCount >= 50) unlocked.push(def.code);
        break;
      case "first_mock":
        if (mockCount >= 1) unlocked.push(def.code);
        break;
      case "mock_70":
        if ((avgMock._avg.score ?? 0) >= 70) unlocked.push(def.code);
        break;
    }
  }

  if (unlocked.length > 0) {
    for (const code of unlocked) {
      const def = ACHIEVEMENT_DEFS.find((d) => d.code === code);
      const ach = def
        ? await prisma.achievement.findUnique({ where: { code } })
        : null;
      if (ach) {
        await prisma.userAchievement
          .upsert({
            where: { userId_achievementId: { userId, achievementId: ach.id } },
            update: {},
            create: { userId, achievementId: ach.id },
          })
          .catch(() => undefined);
      }
    }
  }

  const result = unlocked.filter((c) => {
    const def = ACHIEVEMENT_DEFS.find((d) => d.code === c);
    return def !== undefined;
  });
  achievementCache.set(userId, { at: Date.now(), unlocked: result });
  return result;
}
