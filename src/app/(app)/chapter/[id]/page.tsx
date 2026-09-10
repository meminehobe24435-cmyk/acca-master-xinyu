import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Flame, ListChecks, RotateCcw, Target } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MasteryBar } from "@/components/mastery-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EXAM_FREQUENCY, masteryLevel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: {
      paper: { select: { id: true, code: true, name: true, accent: true } },
      topics: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { questions: { where: { status: "published" } } } },
          knowledgePoints: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, summary: true, standardReference: true, examFrequency: true, contentMd: true },
          },
        },
      },
    },
  });
  if (!chapter) notFound();

  let masteryMap = new Map<string, number>();
  let wrongIds: string[] = [];
  if (session) {
    const [rows, wrongs] = await Promise.all([
      prisma.masteryScore.findMany({
        where: { userId: session.id, knowledgePoint: { topic: { chapterId: chapter.id } } },
        select: { knowledgePointId: true, score: true },
      }),
      prisma.wrongQuestion.findMany({
        where: { userId: session.id, mastered: false, question: { chapterId: chapter.id } },
        select: { questionId: true },
      }),
    ]);
    masteryMap = new Map(rows.map((r) => [r.knowledgePointId, r.score]));
    wrongIds = wrongs.map((w) => w.questionId);
  }

  const highFreq = chapter.topics
    .flatMap((t) => t.knowledgePoints)
    .filter((k) => k.examFrequency === "HIGH");
  const kpsFlat = chapter.topics.flatMap((t) => t.knowledgePoints);
  const scores = [...masteryMap.values()];
  const avgMastery = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const chapterQuestions = await prisma.question.findMany({
    where: { chapterId: chapter.id, status: "published" },
    include: {
      paper: { select: { code: true } },
      options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { difficulty: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      {/* 章节头部 */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold text-white shadow"
            style={{ backgroundColor: chapter.paper.accent ?? "#4f46e5" }}
          >
            {chapter.code}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              <Link href={`/papers/${chapter.paper.code}`} className="hover:text-primary">
                {chapter.paper.code} {chapter.paper.name}
              </Link>{" "}
              / 第 {chapter.code} 章
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">{chapter.title}</h1>
            {chapter.description ? <p className="mt-1 text-sm text-muted-foreground">{chapter.description}</p> : null}
          </div>
          <div className="flex gap-2">
            <Link href={`/practice?chapter=${chapter.id}`}>
              <Button size="sm"><ListChecks className="h-4 w-4" /> 章节刷题</Button>
            </Link>
            <Link href={`/practice?mode=chapter&chapter=${chapter.id}`}>
              <Button size="sm" variant="outline"><Target className="h-4 w-4" /> 专项练习</Button>
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>{chapter.topics.length} 个 Topic</span>
          <span>
            {chapter.topics.reduce((a, t) => a + t._count.questions, 0)} 道题
          </span>
          {avgMastery !== null ? (
            <span className="flex items-center gap-2">
              掌握度 <MasteryBar score={avgMastery} className="w-32" />
            </span>
          ) : null}
          {wrongIds.length > 0 ? (
            <Badge variant="destructive">本章错题 {wrongIds.length}</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* 知识点 */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
              <BookOpen className="h-5 w-5 text-primary" /> 知识点
            </h2>
            <div className="space-y-4">
              {chapter.topics.map((t) => (
                <div key={t.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.title}
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-normal">{t._count.questions} 题</span>
                  </p>
                  <div className="space-y-1">
                    {t.knowledgePoints.map((kp) => {
                      const score = masteryMap.get(kp.id);
                      return (
                        <Link
                          key={kp.id}
                          href={`/knowledge/${kp.id}`}
                          className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50"
                        >
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              score === undefined
                                ? "bg-muted-foreground/30"
                                : score < 40
                                  ? "bg-rose-500"
                                  : score < 60
                                    ? "bg-amber-500"
                                    : score < 80
                                      ? "bg-blue-500"
                                      : "bg-emerald-500"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium group-hover:text-primary">{kp.title}</p>
                            {kp.summary ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{kp.summary}</p> : null}
                          </div>
                          {kp.standardReference ? (
                            <Badge variant="cyan" className="hidden md:inline-flex">{kp.standardReference}</Badge>
                          ) : null}
                          {score !== undefined ? (
                            <span className={cn("w-9 shrink-0 text-right text-xs font-semibold", masteryLevel(score).color)}>
                              {score}
                            </span>
                          ) : null}
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 本章题目 */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
              <ListChecks className="h-5 w-5 text-primary" /> 本章题解
            </h2>
            <div className="space-y-2">
              {chapterQuestions.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  本章暂无题目，去后台导入或生成。
                </p>
              ) : (
                chapterQuestions.map((q) => (
                  <Link
                    key={q.id}
                    href={`/question/${q.id}`}
                    className="card-hover block rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="default">{q.paper.code}</Badge>
                      <Badge variant="outline">难度 {q.difficulty}/5</Badge>
                      <span className="text-muted-foreground">{q.marks} 分</span>
                      {wrongIds.includes(q.id) ? <Badge variant="destructive">错题</Badge> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm">{plainText(q.textMd)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 侧栏：高频考点 / 错题 / 易错公式 */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Flame className="h-4 w-4 text-orange-500" /> 高频考点
            </h3>
            <div className="space-y-2">
              {highFreq.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无标注高频的考点。</p>
              ) : (
                highFreq.slice(0, 8).map((k) => (
                  <Link key={k.id} href={`/knowledge/${k.id}`} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm hover:border-primary/40 hover:bg-accent/40">
                    <Badge variant="warning" className="shrink-0">高频</Badge>
                    <span className="line-clamp-1">{k.title}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <RotateCcw className="h-4 w-4 text-destructive" /> 本章错题
            </h3>
            {wrongIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">本章没有未掌握的错题 🎉</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                共 <span className="font-semibold text-foreground">{wrongIds.length}</span> 道，建议按间隔重复计划复习。
              </p>
            )}
            <Link href={`/practice?mode=mistakes&paper=${chapter.paper.id}`} className="mt-3 block">
              <Button size="sm" variant="outline" className="w-full">错题重刷</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function plainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|$-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
