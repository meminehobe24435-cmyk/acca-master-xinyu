import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/export?type=mistakes|favorites|notes — 导出 CSV
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type") ?? "mistakes";

  let csv = "";
  let filename = "export.csv";

  if (type === "mistakes") {
    const wrongs = await prisma.wrongQuestion.findMany({
      where: { userId: session.id },
      include: { question: { include: { paper: { select: { code: true } } } } },
      orderBy: { lastWrongAt: "desc" },
    });
    filename = "mistakes.csv";
    csv = [
      "paper,question_text,wrong_times,stage,next_review_at,mastered,error_category",
      ...wrongs.map((w) =>
        [
          w.question.paper.code,
          csvEscape(w.question.textMd),
          w.wrongCount,
          w.stage,
          w.nextReviewAt.toISOString(),
          w.mastered ? "1" : "0",
          w.errorCategory ?? "",
        ].join(",")
      ),
    ].join("\n");
  } else if (type === "favorites") {
    const favs = await prisma.favorite.findMany({
      where: { userId: session.id, targetType: "QUESTION" },
      orderBy: { createdAt: "desc" },
    });
    const qids = favs.map((f) => f.targetId);
    const qs = await prisma.question.findMany({
      where: { id: { in: qids } },
      select: { id: true, textMd: true, paper: { select: { code: true } } },
    });
    const qMap = new Map(qs.map((q) => [q.id, q]));
    filename = "favorites.csv";
    csv = [
      "paper,question_text,favorited_at",
      ...favs.map((f) =>
        [qMap.get(f.targetId)?.paper.code ?? "", csvEscape(qMap.get(f.targetId)?.textMd ?? ""), f.createdAt.toISOString()].join(",")
      ),
    ].join("\n");
  } else if (type === "notes") {
    const notes = await prisma.note.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
    });
    filename = "notes.csv";
    csv = [
      "target_type,target_id,content_md,updated_at",
      ...notes.map((n) =>
        [n.targetType, n.targetId, csvEscape(n.contentMd), n.updatedAt.toISOString()].join(",")
      ),
    ].join("\n");
  } else if (type === "attempts") {
    const attempts = await prisma.questionAttempt.findMany({
      where: { userId: session.id },
      include: { question: { include: { paper: { select: { code: true } } } } },
      orderBy: { attemptDate: "desc" },
      take: 5000,
    });
    filename = "study-records.csv";
    csv = [
      "paper,question_id,is_correct,score,time_spent_sec,attempted_at",
      ...attempts.map((a) =>
        [
          a.question?.paper?.code ?? "",
          a.questionId,
          a.isCorrect === null ? "" : a.isCorrect ? "1" : "0",
          a.score ?? "",
          a.timeSpentSec,
          a.attemptDate.toISOString(),
        ].join(",")
      ),
    ].join("\n");
  }

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvEscape(s: string): string {
  const v = s.replace(/"/g, '""').replace(/\r?\n/g, " ");
  return `"${v}"`;
}

export const dynamic = "force-dynamic";
