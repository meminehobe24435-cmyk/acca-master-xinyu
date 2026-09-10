import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/papers/:code/tree — 科目知识树（章节→Topic→知识点，含题数与掌握度可选）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const paper = await prisma.paper.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      variants: true,
      chapters: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { questions: { where: { status: "published" } } } },
          topics: {
            orderBy: { order: "asc" },
            include: {
              _count: { select: { questions: { where: { status: "published" } } } },
              knowledgePoints: {
                orderBy: { order: "asc" },
                select: { id: true, title: true, summary: true, standardReference: true, examFrequency: true },
              },
            },
          },
        },
      },
    },
  });
  if (!paper) return NextResponse.json({ error: "科目不存在" }, { status: 404 });
  return NextResponse.json({
    paper: {
      id: paper.id,
      code: paper.code,
      name: paper.name,
      nameCn: paper.nameCn,
      level: paper.level,
      category: paper.category,
      accent: paper.accent,
      description: paper.description,
      examDurationMin: paper.examDurationMin,
      examConfig: paper.examConfigJson ? JSON.parse(paper.examConfigJson) : null,
      variants: paper.variants.map((v) => ({ id: v.id, code: v.code, label: v.label })),
      questionCount: (await prisma.question.count({ where: { paperId: paper.id, status: "published" } })),
    },
    chapters: paper.chapters.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      questionCount: c._count.questions,
      topics: c.topics.map((t) => ({
        id: t.id,
        title: t.title,
        questionCount: t._count.questions,
        knowledgePoints: t.knowledgePoints.map((k) => ({
          id: k.id,
          title: k.title,
          summary: k.summary,
          standardReference: k.standardReference,
          examFrequency: k.examFrequency,
        })),
      })),
    })),
  });
}

export const dynamic = "force-dynamic";
