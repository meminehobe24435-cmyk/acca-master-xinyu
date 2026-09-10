import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdminApi } from "@/lib/auth";

// PATCH /api/admin/reports/:id — 处理反馈（RESOLVED / REJECTED）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status === "RESOLVED" ? "RESOLVED" : body.status === "REJECTED" ? "REJECTED" : null;
  if (!status) return NextResponse.json({ error: "参数错误" }, { status: 400 });
  await prisma.questionReport.update({
    where: { id },
    data: { status, resolution: body.resolution ?? null, resolvedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
