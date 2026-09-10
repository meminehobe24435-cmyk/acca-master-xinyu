import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleCheck,
  Flame,
  ListChecks,
  RotateCcw,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/stats";
import { StatCard } from "@/components/stat-card";
import { MasteryBar } from "@/components/mastery-bar";
import { StudyHeatmap, StreakBadge } from "@/components/study-heatmap";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { masteryLevel } from "@/lib/constants";
import { greetingFor, dailyPraise } from "@/lib/encourage";
import { Bubbles, FishIcon, SparkIcon } from "@/components/brand/fish";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();

  const data = await getDashboardData(session.id);
  const today = data.today;
  const goalPct = Math.min(100, Math.round((today.attempts / Math.max(1, today.goal)) * 100));
  const greeting = greetingFor();
  const praise = dailyPraise({
    attemptsToday: today.attempts,
    accuracyToday: today.accuracy,
    streakDays: data.streak,
    goalToday: today.goal,
  });
  const dateStr = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });

  return (
    <div className="space-y-6">
      {/* 问候：按时段变化 + 鼓励语池随机 */}
      <div className="soft-aurora relative overflow-hidden rounded-2xl border bg-card/70 p-5 shadow-sm">
        <Bubbles count={4} />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{dateStr}</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              {greeting.title.includes("⭐") || greeting.title.includes("🐟") ? greeting.title : `${greeting.title} ⭐🐟`}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{greeting.line}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StreakBadge streak={data.streak} />
            <span className="hidden rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground sm:inline">
              题库 {data.questionsTotal} 题
            </span>
          </div>
        </div>
        <p className="relative mt-4 rounded-xl bg-card/80 px-4 py-3 text-sm leading-relaxed text-foreground/85">
          <span className="mr-1.5 inline-flex align-middle text-amber">
            <SparkIcon className="h-3.5 w-3.5" />
          </span>
          {praise.headline} {praise.detail}
        </p>
      </div>

      {/* 今日学习 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="今日刷题"
          value={`${today.attempts} 题`}
          sub={`目标 ${today.goal} 题 · 已达成 ${goalPct}%`}
          icon={<ListChecks className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="今日正确率"
          value={`${today.accuracy}%`}
          sub={today.attempts ? `${today.correct} 题回答正确` : "今天还没开始"}
          icon={<CircleCheck className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="学习时长"
          value={formatDuration(today.seconds)}
          sub="今日累计"
          icon={<Timer className="h-5 w-5" />}
          accent="violet"
        />
        <StatCard
          label="连续学习"
          value={`${data.streak} 天`}
          sub="Study Streak"
          icon={<Flame className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {/* 目标进度 */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">今日目标进度</span>
          <span className="text-muted-foreground">
            {today.attempts} / {today.goal} 题 {goalPct >= 100 ? "🎉 已达标" : ""}
          </span>
        </div>
        <Progress value={goalPct} className="h-2.5" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 当前学习科目 */}
        <div className="space-y-6 lg:col-span-2">
          {data.currentPaper ? (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-4 border-b bg-secondary/30 p-5">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
                  style={{ backgroundColor: data.currentPaper.accent ?? "#4f46e5" }}
                >
                  {data.currentPaper.code}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold tracking-tight">
                    {data.currentPaper.code} {data.currentPaper.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    章节完成度 {data.currentPaper.stats.coverage}% · 本周正确率 {data.currentPaper.stats.accuracy}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/papers/${data.currentPaper.code}`}>
                    <Button variant="outline" size="sm">科目页</Button>
                  </Link>
                  <Link href={`/practice?mode=chapter&paper=${data.currentPaper.id}`}>
                    <Button size="sm">继续学习 <ArrowRight className="h-3.5 w-3.5" /></Button>
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">
                {[
                  { label: "练习次数", value: data.currentPaper.stats.attempts },
                  { label: "正确率", value: `${data.currentPaper.stats.accuracy}%` },
                  { label: "薄弱错题", value: data.currentPaper.stats.wrongCount },
                  { label: "收藏", value: data.currentPaper.stats.favoriteCount },
                  { label: "学习时间", value: formatDuration(data.currentPaper.stats.studySeconds) },
                ].map((s) => (
                  <div key={s.label} className="bg-card px-4 py-3 text-center">
                    <p className="text-lg font-bold tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
              <FishIcon className="mx-auto h-6 w-8 text-primary/70" />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                还没有学习记录。选一门科目，从最简单的几道题开始就很好 🐟
              </p>
              <Link href="/papers" className="mt-4 inline-block">
                <Button><BookOpen className="h-4 w-4" /> 浏览科目</Button>
              </Link>
            </div>
          )}

          {/* 掌握度 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-success" /> 熟练知识点 Top 5
                </h3>
                <Link href="/analytics" className="text-xs text-primary hover:underline">统计详情</Link>
              </div>
              {data.topKps.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  完成练习后，这里会慢慢长出你的掌握度分布 ⭐
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topKps.map((k) => (
                    <div key={k.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="truncate">
                          <Badge variant="secondary" className="mr-1.5 px-1 text-[10px]">{k.paperCode}</Badge>
                          {k.title}
                        </span>
                        <span className={masteryLevel(k.score).color}>{k.score}</span>
                      </div>
                      <MasteryBar score={k.score} showLabel={false} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-amber" /> 薄弱知识点 Top 5
                </h3>
                <Link href="/practice?mode=smart" className="text-xs text-primary hover:underline">去强化</Link>
              </div>
              {data.weakKps.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  暂时没有薄弱知识点，说明最近做得挺稳 ⭐ 继续按自己的节奏走就好。
                </p>
              ) : (
                <div className="space-y-3">
                  {data.weakKps.map((k) => (
                    <div key={k.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="truncate">
                          <Badge variant="secondary" className="mr-1.5 px-1 text-[10px]">{k.paperCode}</Badge>
                          {k.title}
                        </span>
                        <span className={masteryLevel(k.score).color}>{k.score}</span>
                      </div>
                      <MasteryBar score={k.score} showLabel={false} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 学习热力图 */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">过去 12 周学习热力图</h3>
            <div className="overflow-x-auto pb-1 scrollbar-thin">
              <StudyHeatmap data={data.heatmap} className="min-w-max" />
            </div>
          </div>
        </div>

        {/* 右侧栏 */}
        <div className="space-y-6">
          {/* 今日建议 */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> 给 ⭐🐟 的今日建议
            </h3>
            {data.suggestions.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                今天还没有开始。第一题一直在这里等你 🐟 先做几道，系统就会知道该推什么给你。
              </p>
            ) : (
              <div className="space-y-2">
                {data.suggestions.map((s) => (
                  <div key={s.kpTitle} className="rounded-lg border p-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Badge variant="secondary" className="px-1 text-[10px]">{s.paperCode}</Badge>
                      {s.kpTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.reason} · 关联 {s.questionCount} 题
                    </p>
                  </div>
                ))}
                <Button asChild className="mt-2 w-full">
                  <Link href="/practice?mode=smart">智能刷题强化 <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            )}
          </div>

          {/* 错题提醒 */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <RotateCcw className="h-4 w-4 text-amber" /> ⭐🐟 的错题复习
            </h3>
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
              <div>
                <p className="text-2xl font-bold tabular-nums">{data.dueWrong.today}</p>
                <p className="text-[11px] text-muted-foreground">今日到期 / 共 {data.dueWrong.total} 道</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Link href="/practice?mode=mistakes">
                  <Button size="sm">错题重刷</Button>
                </Link>
                <Link href="/mistakes" className="text-xs text-muted-foreground hover:text-foreground">进入错题本 →</Link>
              </div>
            </div>
          </div>

          {/* 考试准备度 */}
          {data.readiness.length > 0 ? (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-amber" /> Exam Readiness
              </h3>
              <div className="space-y-3">
                {data.readiness.map((r) => (
                  <div key={r.code}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{r.code} {r.name}</span>
                      <span className="font-semibold tabular-nums">{r.score} / 100</span>
                    </div>
                    <Progress value={r.score} className="h-1.5" indicatorClassName="bg-gradient-to-r from-primary to-violet-500" />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                基于大纲覆盖、正确率、Exam Level 表现与模拟考综合估计，仅供参考，不构成考试结果预测。
              </p>
            </div>
          ) : null}

          {/* 今日任务 */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-violet-500" /> 今日任务
            </h3>
            {data.todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                暂无自动任务。在{" "}
                <Link href="/plan" className="text-primary hover:underline">学习计划</Link>{" "}
                中设置考试日期，系统将为你生成每日任务。
              </p>
            ) : (
              <div className="space-y-2">
                {data.todayTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${t.completed ? "bg-success" : "bg-muted-foreground/40"}`} />
                    <span className="flex-1">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.doneCount}/{t.targetCount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 成就 */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-amber" /> 成就
              </h3>
              <Link href="/profile#achievements" className="text-xs text-primary hover:underline">查看全部</Link>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={(data.achieved / Math.max(1, data.allAchievements)) * 100} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">
                {data.achieved}/{data.allAchievements}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
