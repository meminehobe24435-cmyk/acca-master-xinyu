import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/mock/papers — 各科目模拟考试配置与可用题数
export async function GET() {
  const papers = await prisma.paper.findMany({
    orderBy: { order: "asc" },
    include: {
      variants: true,
      _count: { select: { questions: { where: { status: "published" } } } },
    },
  });
  return NextResponse.json({
    papers: papers.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      nameCn: p.nameCn,
      level: p.level,
      examDurationMin: p.examDurationMin,
      passMark: p.passMark,
      examConfig: p.examConfigJson ? JSON.parse(p.examConfigJson) : null,
      questionCount: p._count.questions,
      variants: p.variants.map((v) => ({ id: v.id, code: v.code, label: v.label })),
    })),
  });
}

export const dynamic = "force-dynamic";
