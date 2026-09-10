import { describe, expect, it } from "vitest";
import { checkAnswer, parseNumeric } from "@/lib/questions/check";

describe("checkAnswer - 单选", () => {
  const q = {
    type: "SINGLE_CHOICE",
    marks: 2,
    answerJson: JSON.stringify(["B"]),
    options: [
      { key: "A", text: "x", isCorrect: false },
      { key: "B", text: "y", isCorrect: true },
      { key: "C", text: "z", isCorrect: false },
      { key: "D", text: "w", isCorrect: false },
    ],
  };
  it("答对得满分", () => {
    const r = checkAnswer(q, "B");
    expect(r.isCorrect).toBe(true);
    expect(r.score).toBe(2);
  });
  it("答错不得分", () => {
    const r = checkAnswer(q, "A");
    expect(r.isCorrect).toBe(false);
    expect(r.score).toBe(0);
  });
  it("多选题少选不得分", () => {
    const m = {
      ...q,
      type: "MULTIPLE_CHOICE",
      answerJson: JSON.stringify(["A", "C"]),
      options: [
        { key: "A", text: "x", isCorrect: true },
        { key: "B", text: "y", isCorrect: false },
        { key: "C", text: "z", isCorrect: true },
      ],
    };
    expect(checkAnswer(m, ["A"]).isCorrect).toBe(false);
    expect(checkAnswer(m, ["A", "C"]).isCorrect).toBe(true);
    expect(checkAnswer(m, ["A", "B", "C"]).isCorrect).toBe(false);
  });
});

describe("checkAnswer - 判断", () => {
  const q = { type: "TRUE_FALSE", marks: 1, answerJson: JSON.stringify(["FALSE"]), options: [] };
  it("FALSE 正确", () => expect(checkAnswer(q, "FALSE").isCorrect).toBe(true));
  it("TRUE 错误", () => expect(checkAnswer(q, "TRUE").isCorrect).toBe(false));
});

describe("checkAnswer - 数字填空/计算", () => {
  it("绝对值容差", () => {
    const q = { type: "FILL_NUMERIC", marks: 2, answerJson: JSON.stringify({ value: "12500", tolerance: 5 }), options: [] };
    expect(checkAnswer(q, "12500").isCorrect).toBe(true);
    expect(checkAnswer(q, "12503").isCorrect).toBe(true);
    expect(checkAnswer(q, "12510").isCorrect).toBe(false);
    expect(checkAnswer(q, "12,500").isCorrect).toBe(true);
    expect(checkAnswer(q, "$12,500").isCorrect).toBe(true);
  });
  it("百分比容差（计算题）", () => {
    const q = { type: "CALCULATION", marks: 2, answerJson: JSON.stringify({ value: "1000", tolerancePercent: 1 }), options: [] };
    expect(checkAnswer(q, "1005").isCorrect).toBe(true);
    expect(checkAnswer(q, "1020").isCorrect).toBe(false);
  });
});

describe("checkAnswer - 匹配与分类", () => {
  it("匹配全部正确才对", () => {
    const q = {
      type: "MATCHING",
      marks: 2,
      answerJson: JSON.stringify({ left: ["X", "Y"], right: ["1", "2"], pairs: { X: "1", Y: "2" } }),
      options: [],
    };
    expect(checkAnswer(q, { X: "1", Y: "2" }).isCorrect).toBe(true);
    expect(checkAnswer(q, { X: "2", Y: "1" }).isCorrect).toBe(false);
  });
  it("分类", () => {
    const q = {
      type: "CLASSIFICATION",
      marks: 2,
      answerJson: JSON.stringify({ groups: [{ group: "Operating", items: ["A", "C"] }, { group: "Financing", items: ["B"] }] }),
      options: [],
    };
    expect(checkAnswer(q, { A: "Operating", B: "Financing", C: "Operating" }).isCorrect).toBe(true);
    expect(checkAnswer(q, { A: "Financing", B: "Financing", C: "Operating" }).isCorrect).toBe(false);
  });
});

describe("checkAnswer - 主观题（关键词+rubric）", () => {
  const q = {
    type: "CONSTRUCTED_RESPONSE",
    marks: 3,
    answerJson: JSON.stringify({
      modelAnswer: "答案文本",
      rubric: [
        { point: "说明控制权转移", marks: 2, keywords: ["控制权", "转移"] },
        { point: "提及对价金额", marks: 1, keywords: ["对价"] },
      ],
    }),
    options: [],
  };
  it("命中要点得满分", () => {
    const r = checkAnswer(q, "在控制权转移时确认收入，对价为 100,000。");
    expect(r.autoScore).toBe(3);
    expect(r.rubric?.length).toBe(2);
  });
  it("未命中不得分", () => {
    const r = checkAnswer(q, "不清楚");
    expect(r.autoScore).toBe(0);
  });
});

describe("parseNumeric", () => {
  it("解析各种格式", () => {
    expect(parseNumeric("1,250.50")).toBe(1250.5);
    expect(parseNumeric("$ 12,500")).toBe(12500);
    expect(parseNumeric("-3.5")).toBe(-3.5);
    expect(parseNumeric("abc")).toBeNull();
  });
});
