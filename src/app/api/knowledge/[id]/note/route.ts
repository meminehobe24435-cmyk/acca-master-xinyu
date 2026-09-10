import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({ contentMd: z.string().max(50000) });

// GET /api/knowledge/:id/note
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ note: null });
  const note = await prisma.note.findUnique({
    where: { userId_targetType_targetId: { userId: session.id, targetType: "KNOWLEDGE_POINT", targetId: id } },
  });
  return NextResponse.json({ note: note?.contentMd ?? null });
}

// POST /api/knowledge/:id/note
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "内容过长" }, { status: 400 });

  if (parsed.data.contentMd.trim().length === 0) {
    await prisma.note.delete({
      where: { userId_targetType_targetId: { userId: session.id, targetType: "KNOWLEDGE_POINT", targetId: id } },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, deleted: true });
  }
  await prisma.note.upsert({
    where: { userId_targetType_targetId: { userId: session.id, targetType: "KNOWLEDGE_POINT", targetId: id } },
    update: { contentMd: parsed.data.contentMd },
    create: { userId: session.id, targetType: "KNOWLEDGE_POINT", targetId: id, contentMd: parsed.data.contentMd },
  });
  return NextResponse.json({ ok: true });
}
