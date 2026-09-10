import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdminApi } from "@/lib/auth";

// GET /api/admin/questions/:id — 编辑回填
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { id } = await params;
  const q = await prisma.question.findUnique({
    where: { id },
    include: { options: { orderBy: { sortOrder: "asc" } }, paper: { select: { code: true } } },
  });
  if (!q) return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  return NextResponse.json({
    id: q.id,
    paperCode: q.paper.code,
    type: q.type,
    difficulty: q.difficulty,
    status: q.status,
    textMd: q.textMd,
    answerJson: q.answerJson,
    explanationMd: q.explanationMd,
    marks: q.marks,
    standardReference: q.standardReference,
    options: q.options.map((o) => ({ key: o.key, text: o.text, isCorrect: o.isCorrect, feedbackMd: o.feedbackMd ?? "" })),
  });
}

// PATCH /api/admin/questions/:id — 编辑 / 删除 / 状态变更
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const allowed = ["textMd", "answerJson", "explanationMd", "difficulty", "type", "marks", "status", "reviewStatus", "standardReference", "taxYear", "jurisdiction", "knowledgePointId", "chapterId", "topicId", "variantId"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) data[k] = body[k];
  }
  await prisma.question.update({ where: { id }, data }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { id } = await params;
  await prisma.question.delete({ where: { id } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

// POST /api/admin/questions/:id — options 全量替换
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.options) return NextResponse.json({ error: "参数错误" }, { status: 400 });
  await prisma.questionOption.deleteMany({ where: { questionId: id } });
  for (const [i, o] of (body.options as { key: string; text: string; isCorrect: boolean; feedbackMd?: string }[]).entries()) {
    await prisma.questionOption.create({
      data: { questionId: id, key: String(o.key).toUpperCase(), text: o.text, isCorrect: !!o.isCorrect, feedbackMd: o.feedbackMd ?? null, sortOrder: i },
    });
  }
  return NextResponse.json({ ok: true });
}
