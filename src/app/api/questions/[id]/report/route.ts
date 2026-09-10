import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  reason: z.enum(["WRONG_ANSWER", "BAD_QUESTION", "UNCLEAR_EXPLANATION", "OUTDATED", "OTHER"]),
  detail: z.string().max(2000).optional(),
});

// POST /api/questions/:id/report — 报告题目问题
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  await prisma.questionReport.create({
    data: {
      userId: session?.id ?? null,
      questionId: id,
      reason: parsed.data.reason,
      detail: parsed.data.detail ?? null,
    },
  });
  await prisma.question.update({
    where: { id },
    data: { reportCount: { increment: 1 } },
  });
  return NextResponse.json({ ok: true });
}
