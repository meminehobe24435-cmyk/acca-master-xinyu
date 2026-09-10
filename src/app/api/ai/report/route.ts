import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { aiChat, getAIProvider } from "@/lib/ai/provider";
import { pct } from "@/lib/utils";

// POST /api/ai/report { period } — 生成本周学习报告
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  if (!getAIProvider()) {
    return NextResponse.json(
      { error: "AI_NOT_CONFIGURED", message: "AI 功能未配置：请在 .env 中设置 AI_PROVIDER 与对应 API Key。" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const period = body.period ?? "7";
  const days = period === "all" ? null : Math.max(1, Number(period) || 7);
  const from = days ? new Date(Date.now() - days * 86400000) : null;

  const [attempts, wrongsPrev, wrongsNow, masteryRows] = await Promise.all([
    prisma.questionAttempt.findMany({
      where: { userId: session.id, ...(from ? { attemptDate: { gte: from } } : {}) },
      select: {
        isCorrect: true,
        attemptDate: true,
        question: {
          select: {
            difficulty: true,
            knowledgePointId: true,
            paper: { select: { code: true, name: true } },
          },
        },
      },
    }),
    prisma.wrongQuestion.count({
      where: { userId: session.id, firstWrongAt: { lt: from ?? new Date(0) }, mastered: false },
    }),
    prisma.wrongQuestion.count({ where: { userId: session.id, mastered: false } }),
    prisma.masteryScore.findMany({
      where: { userId: session.id },
      select: {
        score: true,
        knowledgePoint: {
          select: {
            title: true,
            topic: {
              select: {
                chapter: {
                  select: {
                    paper: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  // 按科目聚合：正确率与最新掌握度
  const paperAgg = new Map<string, { attempts: number; correct: number; name: string; mastery: number[] }>();
  for (const a of attempts) {
    const code = a.question.paper.code;
    const cur = paperAgg.get(code) ?? { attempts: 0, correct: 0, name: a.question.paper.name, mastery: [] };
    cur.attempts += 1;
    cur.correct += a.isCorrect ? 1 : 0;
    paperAgg.set(code, cur);
  }
  for (const mrow of masteryRows) {
    const code = mrow.knowledgePoint.topic.chapter.paper.code;
    const cur = paperAgg.get(code);
    if (cur) cur.mastery.push(mrow.score);
  }

  const paperLines = [...paperAgg.entries()].map(([code, v]) => ({
    code,
    name: v.name,
    accuracy: pct(v.correct, v.attempts),
    mastery: v.mastery.length ? Math.round(v.mastery.reduce((a, b) => a + b, 0) / v.mastery.length) : null,
  }));

  const weak = [...masteryRows].sort((a, b) => a.score - b.score).slice(0, 5);
  const strong = [...masteryRows].sort((a, b) => b.score - a.score).slice(0, 3);

  const ctx = `你是一位 ACCA 学习顾问。基于以下真实学习数据，为学员生成一份简洁的中文学习周报（300 字以内，用 Markdown 列表，禁止预测"通过概率"，只谈可执行建议）。

## 数据
- 周期：近 ${days ?? "全部"} 天
- 完成题目：${attempts.length} 题，正确 ${attempts.filter((a) => a.isCorrect).length} 题（正确率 ${pct(attempts.filter((a) => a.isCorrect).length, attempts.length)}%）
- 科目表现：${paperLines.map((p) => `${p.code} ${p.accuracy}%${p.mastery !== null ? `（掌握度 ${p.mastery}）` : ""}`).join("；") || "无"}
- 薄弱知识点 Top5：${weak.map((w) => `${w.knowledgePoint.topic.chapter.paper.code} ${w.knowledgePoint.title} (${w.score})`).join("；") || "无"}
- 优势知识点 Top3：${strong.map((w) => `${w.knowledgePoint.topic.chapter.paper.code} ${w.knowledgePoint.title} (${w.score})`).join("；") || "无"}
- 待复习错题：${wrongsNow}（周期开始时未掌握：${wrongsPrev}）
- 要求：输出「本周概览 / 最大进步 / 当前薄弱 / 下周建议」四个小节；建议要具体到知识点与题量。`;

  try {
    const reply = await aiChat(
      [
        { role: "system", content: ctx },
        { role: "user", content: "请生成本周期学习报告。" },
      ],
      { maxTokens: 900, temperature: 0.4 }
    );
    await prisma.aiChat.create({
      data: {
        userId: session.id,
        mode: "REPORT",
        title: `学习报告 ${days ?? "全部"}`,
        messagesJson: JSON.stringify([{ role: "user", content: ctx }, { role: "assistant", content: reply }]),
      },
    });
    return NextResponse.json({ report: reply });
  } catch (e) {
    console.error("ai report error", e);
    return NextResponse.json({ error: "报告生成失败，请稍后再试" }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
