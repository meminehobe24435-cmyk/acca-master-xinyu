import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toPublicQuestion } from "@/lib/serializers";

const PAGE_SIZE = 20;

// GET /api/questions?paper=FR&chapter=&topic=&kp=&difficulty=&type=&status=&done=&wrong=&favorite=&source=&variant=&page=1&q=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const session = await getSession();
  const userId = session?.id ?? null;

  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const paper = sp.get("paper");
  const chapter = sp.get("chapter");
  const topic = sp.get("topic");
  const kp = sp.get("kp");
  const difficulty = sp.get("difficulty");
  const type = sp.get("type");
  const status = sp.get("status") ?? "published";
  const done = sp.get("done"); // true | false
  const wrong = sp.get("wrong");
  const favorite = sp.get("favorite");
  const source = sp.get("source");
  const variant = sp.get("variant");
  const q = sp.get("q");
  const sort = sp.get("sort") ?? "new";

  const where: Record<string, unknown> = {};
  if (paper) {
    // 支持科目 ID 或代码（FR / PM …）
    const paperRow = /^[a-zA-Z]{2,5}$/.test(paper)
      ? await prisma.paper.findUnique({ where: { code: paper.toUpperCase() }, select: { id: true } })
      : await prisma.paper.findUnique({ where: { id: paper }, select: { id: true } });
    if (!paperRow) return NextResponse.json({ total: 0, page: 1, pageSize: PAGE_SIZE, questions: [] });
    where.paperId = paperRow.id;
  }
  if (chapter) where.chapterId = chapter;
  if (topic) where.topicId = topic;
  if (kp) where.knowledgePointId = kp;
  if (difficulty) where.difficulty = Number(difficulty);
  if (type) where.type = type;
  if (status) where.status = status;
  if (source) where.sourceType = source;
  if (variant) where.variant = { code: variant };
  if (q) where.textMd = { contains: q };

  // 用户相关过滤
  if (userId && (done || wrong || favorite)) {
    const attemptQids = await prisma.questionAttempt.findMany({
      where: { userId },
      distinct: ["questionId"],
      select: { questionId: true },
    });
    const attemptedIds = attemptQids.map((a) => a.questionId);
    if (done === "true") where.id = { in: attemptedIds };
    if (done === "false") where.id = { notIn: attemptedIds };

    if (wrong === "true") {
      const wrongRows = await prisma.wrongQuestion.findMany({
        where: { userId, mastered: false },
        select: { questionId: true },
      });
      where.id = { ...(where.id as object ?? {}), in: wrongRows.map((w) => w.questionId) };
    }
    if (favorite === "true") {
      const favs = await prisma.favorite.findMany({
        where: { userId, targetType: "QUESTION" },
        select: { targetId: true },
      });
      where.id = { ...(where.id as object ?? {}), in: favs.map((f) => f.targetId) };
    }
  }

  const [total, questions] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      include: {
        paper: { select: { code: true, name: true } },
        variant: { select: { code: true } },
        chapter: { select: { title: true } },
        topic: { select: { title: true } },
        knowledgePoint: { select: { title: true } },
        options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: sort === "random" ? undefined : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const list = questions.map((x) => toPublicQuestion(x));
  return NextResponse.json({ total, page, pageSize: PAGE_SIZE, questions: list });
}

export const dynamic = "force-dynamic";
