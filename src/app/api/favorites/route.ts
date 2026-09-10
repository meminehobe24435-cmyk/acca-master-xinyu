import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/favorites?type=questions|knowledge|notes
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type") ?? "questions";

  if (type === "knowledge") {
    const favs = await prisma.favorite.findMany({
      where: { userId: session.id, targetType: "KNOWLEDGE_POINT" },
      orderBy: { createdAt: "desc" },
      include: {
        collection: true,
      },
    });
    const kps = await prisma.knowledgePoint.findMany({
      where: { id: { in: favs.map((f) => f.targetId) } },
      include: { topic: { include: { chapter: { include: { paper: { select: { code: true, name: true } } } } } } },
    });
    return NextResponse.json({
      favorites: favs.map((f) => {
        const kp = kps.find((k) => k.id === f.targetId);
        return {
          id: f.id,
          targetId: f.targetId,
          createdAt: f.createdAt,
          kpTitle: kp?.title ?? "已删除",
          paperCode: kp?.topic.chapter.paper.code ?? "",
          summary: kp?.summary ?? null,
        };
      }),
    });
  }

  if (type === "notes") {
    const notes = await prisma.note.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    const ids = notes.map((n) => n.targetId);
    const questions = await prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true, textMd: true, paper: { select: { code: true } }, knowledgePoint: { select: { title: true } } } });
    const kps = await prisma.knowledgePoint.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, topic: { select: { chapter: { select: { paper: { select: { code: true } } } } } } } });
    return NextResponse.json({
      notes: notes.map((n) => {
        const q = questions.find((x) => x.id === n.targetId);
        const k = kps.find((x) => x.id === n.targetId);
        return {
          id: n.id,
          targetType: n.targetType,
          targetId: n.targetId,
          contentMd: n.contentMd,
          updatedAt: n.updatedAt,
          title: q ? `题目 · ${q.paper.code}` : k ? `知识点 · ${k.topic.chapter.paper.code}` : "未知目标",
          preview: q ? q.textMd : (k?.title ?? ""),
        };
      }),
    });
  }

  // questions（默认）
  const favs = await prisma.favorite.findMany({
    where: { userId: session.id, targetType: "QUESTION" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const questions = await prisma.question.findMany({
    where: { id: { in: favs.map((f) => f.targetId) }, status: "published" },
    include: {
      paper: { select: { code: true } },
      knowledgePoint: { select: { title: true } },
      options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  return NextResponse.json({
    favorites: favs
      .map((f) => {
        const q = questions.find((x) => x.id === f.targetId);
        if (!q) return null;
        return {
          id: f.id,
          targetId: f.targetId,
          createdAt: f.createdAt,
          paperCode: q.paper.code,
          textMd: q.textMd,
          difficulty: q.difficulty,
          kpTitle: q.knowledgePoint?.title ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  });
}

export const dynamic = "force-dynamic";
