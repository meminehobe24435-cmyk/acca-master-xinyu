import { describe, expect, it } from "vitest";
import { computeMasteryScore, computeExamReadiness } from "@/lib/mastery";
import { applyReview, dueWrongQuestions } from "@/lib/srs";

describe("mastery score", () => {
  it("无记录为 0", () => {
    expect(computeMasteryScore([])).toBe(0);
  });
  it("全对得分高", () => {
    const attempts = Array.from({ length: 10 }, (_, i) => ({
      isCorrect: true,
      difficulty: 3,
      timeSpentSec: 60,
      daysAgo: i,
    }));
    const s = computeMasteryScore(attempts);
    expect(s).toBeGreaterThanOrEqual(80);
  });
  it("全错得分低", () => {
    const attempts = Array.from({ length: 10 }, (_, i) => ({
      isCorrect: false,
      difficulty: 3,
      timeSpentSec: 120,
      daysAgo: i,
    }));
    const s = computeMasteryScore(attempts);
    expect(s).toBeLessThanOrEqual(39);
  });
  it("范围 0-100", () => {
    const s = computeMasteryScore([
      { isCorrect: true, difficulty: 5, timeSpentSec: 10, daysAgo: 0 },
      { isCorrect: false, difficulty: 1, timeSpentSec: 999, daysAgo: 1 },
    ]);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("exam readiness", () => {
  it("完美准备", () => {
    const s = computeExamReadiness({ coverage: 1, accuracy: 1, examAccuracy: 1, mockAvg: 90, recency: 1 });
    expect(s).toBeGreaterThanOrEqual(90);
  });
  it("零准备", () => {
    const s = computeExamReadiness({ coverage: 0, accuracy: 0, examAccuracy: null, mockAvg: null, recency: 0 });
    expect(s).toBeLessThanOrEqual(20);
  });
});

describe("间隔重复 SRS", () => {
  it("答错回阶段 0", () => {
    const n = applyReview({ stage: 3, mastered: true, nextReviewAt: new Date(), wrongCount: 5 }, false, 1);
    expect(n.stage).toBe(0);
    expect(n.mastered).toBe(false);
    expect(n.wrongCount).toBe(6);
  });
  it("答对升阶段并在阶段 5 掌握", () => {
    let s = { stage: 0, mastered: false, nextReviewAt: new Date(), wrongCount: 0 };
    for (let i = 0; i < 6; i++) s = applyReview(s, true, 0);
    expect(s.stage).toBe(5);
    expect(s.mastered).toBe(true);
  });
  it("到期统计", () => {
    const now = new Date();
    const items = [
      { nextReviewAt: new Date(now.getTime() - 1000), mastered: false },
      { nextReviewAt: new Date(now.getTime() + 86400000), mastered: false },
      { nextReviewAt: new Date(now.getTime() - 5000), mastered: true },
    ];
    const r = dueWrongQuestions(items);
    expect(r.total).toBe(2);
    expect(r.due).toBe(1);
    expect(r.today).toBe(2);
  });
});
