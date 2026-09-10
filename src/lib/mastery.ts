// ===== 掌握度 (Mastery Score) 算法 =====
// 参考维度：正确率 + 最近表现(时间衰减) + 题目难度 + 重复次数 + 答题时间
// 输出 0~100；分类：0-39 薄弱 | 40-59 待加强 | 60-79 掌握 | 80-100 熟练

export interface MasteryAttempt {
  isCorrect: boolean;
  difficulty: number; // 1..5
  timeSpentSec: number;
  daysAgo: number; // 距今天数（0 = 今天）
  score?: number; // 得分（主观题）
  maxScore?: number;
}

export function computeMasteryScore(attempts: MasteryAttempt[]): number {
  if (attempts.length === 0) return 0;
  const recent = attempts.slice(-20);
  const n = recent.length;

  let weightedCorrect = 0;
  let weightSum = 0;
  let diffSum = 0;
  let timePenalty = 0;

  recent.forEach((a, idx) => {
    // 时间衰减权重：每次做题间隔越久权重越低；近 14 天指数衰减
    const recency = Math.pow(0.5, Math.min(a.daysAgo, 30) / 7);
    // 做题顺序权重：越近的题权重越高
    const order = Math.pow(0.85, n - 1 - idx);
    const w = recency * order + 0.05;
    weightSum += w;
    if (a.isCorrect) weightedCorrect += w;
    diffSum += a.difficulty;
    // 时间惩罚：超过预估时间 2.5 倍的题轻微扣分
    if (a.timeSpentSec > 0) {
      const est = 90 + a.difficulty * 45; // 预估秒数（无题级预估时的估计）
      if (a.timeSpentSec > est * 2.5) timePenalty += 0.05 * w;
    }
  });

  const accuracy = weightedCorrect / weightSum; // 0..1
  const avgDifficulty = diffSum / n; // 1..5
  const difficultyBoost = (avgDifficulty - 1) / 4; // 0..1
  const attemptsBoost = Math.min(1, n / 10); // 重复次数

  const score =
    100 * (0.62 * accuracy + 0.12 * difficultyBoost + 0.14 * attemptsBoost + 0.12) -
    timePenalty * 100 * 0.3;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/** 考试准备度 Exam Readiness：大纲覆盖 + 正确率 + Exam Level 表现 + 模拟考 + 近期表现 */
export function computeExamReadiness(input: {
  coverage: number; // 0..1 已练习知识点占比
  accuracy: number; // 0..1 全部正确率
  examAccuracy: number | null; // 0..1 难度4-5正确率
  mockAvg: number | null; // 0..100 模拟考平均分
  recency: number; // 0..1 近7天活跃度
}): number {
  const { coverage, accuracy, examAccuracy, mockAvg, recency } = input;
  const base =
    0.30 * coverage * 100 +
    0.30 * accuracy * 100 +
    0.20 * (examAccuracy !== null ? examAccuracy * 100 : accuracy * 100) +
    0.15 * (mockAvg !== null ? mockAvg : 0) +
    0.05 * recency * 100;
  return Math.round(Math.min(100, Math.max(0, base)));
}
