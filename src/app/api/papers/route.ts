import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PAPER_LEVELS, PAPER_CATEGORIES } from "@/lib/constants";

// GET /api/papers — 科目概览（含用户维度统计可选）
export async function GET() {
  const papers = await prisma.paper.findMany({
    orderBy: { order: "asc" },
    include: {
      variants: { orderBy: { code: "asc" } },
      _count: {
        select: {
          chapters: true,
          questions: { where: { status: "published" } },
        },
      },
    },
  });
  return NextResponse.json({
    papers: papers.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      nameCn: p.nameCn,
      level: p.level,
      levelLabel: PAPER_LEVELS[p.level]?.label,
      category: p.category,
      categoryLabel: p.category ? PAPER_CATEGORIES[p.category]?.label : undefined,
      order: p.order,
      accent: p.accent,
      description: p.description,
      examDurationMin: p.examDurationMin,
      examConfig: p.examConfigJson ? JSON.parse(p.examConfigJson) : null,
      chapterCount: p._count.chapters,
      questionCount: p._count.questions,
      variants: p.variants.map((v) => ({ code: v.code, label: v.label })),
    })),
  });
}

export const dynamic = "force-dynamic";
