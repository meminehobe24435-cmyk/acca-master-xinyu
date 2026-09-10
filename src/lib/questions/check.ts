// ===== 答案校验引擎（服务端权威校验） =====
import { CHOICE_LIKE_TYPES, NUMERIC_TYPES, SUBJECTIVE_TYPES } from "@/lib/constants";
import { safeJsonParse } from "@/lib/utils";

export interface OptionLike {
  key: string;
  text: string;
  isCorrect: boolean;
}

export interface CheckResult {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  correctAnswer: unknown;
  /** 主观题自动评分明细 */
  rubric?: { point: string; marks: number; matched: boolean }[];
  /** 主观题关键词自动评分 */
  autoScore?: number;
  autoScoreMax?: number;
  /** 主观题：分数由用户自评决定 */
  selfGraded?: boolean;
}

export interface QuestionLike {
  type: string;
  marks: number;
  answerJson: string;
  options?: OptionLike[];
}

function expectChoiceAnswer(user: unknown): string[] {
  if (typeof user === "string") return [user];
  if (Array.isArray(user)) return user.map((x) => String(x)).filter(Boolean);
  return [];
}

/** 解析规范答案 JSON，容错：choice 类型直接存 ["B"] */
function parseExpected(question: QuestionLike): unknown {
  return safeJsonParse(question.answerJson, null);
}

export function checkAnswer(question: QuestionLike, userAnswer: unknown): CheckResult {
  const maxScore = question.marks || 1;

  // ---- 选择题类 ----
  if (CHOICE_LIKE_TYPES.includes(question.type)) {
    const expected = parseExpected(question);
    const expectedKeys = Array.isArray(expected)
      ? expected.map(String)
      : (question.options ?? []).filter((o) => o.isCorrect).map((o) => o.key);
    const userKeys = expectChoiceAnswer(userAnswer);
    const sameSet =
      userKeys.length === expectedKeys.length &&
      expectedKeys.every((k) => userKeys.includes(k));
    return {
      isCorrect: sameSet,
      score: sameSet ? maxScore : 0,
      maxScore,
      correctAnswer: expectedKeys,
    };
  }

  // ---- 数字/计算题 ----
  if (NUMERIC_TYPES.includes(question.type)) {
    const expected = parseExpected(question) as { value?: string | number; tolerance?: number | string; tolerancePercent?: number | string; unit?: string } | null;
    const userNum = parseNumeric(userAnswer);
    const ansNum = parseNumeric(expected?.value ?? 0);
    let ok = false;
    if (userNum !== null && ansNum !== null) {
      const rawTol = expected?.tolerance !== undefined && expected?.tolerance !== null ? Number(expected.tolerance) : NaN;
      const tolPercent = Number(expected?.tolerancePercent);
      const tol = Number.isNaN(tolPercent)
        ? Number.isNaN(rawTol)
          ? Math.max(0.5, Math.abs(ansNum) * 0.01)
          : rawTol
        : Math.abs(ansNum) * (tolPercent / 100);
      ok = Math.abs(userNum - ansNum) <= tol;
    }
    return {
      isCorrect: ok,
      score: ok ? maxScore : 0,
      maxScore,
      correctAnswer: { value: expected?.value ?? "", unit: expected?.unit ?? "" },
    };
  }

  // ---- 匹配题 ----
  if (question.type === "MATCHING") {
    const expected = parseExpected(question) as { pairs?: Record<string, string> } | null;
    const exp = expected?.pairs ?? {};
    const user = (userAnswer as Record<string, string>) ?? {};
    const leftKeys = Object.keys(exp);
    const ok = leftKeys.length > 0 && leftKeys.every((k) => String(user[k] ?? "") === String(exp[k]));
    return { isCorrect: ok, score: ok ? maxScore : 0, maxScore, correctAnswer: exp };
  }

  // ---- 分类题 ----
  if (question.type === "CLASSIFICATION") {
    const expected = parseExpected(question) as { groups?: { group: string; items: string[] }[] } | null;
    const exp: Record<string, string> = {};
    for (const g of expected?.groups ?? []) for (const item of g.items) exp[item] = g.group;
    const user = (userAnswer as Record<string, string>) ?? {};
    const keys = Object.keys(exp);
    const ok = keys.length > 0 && keys.every((k) => String(user[k] ?? "") === String(exp[k]));
    return { isCorrect: ok, score: ok ? maxScore : 0, maxScore, correctAnswer: exp };
  }

  // ---- 主观题类：关键词自动评分 + 自评 ----
  if (SUBJECTIVE_TYPES.includes(question.type)) {
    const expected = parseExpected(question) as
      | { modelAnswer?: string; rubric?: { point: string; marks: number; keywords?: string[] }[]; keywords?: string[] }
      | null;
    const text = String(userAnswer ?? "").toLowerCase();
    const rubric = (expected?.rubric ?? []).map((r) => {
      const kws = (r.keywords ?? []).map((k) => k.toLowerCase()).filter(Boolean);
      const matched = kws.length > 0 ? kws.every((k) => text.includes(k)) : text.includes(String(r.point).toLowerCase());
      return { point: r.point, marks: Number(r.marks ?? 1), matched };
    });
    const autoScore = rubric.reduce((acc, r) => acc + (r.matched ? r.marks : 0), 0);
    const autoScoreMax = rubric.reduce((acc, r) => acc + r.marks, 0) || 1;
    return {
      isCorrect: autoScore >= autoScoreMax * 0.8,
      score: autoScore,
      maxScore: autoScoreMax,
      correctAnswer: { modelAnswer: expected?.modelAnswer ?? "", keywords: expected?.keywords ?? [] },
      rubric,
      autoScore,
      autoScoreMax,
      selfGraded: true,
    };
  }

  return { isCorrect: false, score: 0, maxScore, correctAnswer: null };
}

/** 宽松数字解析：支持 "1,250"、"$1,250"、"1250.5"、"12,500.00" */
export function parseNumeric(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, "").replace(/\.(?=\d{3}\b)/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
