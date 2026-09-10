import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { aiChat, getAIProvider } from "@/lib/ai/provider";
import { buildTutorSystemPrompt, buildTutorContextBlock } from "@/lib/ai/prompt";

const schema = z.object({
  questionId: z.string().min(1),
  message: z.string().min(1).max(2000),
  mode: z.enum(["direct", "socratic", "exam_tips", "kid", "expert"]).default("direct"),
  userAnswer: z.string().max(4000).optional(),
});

// POST /api/ai/tutor — AI Tutor（未配置 Key 时返回 503，前端显示降级提示）
export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const provider = getAIProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "AI_NOT_CONFIGURED", message: "AI 功能未配置：请在 .env 中设置 AI_PROVIDER 与对应 API Key。" },
      { status: 503 }
    );
  }

  const q = await prisma.question.findUnique({
    where: { id: parsed.data.questionId },
    include: {
      paper: { select: { code: true, name: true } },
      variant: { select: { code: true } },
      chapter: { select: { title: true } },
      topic: { select: { title: true } },
      knowledgePoint: { select: { title: true } },
      options: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!q) return NextResponse.json({ error: "题目不存在" }, { status: 404 });

  const wrongCount = session
    ? await prisma.wrongQuestion.count({
        where: { userId: session.id, questionId: q.id },
      })
    : 0;

  const expected = (() => {
    try {
      return JSON.parse(q.answerJson) as unknown;
    } catch {
      return null;
    }
  })();
  const correctKeys = q.options?.filter((o) => o.isCorrect).map((o) => o.key) ?? [];
  let correctAnswer = "";
  if (Array.isArray(expected)) correctAnswer = expected.join(" / ");
  else if (typeof expected === "string") correctAnswer = expected;
  else if (expected && typeof expected === "object") {
    const e = expected as Record<string, unknown>;
    correctAnswer = e.modelAnswer ? String(e.modelAnswer) : e.value ? `${e.value}` : JSON.stringify(e);
  }
  if (!correctAnswer) correctAnswer = correctKeys.join(" / ");

  const context = buildTutorContextBlock({
    paperCode: q.paper.code,
    paperName: q.paper.name,
    variant: q.variant?.code ?? null,
    chapterTitle: q.chapter?.title ?? null,
    topicTitle: q.topic?.title ?? null,
    knowledgePointTitle: q.knowledgePoint?.title ?? null,
    questionType: q.type,
    difficulty: q.difficulty,
    questionText: q.textMd,
    options: (q.options ?? []).map((o) => ({ key: o.key, text: o.text, isCorrect: o.isCorrect })),
    correctAnswer,
    explanation: q.explanationMd,
    userAnswer: parsed.data.userAnswer ?? "",
    userWrongCount: wrongCount,
    mode: parsed.data.mode,
  });

  // 读取该题历史对话（同一用户同一题，最多 12 条）
  let history: { role: string; content: string }[] = [];
  if (session) {
    const chat = await prisma.aiChat.findFirst({
      where: { userId: session.id, questionId: q.id, mode: "TUTOR" },
      orderBy: { createdAt: "desc" },
    });
    if (chat) history = (JSON.parse(chat.messagesJson) as { role: string; content: string }[]).slice(-12);
  }

  const messages = [
    { role: "system" as const, content: buildTutorSystemPrompt() + "\n\n" + context },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) })),
    { role: "user" as const, content: parsed.data.message },
  ];

  let reply = "";
  try {
    reply = await aiChat(messages, { maxTokens: 1200 });
  } catch (e) {
    console.error("ai tutor error", e);
    return NextResponse.json({ error: "AI 请求失败，请检查 Provider 配置或稍后再试" }, { status: 502 });
  }

  // 保存对话历史
  const newMessages = [...history, { role: "user", content: parsed.data.message }, { role: "assistant", content: reply }].slice(-20);
  if (session) {
    await prisma.aiChat.upsert({
      where: { id: (await prisma.aiChat.findFirst({
        where: { userId: session.id, questionId: q.id, mode: "TUTOR" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      }))?.id ?? "__none__" },
      update: { messagesJson: JSON.stringify(newMessages) },
      create: {
        userId: session.id,
        questionId: q.id,
        mode: "TUTOR",
        messagesJson: JSON.stringify(newMessages),
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ reply, provider: provider.name });
}

export const dynamic = "force-dynamic";
