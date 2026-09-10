import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { guardAdminApi } from "@/lib/auth";
import { fnv1a, normalizeText } from "@/lib/utils";

// GET /api/admin/questions?status=&paper=&q=&page= — 全量题目管理列表
export async function GET(req: NextRequest) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const pageSize = 25;
  const status = sp.get("status") ?? "";
  const paper = sp.get("paper") ?? "";
  const q = sp.get("q") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (paper) where.paperId = paper;
  if (q) where.textMd = { contains: q };

  const [total, rows] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      include: {
        paper: { select: { code: true } },
        knowledgePoint: { select: { title: true } },
        _count: { select: { attempts: true, reports: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return NextResponse.json({
    total,
    page,
    questions: rows.map((r) => ({
      id: r.id,
      paperCode: r.paper.code,
      type: r.type,
      difficulty: r.difficulty,
      status: r.status,
      reviewStatus: r.reviewStatus,
      sourceType: r.sourceType,
      marks: r.marks,
      attemptCount: r._count.attempts,
      reportCount: r._count.reports,
      kpTitle: r.knowledgePoint?.title ?? "",
      textMd: r.textMd,
      updatedAt: r.updatedAt,
    })),
  });
}

const createSchema = z.object({
  paper: z.string().min(1),
  variant: z.string().optional(),
  chapter: z.string().optional(),
  topic: z.string().optional(),
  kp: z.string().optional(),
  type: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  textMd: z.string().min(1),
  options: z.array(z.object({ key: z.string(), text: z.string(), isCorrect: z.boolean(), feedbackMd: z.string().optional() })).optional(),
  answerJson: z.string().min(1),
  explanationMd: z.string().min(1),
  marks: z.number().default(1),
  estimatedTimeSec: z.number().default(120),
  standardReference: z.string().optional(),
  taxYear: z.string().optional(),
  jurisdiction: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

// POST /api/admin/questions — 手动创建
export async function POST(req: NextRequest) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "参数错误" }, { status: 400 });
  }
  const d = parsed.data;
  const paper = await prisma.paper.findUnique({ where: { code: String(d.paper).toUpperCase() } });
  if (!paper) return NextResponse.json({ error: "科目不存在" }, { status: 400 });

  const q = await prisma.question.create({
    data: {
      paperId: paper.id,
      chapterId: d.chapter || null,
      topicId: d.topic || null,
      knowledgePointId: d.kp || null,
      type: d.type,
      difficulty: d.difficulty,
      status: d.status,
      reviewStatus: d.status === "published" ? "human_reviewed" : "draft",
      textMd: d.textMd,
      answerJson: d.answerJson,
      explanationMd: d.explanationMd,
      marks: d.marks,
      estimatedTimeSec: d.estimatedTimeSec,
      sourceType: "manual_created",
      sourceName: "管理员手动创建",
      copyrightStatus: "original",
      standardReference: d.standardReference ?? null,
      taxYear: d.taxYear ?? null,
      jurisdiction: d.jurisdiction ?? null,
      questionHash: `manual-${fnv1a(normalizeText(`${paper.code}|${d.textMd}`))}-${Date.now().toString(36)}`,
    },
  });
  for (const [i, o] of (d.options ?? []).entries()) {
    await prisma.questionOption.create({
      data: { questionId: q.id, key: o.key.toUpperCase(), text: o.text, isCorrect: o.isCorrect, feedbackMd: o.feedbackMd ?? null, sortOrder: i },
    });
  }
  return NextResponse.json({ ok: true, id: q.id });
}

export const dynamic = "force-dynamic";
