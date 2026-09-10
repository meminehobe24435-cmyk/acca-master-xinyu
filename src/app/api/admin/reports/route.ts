import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdminApi } from "@/lib/auth";

export async function GET() {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const reports = await prisma.questionReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      question: { select: { paper: { select: { code: true } }, textMd: true } },
      user: { select: { username: true } },
    },
  });
  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      detail: r.detail,
      createdAt: r.createdAt,
      questionId: r.questionId,
      paperCode: r.question?.paper.code ?? "",
      questionText: r.question?.textMd ?? "",
      username: r.user?.username ?? "游客",
    })),
  });
}

export const dynamic = "force-dynamic";
