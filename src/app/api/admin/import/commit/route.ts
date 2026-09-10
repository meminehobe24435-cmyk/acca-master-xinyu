import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdminApi } from "@/lib/auth";
import { fnv1a, normalizeText } from "@/lib/utils";

// PUT /api/admin/import/commit { fileName, format, rows } — 将 OK 行写入题库（draft 状态）
export async function PUT(req: NextRequest) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json().catch(() => null);
  if (!body?.rows) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const rows = body.rows as { data: Record<string, unknown>; status?: string }[];
  let okCount = 0;
  let errorCount = 0;
  const createdIds: string[] = [];

  for (const r of rows) {
    if (r.status && r.status !== "OK") {
      if (r.status === "ERROR") errorCount++;
      continue;
    }
    const d = r.data;
    const paper = await prisma.paper.findUnique({ where: { code: String(d.paper ?? "").toUpperCase() } });
    if (!paper) { errorCount++; continue; }

    const typeMap: Record<string, string> = {
      SINGLE_CHOICE: "SINGLE_CHOICE", MULTIPLE_CHOICE: "MULTIPLE_CHOICE", TRUE_FALSE: "TRUE_FALSE",
      FILL_NUMERIC: "FILL_NUMERIC", CALCULATION: "CALCULATION", MATCHING: "MATCHING",
      CLASSIFICATION: "CLASSIFICATION", CASE_MCQ: "CASE_MCQ", CONSTRUCTED_RESPONSE: "CONSTRUCTED_RESPONSE",
      ESSAY: "ESSAY", ACCOUNTING_ENTRY: "ACCOUNTING_ENTRY", FINANCIAL_STATEMENT: "FINANCIAL_STATEMENT",
    };
    const type = typeMap[String(d.type ?? "")] ?? "SINGLE_CHOICE";

    let answerJson = "";
    if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "CASE_MCQ"].includes(type)) {
      answerJson = JSON.stringify(String(d.answer ?? "").toUpperCase().split(/[\s,;|]+/).filter(Boolean));
    } else if (["FILL_NUMERIC", "CALCULATION"].includes(type)) {
      answerJson = JSON.stringify({ value: String(d.answer ?? ""), tolerancePercent: 1 });
    } else if (type === "MATCHING") {
      answerJson = JSON.stringify({ left: [], right: [], pairs: {} });
    } else {
      answerJson = JSON.stringify({
        modelAnswer: `**参考要点：**\n\n${String(d.answer ?? "")}\n\n**评分要点：**\n${String(d.explanation ?? "")}`,
        rubric: [
          { point: "关键概念正确", marks: 1, keywords: [] },
          { point: "计算/逻辑正确", marks: 1, keywords: [] },
        ],
        keywords: [],
      });
    }

    try {
      const q = await prisma.question.create({
        data: {
          paperId: paper.id,
          type,
          difficulty: Number(d.difficulty) || 3,
          status: "draft",
          reviewStatus: "draft",
          textMd: String(d.question ?? ""),
          answerJson,
          explanationMd: String(d.explanation ?? "（待补充解析）"),
          marks: Number(d.marks) || 1,
          estimatedTimeSec: 120,
          sourceType: "user_imported",
          sourceName: String(d.source ?? "") || "用户导入",
          sourceUrl: String(d.source_url ?? "") || null,
          copyrightStatus: "user_owned",
          taxYear: String(d.tax_year ?? "") || null,
          jurisdiction: String(d.jurisdiction ?? "") || null,
          standardReference: String(d.standard_reference ?? "") || null,
          questionHash: `import-${fnv1a(normalizeText(`${paper.code}|${String(d.question ?? "")}`))}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
          verified: false,
        },
      });
      createdIds.push(q.id);
      okCount++;

      // 选项
      const optRows = ["option_a", "option_b", "option_c", "option_d", "option_e"];
      const optionTexts = optRows.map((k) => String(d[k] ?? "")).filter((t) => t.length > 0);
      const correctKeys = String(d.answer ?? "").toUpperCase().split(/[\s,;|]+/).filter(Boolean);
      for (const [i, t] of optionTexts.entries()) {
        const key = String.fromCharCode(65 + i);
        await prisma.questionOption.create({
          data: {
            questionId: q.id,
            key,
            text: t,
            isCorrect: correctKeys.includes(key),
            sortOrder: i,
          },
        });
      }
    } catch (e) {
      console.error("import create error", e);
      errorCount++;
    }
  }

  await prisma.importBatch.create({
    data: {
      fileName: String(body.fileName ?? ""),
      format: String(body.format ?? ""),
      totalCount: rows.length,
      okCount,
      warningCount: 0,
      errorCount,
      rowsJson: JSON.stringify(rows.slice(0, 100).map((r) => ({ row: (r as { row?: number }).row, status: r.status }))),
      questionIdsJson: JSON.stringify(createdIds),
    },
  });

  return NextResponse.json({ ok: true, created: okCount, failed: errorCount, questionIds: createdIds });
}

export const dynamic = "force-dynamic";
