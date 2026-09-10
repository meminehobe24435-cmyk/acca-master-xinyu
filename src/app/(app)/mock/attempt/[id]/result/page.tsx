import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  RotateCcw,
  Timer,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { KpRadarChart, ChapterBarChart } from "@/components/charts";
import { cn } from "@/lib/utils";
import { mockFeedback } from "@/lib/encourage";

export const dynamic = "force-dynamic";

export default async function MockResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const attempt = await prisma.mockExamAttempt.findUnique({
    where: { id },
    include: {
      mockExam: { include: { paper: { select: { code: true, name: true, accent: true, passMark: true } } } },
    },
  });
  if (!attempt) notFound();
  if (session && attempt.userId && attempt.userId !== session.id) notFound();

  const sectionStats = attempt.sectionStatsJson ? JSON.parse(attempt.sectionStatsJson) : [];
  const answersJson = attempt.answersJson ? JSON.parse(attempt.answersJson) : {};
  const examConfig = JSON.parse(attempt.mockExam.configJson) as {
    sections: { id: string; name: string; count: number; marksPerQuestion: number; questionIds: string[] }[];
  };
  const orderedIds = examConfig.sections.flatMap((s) => s.questionIds ?? []);
  const questions = await prisma.question.findMany({
    where: { id: { in: orderedIds } },
    include: {
      paper: { select: { code: true } },
      chapter: { select: { title: true } },
      knowledgePoint: { select: { title: true } },
      options: { select: { key: true, text: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  const oMap = new Map(orderedIds.map((qid, i) => [qid, i]));
  questions.sort((a, b) => (oMap.get(a.id) ?? 0) - (oMap.get(b.id) ?? 0));

  // 每题结果
  const perQuestion = questions.map((q) => {
    const r = (answersJson as Record<string, { answer: unknown; isCorrect: boolean; score: number; maxScore: number }>)[q.id];
    return {
      id: q.id,
      paperCode: q.paper.code,
      textMd: q.textMd,
      chapter: q.chapter?.title ?? "",
      kp: q.knowledgePoint?.title ?? "",
      answered: r !== undefined,
      isCorrect: r?.isCorrect ?? false,
      score: r?.score ?? 0,
      maxScore: r?.maxScore ?? q.marks,
    };
  });

  // 章节得分 → 雷达（取最高频 5 个知识点）
  const kpAgg = new Map<string, { earned: number; total: number }>();
  for (const r of perQuestion) {
    if (!r.kp) continue;
    const cur = kpAgg.get(r.kp) ?? { earned: 0, total: 0 };
    cur.earned += r.score;
    cur.total += r.maxScore;
    kpAgg.set(r.kp, cur);
  }
  const radarData = [...kpAgg.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)
    .map(([kp, v]) => ({ kp: kp.length > 10 ? kp.slice(0, 9) + "…" : kp, score: Math.round((v.earned / Math.max(1, v.total)) * 100) }));

  const chapterAgg = new Map<string, { earned: number; total: number }>();
  for (const r of perQuestion) {
    if (!r.chapter) continue;
    const cur = chapterAgg.get(r.chapter) ?? { earned: 0, total: 0 };
    cur.earned += r.score;
    cur.total += r.maxScore;
    chapterAgg.set(r.chapter, cur);
  }
  const chapterData = [...chapterAgg.entries()]
    .map(([chapter, v]) => ({ chapter: chapter.length > 12 ? chapter.slice(0, 11) + "…" : chapter, earned: v.earned, total: v.total }))
    .sort((a, b) => b.total - a.total);

  const score = attempt.score ?? 0;
  const pass = score >= attempt.mockExam.paper.passMark;
  const feedback = mockFeedback(score);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative">
            <div
              className={cn(
                "flex h-28 w-28 items-center justify-center rounded-full border-4",
                pass ? "border-success/60" : "border-destructive/50"
              )}
            >
              <div className="text-center">
                <p className={cn("text-4xl font-bold tabular-nums", pass ? "text-success" : "text-destructive")}>{score}</p>
                <p className="text-[10px] text-muted-foreground">/ 100</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {attempt.mockExam.paper.code} 模拟考试成绩
              </h1>
              <Badge variant={pass ? "success" : "outline"}>{pass ? "通过 Pass" : "这次没过 50 分"}</Badge>
              <Badge variant="outline">{attempt.status === "AUTO_SUBMITTED" ? "自动交卷" : "手动交卷"}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              <Clock className="mr-1 inline h-3.5 w-3.5" />
              {new Date(attempt.startAt).toLocaleString("zh-CN")} · 及格线 50 分
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              本卷 {perQuestion.length} 题 · 答对 {perQuestion.filter((q) => q.isCorrect).length} 题
            </div>
            <Progress value={score} className="mt-3 max-w-sm" indicatorClassName={pass ? "bg-success" : "bg-gradient-to-r from-amber-400 to-rose-400"} />

            {/* ⭐🐟 分层温柔反馈（不羞辱、不夸大） */}
            <div className="mt-4 max-w-xl rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span>{feedback.label}</span>
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{feedback.text}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={`/practice?mode=mistakes&paper=${attempt.mockExam.paperId}`}>
              <Button><RotateCcw className="h-4 w-4" /> 复习错题</Button>
            </Link>
            <Link href="/mock">
              <Button variant="outline">重新模考 <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Section 统计 */}
      {sectionStats.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {sectionStats.map((s: { id: string; name: string; earned: number; total: number; attempted: number; count: number }) => (
            <div key={s.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Section {s.id}</p>
                <Badge variant="outline">
                  {s.earned}/{s.total} 分
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{s.name}</p>
              <Progress value={(s.earned / Math.max(1, s.total)) * 100} className="mt-3 h-2" />
              <p className="mt-2 text-[11px] text-muted-foreground">已作答 {s.attempted} / {s.count} 题</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 知识点雷达 */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold tracking-tight">
            <Award className="h-5 w-5 text-primary" /> 薄弱知识点雷达
          </h2>
          <KpRadarChart data={radarData} />
        </div>
        {/* 章节得分 */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-2 text-base font-bold tracking-tight">各章节得分</h2>
          <ChapterBarChart data={chapterData} />
        </div>
      </div>

      {/* 逐题回顾 */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold tracking-tight">逐题回顾</h2>
        <div className="space-y-2">
          {perQuestion.map((q, i) => (
            <Link key={q.id} href={`/question/${q.id}`} className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
              {q.answered ? (
                q.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                )
              ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dashed text-[9px] text-muted-foreground">?</span>
              )}
              <span className="text-xs font-semibold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <p className="min-w-0 flex-1 truncate text-sm">{plainText(q.textMd)}</p>
              <Badge variant="secondary" className="shrink-0">{q.paperCode}</Badge>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{q.score}/{q.maxScore} 分</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-primary" />
            </Link>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>🐟 错题已自动收进错题本（1 → 3 → 7 → 14 → 30 天提醒复习）</span>
          <Link href="/analytics" className="font-medium text-primary hover:underline">查看学习统计 →</Link>
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
