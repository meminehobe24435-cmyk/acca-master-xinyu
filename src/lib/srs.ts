// ===== 错题间隔重复（Spaced Repetition）=====
import { SRS_STAGES } from "@/lib/constants";

export interface SrsState {
  stage: number; // 0..5
  mastered: boolean;
  nextReviewAt: Date;
  wrongCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 记录一次复习：正确 → 升阶段；错误 → 回阶段 0 */
export function applyReview(current: SrsState, isCorrect: boolean, wrongCountDelta = 0): SrsState {
  let stage = current.stage;
  let mastered = current.mastered;
  if (isCorrect) {
    stage = Math.min(stage + 1, 5);
    if (stage >= 5) mastered = true;
  } else {
    stage = 0;
    mastered = false;
  }
  const interval = SRS_STAGES[stage] ?? 7;
  return {
    stage,
    mastered,
    nextReviewAt: new Date(Date.now() + interval * DAY_MS),
    wrongCount: current.wrongCount + wrongCountDelta,
  };
}

export function dueWrongQuestions(
  items: { nextReviewAt: Date; mastered: boolean }[]
): { total: number; due: number; today: number } {
  const now = new Date();
  const todayEnd = new Date(now.getTime() + 1 * DAY_MS);
  const active = items.filter((i) => !i.mastered);
  return {
    total: active.length,
    due: active.filter((i) => i.nextReviewAt.getTime() <= now.getTime()).length,
    today: active.filter((i) => i.nextReviewAt.getTime() <= todayEnd.getTime()).length,
  };
}

/** 简单随机抽样（可选），用于智能刷题 */
export function sampleDue(
  items: { id: string; nextReviewAt: Date }[],
  limit: number
): string[] {
  const now = Date.now();
  const sorted = [...items]
    .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime())
    .map((i) => i.id);
  return sorted.slice(0, limit);
}
