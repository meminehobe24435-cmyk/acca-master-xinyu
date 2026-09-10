import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  PencilLine,
  RotateCcw,
  Sparkles,
  Timer,
  LineChart,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/stats";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";
import { Bubbles, FishIcon, SparkIcon } from "@/components/brand/fish";
import { greetingFor, dailyPraise } from "@/lib/encourage";
import { StatCard } from "@/components/stat-card";
import { PAPER_LEVELS } from "@/lib/constants";
import { cn, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getSession();
  const [papers, questionCount, kpCount, data] = await Promise.all([
    prisma.paper.findMany({ orderBy: { order: "asc" } }),
    prisma.question.count({ where: { status: "published" } }),
    prisma.knowledgePoint.count(),
    getDashboardData(user.id),
  ]);

  const greeting = greetingFor();
  const praise = dailyPraise({
    attemptsToday: data.today.attempts,
    accuracyToday: data.today.accuracy,
    streakDays: data.streak,
    goalToday: data.today.goal,
  });

  const byLevel = (level: string) =>
    papers.filter((p) => p.level === level).sort((a, b) => a.order - b.order);

  const quickLinks = [
    {
      href: "/practice?mode=smart",
      icon: <Sparkles className="h-5 w-5" />,
      title: "继续刷题",
      desc: "智能组题，优先推薄弱点",
    },
    {
      href: "/papers",
      icon: <BookOpen className="h-5 w-5" />,
      title: "知识库",
      desc: `${papers.length} 门科目 · ${kpCount} 个知识点`,
    },
    {
      href: "/mock",
      icon: <Timer className="h-5 w-5" />,
      title: "模拟考试",
      desc: "按官方考制全真模拟",
    },
    {
      href: "/mistakes",
      icon: <RotateCcw className="h-5 w-5" />,
      title: "错题本",
      desc: `${data.dueWrong.today} 道待复习`,
    },
    {
      href: "/analytics",
      icon: <LineChart className="h-5 w-5" />,
      title: "学习统计",
      desc: "掌握度与趋势",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark size="sm" href="/" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">学习中心</Link>
            <Link href="/papers" className="transition-colors hover:text-foreground">知识库</Link>
            <Link href="/practice" className="transition-colors hover:text-foreground">刷题</Link>
            <Link href="/mock" className="transition-colors hover:text-foreground">模拟考试</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              进入学习 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="soft-aurora relative overflow-hidden">
        <Bubbles count={5} />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="flex flex-col items-start gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <SparkIcon className="h-3.5 w-3.5 text-amber" />
              打开就能学 · 不需要登录
            </span>

            <h1 className="mt-2 text-4xl font-bold leading-[1.2] tracking-tight sm:text-5xl">
              {greeting.title.includes("⭐") || greeting.title.includes("🐟") ? (
                greeting.title
              ) : (
                <>
                  {greeting.title} <span className="whitespace-nowrap">⭐🐟</span>
                </>
              )}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              给今天留一点时间，把不会的慢慢变成会的。
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/practice?mode=smart"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                <PencilLine className="h-4 w-4" /> 开始今天的学习
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-xl border bg-card/80 px-6 text-base font-medium shadow-sm backdrop-blur transition-colors hover:bg-secondary"
              >
                今日进度 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* 今日进度（真实数据） */}
          <div className="mt-10 rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <SparkIcon className="h-4 w-4 text-amber" /> ⭐🐟 今天的小进度
            </p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="今日完成"
                value={`${data.today.attempts} 题`}
                sub={`目标 ${data.today.goal} 题`}
                accent="primary"
              />
              <StatCard label="今日正确率" value={`${data.today.accuracy}%`} sub="真实统计" accent="success" />
              <StatCard label="学习时长" value={formatDuration(data.today.seconds)} sub="今天累计" accent="violet" />
              <StatCard label="连续学习" value={`${data.streak} 天`} sub="Study Streak" accent="warning" />
            </div>
            <p className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/80">
              {praise.headline} {praise.detail}
            </p>
          </div>
        </div>
      </section>

      {/* 快捷入口 */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">接下来想去哪里</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="card-hover group flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {q.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{q.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{q.desc}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>

      {/* 科目体系 */}
      <section className="border-y bg-secondary/30 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">完整 ACCA 科目体系</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                当前 {papers.length} 门科目 · {kpCount} 个知识点 · {questionCount} 道原创练习题（含地区变体 TX-UK / TX-CHN / LW-ENG 等）
              </p>
            </div>
            <Link href="/papers" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              查看全部 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {(["APPLIED_KNOWLEDGE", "APPLIED_SKILLS", "STRATEGIC_PROFESSIONAL"] as const).map((level) => {
              const list = byLevel(level);
              if (list.length === 0) return null;
              return (
                <div key={level} className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {PAPER_LEVELS[level]?.en} · {PAPER_LEVELS[level]?.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((p) => (
                      <Link
                        key={p.id}
                        href={`/papers/${p.code}`}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                          style={{ backgroundColor: p.accent ?? "#7c6bd6" }}
                        >
                          {p.code}
                        </span>
                        <span className="truncate">{p.nameCn ?? p.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 学习闭环 */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">一条温柔但有效的学习闭环</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          知识点 → 刷题 → 温柔反馈 → 错题本 → AI 讲题 → 模拟考试 → 统计 → 再强化
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {[
            "看知识点",
            "章节刷题",
            "温柔反馈",
            "错题本",
            "AI 讲题",
            "模拟考试",
            "成绩分析",
            "强化薄弱点",
          ].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-sm shadow-sm">
                <span className="text-xs font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </span>
              {i < arr.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" /> : null}
            </div>
          ))}
        </div>
      </section>

      {/* 结尾 CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-violet-500 to-cyan-500 p-10 text-center text-white sm:p-14">
          <Bubbles count={4} className="opacity-70" />
          <div className="relative">
            <FishIcon className="mx-auto h-8 w-10 text-white/90" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">把不会的，一天一点变成会的</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/85">
              你的答题记录、错题本与掌握度都会自动保存在这里，随时回来继续。
            </p>
            <div className="mt-7 flex justify-center">
              <Link
                href="/practice?mode=smart"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-7 text-base font-semibold text-primary shadow-lg transition-transform hover:scale-[1.02]"
              >
                开始刷题 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            Made for <span className="text-amber">⭐</span>
            <span className="text-primary">🐟</span> · ACCA Master
          </p>
          <p className="text-center sm:text-right">
            内容为原创练习材料，非 ACCA 官方资料 · 请以当前 ACCA 官方 syllabus 与考试规则为准
          </p>
        </div>
      </footer>
    </div>
  );
}
