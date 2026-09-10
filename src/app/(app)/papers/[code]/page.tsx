import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookMarked,
  ChevronDown,
  Clock,
  ListChecks,
  PlayCircle,
  Star,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getUserPaperStats } from "@/lib/stats";
import { MasteryBar } from "@/components/mastery-bar";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatDuration, cn } from "@/lib/utils";
import { masteryLevel, EXAM_FREQUENCY, PAPER_LEVELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PaperPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession();
  const paper = await prisma.paper.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      variants: true,
      chapters: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { questions: { where: { status: "published" } } } },
          topics: {
            orderBy: { order: "asc" },
            include: {
              _count: { select: { questions: { where: { status: "published" } } } },
              knowledgePoints: {
                orderBy: { order: "asc" },
                select: { id: true, title: true, summary: true, standardReference: true, examFrequency: true },
              },
            },
          },
        },
      },
    },
  });
  if (!paper) notFound();

  const stats = await getUserPaperStats(session?.id ?? null, paper.id);

  // 用户掌握度地图
  let masteryMap = new Map<string, number>();
  if (session) {
    const rows = await prisma.masteryScore.findMany({
      where: { userId: session.id, knowledgePoint: { topic: { chapter: { paperId: paper.id } } } },
      select: { knowledgePointId: true, score: true },
    });
    masteryMap = new Map(rows.map((r) => [r.knowledgePointId, r.score]));
  }

  const examConfig = paper.examConfigJson ? JSON.parse(paper.examConfigJson) : null;

  return (
    <div className="space-y-6">
      {/* 科目头部 */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div
          className="h-1.5"
          style={{ background: `linear-gradient(90deg, ${paper.accent ?? "#4f46e5"}, ${paper.accent ?? "#4f46e5"}55)` }}
        />
        <div className="flex flex-wrap items-start gap-4 p-5 sm:gap-5 sm:p-6">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg sm:h-16 sm:w-16 sm:text-xl"
            style={{ backgroundColor: paper.accent ?? "#4f46e5" }}
          >
            {paper.code}
          </span>
          <div className="w-full min-w-0 sm:w-auto sm:flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{paper.name}</h1>
              <Badge variant="outline">{paper.nameCn ?? ""}</Badge>
              <Badge variant="secondary">{PAPER_LEVELS[paper.level]?.en}</Badge>
              {paper.category ? <Badge variant="violet">{paper.category === "OPTIONS" ? "选修 · Options" : "核心 · Essentials"}</Badge> : null}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:max-w-2xl">{paper.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {paper.variants.map((v) => (
                <Link key={v.id} href={`/practice?paper=${paper.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                  <Badge variant="outline">{v.code} {v.label}</Badge>
                </Link>
              ))}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {paper.examDurationMin} 分钟 · 满分 100 · 50 通过
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/practice?paper=${paper.id}`}>
              <Button><PlayCircle className="h-4 w-4" /> 章节刷题</Button>
            </Link>
            <Link href={`/mock?paper=${paper.code}`}>
              <Button variant="outline"><Timer className="h-4 w-4" /> 模拟考试</Button>
            </Link>
          </div>
        </div>
        {/* 统计 */}
        <div className="grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "总体掌握度", value: `${stats.masteryAvg}`, icon: <TrendingUp className="h-4 w-4" />, accent: "primary" as const },
            { label: "刷题数", value: `${stats.attempts}`, icon: <ListChecks className="h-4 w-4" />, accent: "default" as const },
            { label: "正确率", value: `${stats.accuracy}%`, icon: <Target className="h-4 w-4" />, accent: "success" as const },
            { label: "薄弱错题", value: `${stats.wrongCount}`, icon: <BookMarked className="h-4 w-4" />, accent: "warning" as const },
            { label: "收藏", value: `${stats.favoriteCount}`, icon: <Star className="h-4 w-4" />, accent: "violet" as const },
            { label: "学习时间", value: formatDuration(stats.studySeconds), icon: <Clock className="h-4 w-4" />, accent: "cyan" as const },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 bg-card px-4 py-3">
              <span className="text-muted-foreground">{s.icon}</span>
              <div>
                <p className="text-base font-bold tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* 章节知识树 */}
        <div className="space-y-3">
          {paper.chapters.map((ch) => {
            const chapterMastery =
              ch.topics.flatMap((t) => t.knowledgePoints.map((k) => masteryMap.get(k.id) ?? null)).filter((v): v is number => v !== null);
            const avgMastery = chapterMastery.length
              ? Math.round(chapterMastery.reduce((a, b) => a + b, 0) / chapterMastery.length)
              : null;
            return (
              <details key={ch.id} className="group rounded-xl border bg-card shadow-sm open:ring-1 open:ring-primary/20" open>
                <summary className="flex cursor-pointer select-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-xs font-bold text-primary">
                    {ch.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold group-open:font-bold">{ch.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ch.topics.length} 个 Topic · {ch._count.questions} 题
                    </p>
                  </div>
                  {avgMastery !== null ? (
                    <div className="w-36 shrink-0">
                      <MasteryBar score={avgMastery} className="text-[10px]" />
                    </div>
                  ) : null}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t p-3 sm:p-4 sm:pl-16">
                  {ch.topics.map((t) => (
                    <div key={t.id}>
                      <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
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
                              <span className="min-w-0 flex-1 text-sm leading-snug">{kp.title}</span>
                              {kp.standardReference ? (
                                <Badge variant="cyan" className="hidden shrink-0 sm:inline-flex">{kp.standardReference}</Badge>
                              ) : null}
                              {kp.examFrequency ? (
                                <Badge variant="secondary" className="hidden shrink-0 md:inline-flex">
                                  {EXAM_FREQUENCY[kp.examFrequency]}
                                </Badge>
                              ) : null}
                              {score !== undefined ? (
                                <span className={cn("w-10 shrink-0 text-right text-xs font-semibold", masteryLevel(score).color)}>
                                  {score}
                                </span>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <Link href={`/practice?chapter=${ch.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <ListChecks className="h-3.5 w-3.5" /> 本章刷题 <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </details>
            );
          })}
        </div>

        {/* 右侧：考制与准备度 */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Timer className="h-4 w-4 text-primary" /> 考试结构（官方考制整理）
            </h3>
            <div className="space-y-2">
              {(examConfig?.sections ?? []).map((s: { id: string; name: string; count: number; marksPerQuestion: number; sectionMarks: number; scope?: string }) => (
                <div key={s.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Section {s.id} · {s.name}</p>
                    <Badge variant="outline">{s.sectionMarks} 分</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.count} 题 × {s.marksPerQuestion} 分 {s.scope ? `· ${s.scope}` : ""}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              具体以 ACCA 官网最新考试说明为准。
            </p>
          </div>

          {session ? (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Exam Readiness</h3>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold tracking-tight gradient-text">{stats.examReadiness}</p>
                <p className="pb-1 text-sm text-muted-foreground">/ 100</p>
              </div>
              <Progress value={stats.examReadiness} className="mt-3 h-2" />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-secondary/50 p-2">
                  <p className="font-semibold tabular-nums">{stats.coverage}%</p>
                  <p className="text-muted-foreground">大纲覆盖</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <p className="font-semibold tabular-nums">{stats.kpCount}</p>
                  <p className="text-muted-foreground">知识点总数</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">综合估计，仅供参考，不构成结果预测。</p>
            </div>
          ) : null}

          <Link href="/mock" className="block">
            <div className="card-hover rounded-xl border border-dashed p-5 text-center">
              <p className="text-sm font-medium">想检验水平？</p>
              <p className="mt-1 text-xs text-muted-foreground">按官方考制进行全真模拟考试</p>
              <Button variant="outline" size="sm" className="mt-3">
                <Timer className="h-3.5 w-3.5" /> 前往模拟考试
              </Button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
