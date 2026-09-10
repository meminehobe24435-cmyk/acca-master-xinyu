// ===== 题目数据序列化：前端永不拿到答案（考试/练习模式均由服务端校验） =====
import { prisma } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { CHOICE_LIKE_TYPES, NUMERIC_TYPES } from "@/lib/constants";

export interface PublicQuestion {
  id: string;
  type: string;
  difficulty: number;
  textMd: string;
  marks: number;
  estimatedTimeSec: number;
  options: { key: string; text: string }[];
  meta: {
    paperCode: string;
    paperName: string;
    variant: string | null;
    chapterTitle: string | null;
    topicTitle: string | null;
    knowledgePointTitle: string | null;
    standardReference: string | null;
    taxYear: string | null;
    jurisdiction: string | null;
    sourceType: string;
    sourceName: string | null;
  };
  statuses: {
    favorited: boolean;
    inWrongBook: boolean;
    wrongCount: number;
    masteryScore: number | null;
  };
  answerExtras?: Record<string, unknown>; // 匹配/分类/主观题的展示数据（不含正确答案）
}

export function toPublicQuestion(
  q: {
    id: string; type: string; difficulty: number; textMd: string; marks: number; estimatedTimeSec: number;
    answerJson: string; standardReference: string | null; taxYear: string | null; jurisdiction: string | null;
    sourceType: string; sourceName: string | null;
    options?: { key: string; text: string }[];
    paper: { code: string; name: string };
    variant?: { code: string } | null;
    chapter?: { title: string } | null;
    topic?: { title: string } | null;
    knowledgePoint?: { title: string } | null;
  },
  statuses?: { favorited: boolean; inWrongBook: boolean; wrongCount: number; masteryScore: number | null }
): PublicQuestion {
  const answer = safeJsonParse<Record<string, unknown>>(q.answerJson, {});
  let answerExtras: Record<string, unknown> | undefined;
  if (q.type === "MATCHING") {
    answerExtras = { left: answer?.left ?? [], right: answer?.right ?? [] };
  } else if (q.type === "CLASSIFICATION") {
    answerExtras = { groups: answer?.groups ?? [] };
  } else if (NUMERIC_TYPES.includes(q.type)) {
    answerExtras = { unit: answer?.unit ?? "" };
  }
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    textMd: q.textMd,
    marks: q.marks,
    estimatedTimeSec: q.estimatedTimeSec,
    options: (q.options ?? []).map((o) => ({ key: o.key, text: o.text })),
    meta: {
      paperCode: q.paper.code,
      paperName: q.paper.name,
      variant: q.variant?.code ?? null,
      chapterTitle: q.chapter?.title ?? null,
      topicTitle: q.topic?.title ?? null,
      knowledgePointTitle: q.knowledgePoint?.title ?? null,
      standardReference: q.standardReference,
      taxYear: q.taxYear,
      jurisdiction: q.jurisdiction,
      sourceType: q.sourceType,
      sourceName: q.sourceName,
    },
    statuses: statuses ?? { favorited: false, inWrongBook: false, wrongCount: 0, masteryScore: null },
    answerExtras,
  };
}

export interface AnswerBundle {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  correctAnswer: string;
  explanationMd: string;
  optionsDetail?: { key: string; text: string; isCorrect: boolean; feedbackMd: string | null }[];
  rubric?: { point: string; marks: number; matched: boolean }[];
  modelAnswer?: string;
  keywords?: string[];
}

/** 组装“提交后”答案包 —— 仅提交提交接口返回 */
export function toAnswerBundle(
  q: {
    type: string; marks: number; answerJson: string; explanationMd: string;
    options?: { key: string; text: string; isCorrect: boolean; feedbackMd: string | null }[];
  },
  checkResult: {
    isCorrect: boolean; score: number; maxScore: number; correctAnswer: unknown;
    rubric?: { point: string; marks: number; matched: boolean }[];
  }
): AnswerBundle {
  const answer = safeJsonParse<Record<string, unknown>>(q.answerJson, {});
  let correctAnswer = "";
  if (CHOICE_LIKE_TYPES.includes(q.type)) {
    const keys = Array.isArray(checkResult.correctAnswer)
      ? (checkResult.correctAnswer as string[])
      : ((q.options ?? []).filter((o) => o.isCorrect).map((o) => o.key));
    correctAnswer = keys.join(" / ");
  } else if (NUMERIC_TYPES.includes(q.type)) {
    const a = checkResult.correctAnswer as { value?: string; unit?: string } | null;
    correctAnswer = `${a?.value ?? ""} ${a?.unit ?? ""}`.trim();
  } else if (q.type === "MATCHING") {
    const pairs = (checkResult.correctAnswer as Record<string, string>) ?? {};
    correctAnswer = Object.entries(pairs).map(([k, v]) => `${k} → ${v}`).join("；");
  } else if (q.type === "CLASSIFICATION") {
    const groups = (answer?.groups as { group: string; items: string[] }[]) ?? [];
    correctAnswer = groups.map((g) => `${g.group}: ${g.items.join(", ")}`).join("；");
  } else if (q.type === "MATCHING") {
    correctAnswer = String(checkResult.correctAnswer ?? "");
  } else {
    const a = (checkResult.correctAnswer as { modelAnswer?: string }) ?? {};
    correctAnswer = a.modelAnswer ?? "";
  }
  return {
    isCorrect: checkResult.isCorrect,
    score: checkResult.score,
    maxScore: checkResult.maxScore,
    correctAnswer,
    explanationMd: q.explanationMd,
    optionsDetail: q.options?.map((o) => ({
      key: o.key,
      text: o.text,
      isCorrect: o.isCorrect,
      feedbackMd: o.feedbackMd ?? null,
    })),
    rubric: checkResult.rubric,
    modelAnswer: (answer?.modelAnswer as string | undefined) ?? undefined,
    keywords: (answer?.keywords as string[] | undefined) ?? undefined,
  };
}

/** 为题目附加当前用户状态 */
export async function attachUserStatus(
  userId: string | null,
  questionId: string
): Promise<{ favorited: boolean; inWrongBook: boolean; wrongCount: number; masteryScore: number | null }> {
  if (!userId) return { favorited: false, inWrongBook: false, wrongCount: 0, masteryScore: null };
  const wrapped = (
    await Promise.all([
      prisma.favorite.findUnique({
        where: { userId_targetType_targetId: { userId, targetType: "QUESTION", targetId: questionId } },
      }),
      prisma.wrongQuestion.findUnique({
        where: { userId_questionId: { userId, questionId } },
      }),
    ])
  );
  return {
    favorited: !!wrapped[0],
    inWrongBook: !!wrapped[1] && !wrapped[1]!.mastered,
    wrongCount: wrapped[1]?.wrongCount ?? 0,
    masteryScore: null,
  };
}
