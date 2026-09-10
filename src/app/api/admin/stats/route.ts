import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdminApi } from "@/lib/auth";

export async function GET() {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const [questions, papers, kpsCount, todayNew, drafts, users, attempts, reports, batches] =
    await Promise.all([
      prisma.question.count(),
      prisma.paper.count(),
      prisma.knowledgePoint.count(),
      prisma.question.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.question.count({ where: { status: { in: ["draft", "ai_reviewed"] } } }),
      prisma.user.count(),
      prisma.questionAttempt.count(),
      prisma.questionReport.count({ where: { status: "OPEN" } }),
      prisma.importBatch.count(),
    ]);
  const [pub, ai, human] = await Promise.all([
    prisma.question.count({ where: { status: "published" } }),
    prisma.question.count({ where: { reviewStatus: "ai_reviewed" } }),
    prisma.question.count({ where: { reviewStatus: "human_reviewed" } }),
  ]);
  return NextResponse.json({
    stats: {
      questions, papers, kpsCount, todayNew, drafts, users, attempts, reports, batches,
      published: pub, aiReviewed: ai, humanReviewed: human,
    },
  });
}

export const dynamic = "force-dynamic";
