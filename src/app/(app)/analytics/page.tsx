"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileText, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { StudyHeatmap } from "@/components/study-heatmap";
import { ERROR_CATEGORIES, MASTERY_LEVELS } from "@/lib/constants";
import { formatDuration, cn } from "@/lib/utils";
import { FishIcon } from "@/components/brand/fish";
import { pick } from "@/lib/encourage";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalyticsData {
  metrics: {
    attempts: number; correct: number; wrong: number; accuracy: number; avgTimeSec: number;
    studySeconds: number; streak: number; masteredKps: number; weakKps: number; developingKps: number;
    totalKps: number; wrongActive: number; wrongMastered: number; fixRate: number; newWrongThisWeek: number; favorites: number;
  };
  daily: { date: string; attempts: number; accuracy: number; seconds: number }[];
  paperStats: { code: string; attempts: number; accuracy: number }[];
  heatmap: { date: string; count: number }[];
  categories: { category: string; count: number }[];
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/analytics?period=${period}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  async function genReport() {
    setReportLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const d = await res.json();
      if (res.ok) setReport(d.report);
      else setReport(`⚠️ ${d.message ?? d.error ?? "生成失败"}`);
    } catch {
      setReport("⚠️ 网络错误");
    } finally {
      setReportLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const m = data.metrics;
  const dailyLabeled = data.daily.map((d) => ({ label: d.date.slice(5), ...d }));
  const daysLabel = period === "all" ? "全部" : `近 ${period} 天`;

  const tc = data.categories.map((c) => ({ name: ERROR_CATEGORIES[c.category]?.label ?? c.category, value: c.count }));
  const tcMax = Math.max(1, ...tc.map((c) => c.value));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">学习统计 Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">{daysLabel} 数据 · 掌握度算法综合正确率、最近表现、难度、重复次数与答题时间</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="7">7 天</TabsTrigger>
              <TabsTrigger value="30">30 天</TabsTrigger>
              <TabsTrigger value="all">全部</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={genReport} disabled={reportLoading}>
            {reportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            AI 学习报告
          </Button>
        </div>
      </div>

      {report ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm leading-7">
          <p className="mb-2 flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> 本周学习报告
          </p>
          <pre className="whitespace-pre-wrap font-sans">{report}</pre>
        </div>
      ) : null}

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="完成题数" value={m.attempts} sub="本周期" icon={<TrendingUp className="h-5 w-5" />} accent="primary" />
        <StatCard label="正确率" value={`${m.accuracy}%`} sub={`${m.correct} 对 / ${m.wrong} 错`} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        <StatCard label="平均答题时间" value={formatDuration(m.avgTimeSec)} sub="每题" icon={<TrendingUp className="h-5 w-5" />} accent="violet" />
        <StatCard label="总学习时间" value={formatDuration(m.studySeconds)} sub={`连续 ${m.streak} 天`} icon={<TrendingUp className="h-5 w-5" />} accent="warning" />
        <StatCard label="熟练知识点" value={`${m.masteredKps}`} sub={`掌握度 ≥ 80（共 ${m.totalKps}）`} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        <StatCard label="薄弱知识点" value={`${m.weakKps}`} sub={`掌握度 < 40 · 待加强 ${m.developingKps}`} icon={<TrendingUp className="h-5 w-5" />} accent="destructive" />
        <StatCard label="错题修复率" value={`${m.fixRate}%`} sub={`新增 ${m.newWrongThisWeek} · 已掌握 ${m.wrongMastered}`} icon={<TrendingUp className="h-5 w-5" />} accent="primary" />
        <StatCard label="收藏" value={m.favorites} sub="题目收藏数" icon={<TrendingUp className="h-5 w-5" />} accent="default" />
      </div>

      {/* 趋势图 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">每日刷题数</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyLabeled} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}
                  formatter={(v: number) => [`${v} 题`, "刷题"]}
                />
                <Area type="monotone" dataKey="attempts" stroke="#6366f1" strokeWidth={2} fill="url(#gq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">每日正确率（%）</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyLabeled} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}
                  formatter={(v: number) => [`${v}%`, "正确率"]}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 热力图 */}
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">过去 12 周学习热力图</h2>
          <div className="overflow-x-auto pb-1 scrollbar-thin">
            <StudyHeatmap data={data.heatmap.slice(-84)} className="min-w-max" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">科目表现（本周期）</p>
              {data.paperStats.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {data.paperStats.map((p) => (
                    <div key={p.code} className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="w-10 justify-center">{p.code}</Badge>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${p.accuracy}%` }} />
                      </div>
                      <span className="w-10 text-right tabular-nums">{p.accuracy}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">错题原因分布</p>
              {tc.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无错题</p>
              ) : (
                <div className="space-y-1.5">
                  {tc.sort((a, b) => b.value - a.value).slice(0, 6).map((c) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="w-16 truncate">{c.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn("h-full rounded-full", c.value / tcMax > 0.6 ? "bg-rose-500" : c.value / tcMax > 0.3 ? "bg-amber-500" : "bg-blue-500")}
                          style={{ width: `${(c.value / tcMax) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums">{c.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 掌握度分布 */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">知识点掌握度分布</h2>
          <div className="space-y-4">
            {MASTERY_LEVELS.map((l) => {
              const count =
                l.label === "薄弱" ? m.weakKps
                : l.label === "待加强" ? m.developingKps
                : l.label === "掌握" ? Math.max(0, m.totalKps - m.weakKps - m.developingKps - m.masteredKps)
                : m.masteredKps;
              const p = m.totalKps ? (count / m.totalKps) * 100 : 0;
              const colors: Record<string, string> = {
                薄弱: "bg-rose-500", 待加强: "bg-amber-500", 掌握: "bg-blue-500", 熟练: "bg-emerald-500",
              };
              return (
                <div key={l.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className={l.color}>{l.label} {l.en}</span>
                    <span className="tabular-nums text-muted-foreground">{count} 个 · {Math.round(p)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full rounded-full", colors[l.label])} style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {m.weakKps > 0 ? (
            <Button asChild className="mt-5 w-full" size="sm">
              <a href="/practice?mode=smart">针对薄弱点强化练习</a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* 空状态兜底 */}
      {m.attempts === 0 ? (
        <EmptyState
          icon={<FishIcon className="h-6 w-8" />}
          title={pick("emptyAnalytics")}
          description="做几道题之后，这里会慢慢长出你的趋势、掌握度分布与错题修复情况 ⭐"
        />
      ) : null}
    </div>
  );
}
