import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { guardAdminApi } from "@/lib/auth";
import { aiChat, getAIProvider } from "@/lib/ai/provider";
import { fnv1a, normalizeText } from "@/lib/utils";

const genSchema = z.object({
  paper: z.string().min(1),
  knowledgePointId: z.string().optional(),
  count: z.number().int().min(1).max(50).default(10),
  difficulty: z.number().int().min(1).max(5).default(3),
  type: z.string().default("SINGLE_CHOICE"),
});

// POST /api/admin/generate — AI 批量生成原创练习题（draft 状态，需二次审核）
export async function POST(req: NextRequest) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const provider = getAIProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "AI_NOT_CONFIGURED", message: "AI 功能未配置：请设置 AI_PROVIDER 与 API Key 后再使用批量生成。" },
      { status: 503 }
    );
  }
  const body = await req.json().catch(() => null);
  const parsed = genSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const paper = await prisma.paper.findUnique({ where: { code: String(parsed.data.paper).toUpperCase() } });
  if (!paper) return NextResponse.json({ error: "科目不存在" }, { status: 400 });

  let kp = null;
  if (parsed.data.knowledgePointId) {
    kp = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId } });
  }
  const difficultyLabel = ["基础", "简单", "中等", "困难", "Exam Level"][parsed.data.difficulty - 1];

  const prompt = `你是资深 ACCA 教研专家，请为科目 ${paper.code}（${paper.name}）的以下知识点生成 ${parsed.data.count} 道原创单选题（SINGLE_CHOICE，4 个选项 A-D，仅 1 个正确）。

知识点：${kp?.title ?? "本知识点"}（${kp?.summary ?? ""}）
标准引用：${kp?.standardReference ?? "—"}
难度：${difficultyLabel}
要求：
1. 全部原创，禁止抄袭任何官方/商业题库内容。
2. 输出严格 JSON 数组（不要额外文字），每项：{"textMd":"题干(Markdown,可含$公式$)","options":[{"key":"A","text":"...","isCorrect":true,"feedbackMd":"为什么对"},{"key":"B",...,"isCorrect":false,"feedbackMd":"为什么错"},...],"answerJson":"[\"A\"]","explanationMd":"## 正确答案\\n\\nA\\n\\n## 为什么\\n\\n...\\n\\n## 计算过程\\n\\n...\\n\\n## 对应知识点\\n\\n...\\n\\n## 其他选项分析\\n\\n...\\n\\n## 易错提醒\\n\\n...\\n\\n## 考试技巧\\n\\n..."}
3. 解析 ≥ 250 字；数字题先自行验算并写出完整计算过程。
4. 涉及准则编号（如 IFRS 15）必须与 ${paper.code} syllabus 一致；不确定的内容不要编造。`;

  let raw = "";
  try {
    raw = await aiChat(
      [{ role: "system", content: "你是 ACCA 题目生成器，只输出合法 JSON。" }, { role: "user", content: prompt }],
      { temperature: 0.7, maxTokens: 8000 }
    );
  } catch (e) {
    console.error("generate error", e);
    return NextResponse.json({ error: "AI 调用失败，请检查配置" }, { status: 502 });
  }

  // 提取 JSON
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return NextResponse.json({ error: "AI 返回格式异常，未找到 JSON" }, { status: 502 });
  let items: { textMd: string; options: { key: string; text: string; isCorrect: boolean; feedbackMd?: string }[]; answerJson: string; explanationMd: string }[] = [];
  try {
    items = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "AI 返回 JSON 解析失败，请重试" }, { status: 502 });
  }

  const created: string[] = [];
  for (const item of items.slice(0, parsed.data.count)) {
    if (!item?.textMd || !item?.explanationMd || !item?.answerJson) continue;
    const q = await prisma.question.create({
      data: {
        paperId: paper.id,
        knowledgePointId: kp?.id ?? null,
        topicId: kp?.topicId ?? null,
        type: "SINGLE_CHOICE",
        difficulty: parsed.data.difficulty,
        status: "draft",
        reviewStatus: "draft",
        textMd: item.textMd,
        answerJson: item.answerJson,
        explanationMd: item.explanationMd,
        marks: 2,
        estimatedTimeSec: 120,
        sourceType: "original_ai_generated",
        sourceName: "ACCA Master AI 生成",
        copyrightStatus: "original",
        standardReference: kp?.standardReference ?? null,
        questionHash: `aigen-${fnv1a(normalizeText(`${paper.code}|${item.textMd}`))}-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
        generationModel: provider.name,
        generationDate: new Date(),
        verified: false,
      },
    });
    for (const [i, o] of (item.options ?? []).entries()) {
      await prisma.questionOption.create({
        data: { questionId: q.id, key: String(o.key).toUpperCase(), text: o.text, isCorrect: !!o.isCorrect, feedbackMd: o.feedbackMd ?? null, sortOrder: i },
      });
    }
    created.push(q.id);
  }

  return NextResponse.json({ ok: true, created: created.length, questionIds: created });
}

// POST /api/admin/review — AI 批量审核草稿题目
const reviewSchema = z.object({ ids: z.array(z.string()).min(1).max(50) });

export async function PUT(req: NextRequest) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const provider = getAIProvider();
  if (!provider) {
    return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const questions = await prisma.question.findMany({
    where: { id: { in: parsed.data.ids } },
    include: { options: true },
  });

  const results: { id: string; ok: boolean; issues: string[] }[] = [];
  for (const q of questions) {
    const issues: string[] = [];
    if (q.textMd.length < 15) issues.push("题干过短");
    if (q.explanationMd.length < 80) issues.push("解析过短");
    if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "CASE_MCQ"].includes(q.type)) {
      const correct = q.options.filter((o) => o.isCorrect).length;
      if (q.type === "SINGLE_CHOICE" && correct !== 1) issues.push(`单选题正确选项数 = ${correct}（应为 1）`);
      if (q.options.length < 2) issues.push("选项不足");
    }
    // AI 二次校验摘要
    const aiCheck = await aiChat(
      [
        {
          role: "system",
          content: `你是 ACCA 题目审核员。评估以下题目：题干是否清晰、答案是否唯一、计算是否正确（用 $ 公式验算）、解析是否合理、是否符合所述知识点。只输出 JSON {"ok":true/false,"issues":["..."]}，issues 最多 3 条。`,
        },
        {
          role: "user",
          content: `题目：${q.textMd}\n答案：${q.answerJson}\n选项：${q.options.map((o) => `${o.key}. ${o.text}${o.isCorrect ? " [√]" : ""}`).join("\n")}\n解析：${q.explanationMd}`,
        },
      ],
      { temperature: 0.1, maxTokens: 400 }
    ).catch(() => null);
    if (aiCheck) {
      const mm = aiCheck.match(/\{[\s\S]*\}/);
      if (mm) {
        try {
          const j = JSON.parse(mm[0]) as { ok?: boolean; issues?: string[] };
          if (j.ok === false) issues.push(...(j.issues ?? []).slice(0, 2));
        } catch { /* ignore */ }
      }
    }
    const ok = issues.length === 0;
    await prisma.question.update({
      where: { id: q.id },
      data: { reviewStatus: ok ? "ai_reviewed" : "draft", status: ok ? "ai_reviewed" : "draft" },
    });
    results.push({ id: q.id, ok, issues: issues.slice(0, 3) });
  }
  return NextResponse.json({ ok: true, results });
}

export const dynamic = "force-dynamic";
