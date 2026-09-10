import Link from "next/link";
import { notFound } from "next/navigation";
import { AlarmClockCheck, BookOpen, ChevronRight, Info, ListChecks, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MarkdownContent } from "@/components/markdown-content";
import { MasteryBar } from "@/components/mastery-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpActionBar } from "@/components/kp-action-bar";
import { cn } from "@/lib/utils";
import { EXAM_FREQUENCY, masteryLevel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function KnowledgePointPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const kp = await prisma.knowledgePoint.findUnique({
    where: { id },
    include: {
      topic: {
        include: {
          chapter: {
            include: {
              paper: { select: { code: true, name: true, accent: true } },
            },
          },
        },
      },
    },
  });
  if (!kp) notFound();

  const relatedQuestions = await prisma.question.findMany({
    where: { knowledgePointId: kp.id, status: "published" },
    include: {
      paper: { select: { code: true } },
      options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { difficulty: "asc" },
    take: 12,
  });

  let masteryScore: number | null = null;
  let wrongCount = 0;
  if (session) {
    const [m, w] = await Promise.all([
      prisma.masteryScore.findUnique({
        where: { userId_knowledgePointId: { userId: session.id, knowledgePointId: kp.id } },
        select: { score: true },
      }),
      prisma.wrongQuestion.count({ where: { userId: session.id, questionId: { in: relatedQuestions.map((q) => q.id) }, mastered: false } }),
    ]);
    masteryScore = m?.score ?? null;
    wrongCount = w;
  }

  const siblings = await prisma.knowledgePoint.findMany({
    where: { topicId: kp.topicId },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/papers" className="hover:text-foreground">知识库</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/papers/${kp.topic.chapter.paper.code}`} className="hover:text-foreground">
          {kp.topic.chapter.paper.code} {kp.topic.chapter.paper.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/chapter/${kp.topic.chapter.id}`} className="hover:text-foreground">
          {kp.topic.chapter.code} {kp.topic.chapter.title}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{kp.title}</span>
      </nav>

      {/* 头部 */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{kp.title}</h1>
              {kp.standardReference ? <Badge variant="cyan" className="font-mono">{kp.standardReference}</Badge> : null}
              {kp.examFrequency ? (
                <Badge variant="warning"><AlarmClockCheck className="h-3 w-3" /> {EXAM_FREQUENCY[kp.examFrequency]}考点</Badge>
              ) : null}
            </div>
            {kp.summary ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{kp.summary}</p> : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Topic：{kp.topic.title} · 关联题目 {relatedQuestions.length} 道
              {wrongCount > 0 ? ` · 待复习错题 ${wrongCount}` : ""}
            </p>
          </div>
          {masteryScore !== null ? (
            <div className="w-44 shrink-0 rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">掌握度</p>
              <p className={cn("mt-1 text-2xl font-bold tabular-nums", masteryLevel(masteryScore).color)}>
                {masteryScore}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{masteryLevel(masteryScore).label}</span>
              </p>
              <MasteryBar score={masteryScore} className="mt-2" showLabel={false} />
            </div>
          ) : null}
        </div>
        <KpActionBar kpId={kp.id} />
      </div>

      {kp.contentMd ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <MarkdownContent content={kp.contentMd} />
          <p className="mt-6 flex items-start gap-2 rounded-lg bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            本内容为基于公开 syllabus 的整理笔记（syllabus_version: ACCA-Q-2026，来源: 知识点原创整理）。涉及准则与税率请以当前 ACCA 官方 syllabus 和考试规则为准。
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">该知识点正文待补充，可先通过关联题目学习。</p>
        </div>
      )}

      {/* 关联题目 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ListChecks className="h-5 w-5 text-primary" /> 关联题目
          </h2>
          {relatedQuestions.length > 0 ? (
            <Link
              href={`/practice?mode=knowledge&kp=${kp.id}&count=20`}
              className="text-sm font-medium text-primary hover:underline"
            >
              知识点刷题 →
            </Link>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {relatedQuestions.map((q) => (
            <Link
              key={q.id}
              href={`/question/${q.id}`}
              className="card-hover flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm"
            >
              <Badge variant="default" className="mt-0.5 shrink-0">{q.paper.code}</Badge>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium leading-6">{plainText(q.textMd)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  难度 {q.difficulty}/5 · {q.marks} 分 · {q.estimatedTimeSec}s
                </p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40" />
            </Link>
          ))}
          {relatedQuestions.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              暂无关联题目
            </p>
          ) : null}
        </div>
        {relatedQuestions.length > 0 ? (
          <div className="mt-4 flex gap-2">
            <Link href={`/practice?mode=knowledge&kp=${kp.id}&count=20`}>
              <Button><ListChecks className="h-4 w-4" /> 开始练习（20 题）</Button>
            </Link>
            <Link href={`/practice?mode=knowledge&kp=${kp.id}&count=10`}>
              <Button variant="outline">快速 10 题</Button>
            </Link>
          </div>
        ) : null}
      </div>

      {/* 同 Topic 其他知识点 */}
      {siblings.length > 1 ? (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" /> 同一 Topic 的其他知识点
          </h3>
          <div className="flex flex-wrap gap-2">
            {siblings.filter((s) => s.id !== kp.id).map((s) => (
              <Link
                key={s.id}
                href={`/knowledge/${s.id}`}
                className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {s.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
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
