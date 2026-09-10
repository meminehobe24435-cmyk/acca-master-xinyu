"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Loader2, Target, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { FishIcon } from "@/components/brand/fish";
import { pick } from "@/lib/encourage";

interface PlanTask {
  id: string;
  date: string;
  type: string;
  title: string;
  paperCode: string | null;
  referenceId: string | null;
  targetCount: number;
  doneCount: number;
  source: string;
  completed: boolean;
}

export default function PlanPage() {
  const [plan, setPlan] = useState<{ targetDate: string; dailyGoal: number; dailyMinutes: number; daysPerWeek: number } | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ targetDate: "", dailyGoal: 30, dailyMinutes: 60, daysPerWeek: 5 });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/plan");
    if (res.ok) {
      const data = await res.json();
      setPlan(data.plan);
      setTasks(data.tasks ?? []);
      if (data.plan) {
        setForm({
          targetDate: data.plan.targetDate.slice(0, 10),
          dailyGoal: data.plan.dailyGoal,
          dailyMinutes: data.plan.dailyMinutes,
          daysPerWeek: data.plan.daysPerWeek,
        });
      }
      if (!data.plan) {
        const d = new Date();
        d.setDate(d.getDate() + 90);
        setForm((f) => ({ ...f, targetDate: d.toISOString().slice(0, 10) }));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "保存失败");
    } else {
      setMsg(`✅ 计划已保存，还剩 ${data.daysLeft} 天，已生成 ${data.taskCount} 项每日任务`);
      load();
    }
    setSaving(false);
  }

  async function toggleTask(id: string) {
    await fetch(`/api/plan/tasks/${id}`, { method: "POST" });
    load();
  }

  const daysLeft = plan ? Math.max(0, Math.ceil((new Date(plan.targetDate).getTime() - Date.now()) / 86400000)) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  // 按日期分组
  const byDate = new Map<string, PlanTask[]>();
  for (const t of tasks) {
    const key = t.date.slice(0, 10);
    byDate.set(key, [...(byDate.get(key) ?? []), t]);
  }
  const sortedDates = [...byDate.keys()].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">学习计划 ⭐🐟</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          设置考试日期与每日目标，系统自动生成每日任务。不用排得很满，能做完的计划才是好计划。
        </p>
      </div>

      {/* 倒计时 */}
      {daysLeft !== null ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="p-5 text-center">
              <p className="text-4xl font-bold tracking-tight gradient-text">{daysLeft}</p>
              <p className="mt-1 text-xs text-muted-foreground">距离考试</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(plan?.targetDate)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-4xl font-bold tabular-nums">{plan?.dailyGoal ?? "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">每日目标（题）</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-4xl font-bold tabular-nums">{plan?.dailyMinutes ?? "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">每日时长（分钟）</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-4xl font-bold tabular-nums">{tasks.filter((t) => t.completed).length}<span className="text-base text-muted-foreground">/{tasks.length}</span></p>
              <p className="mt-1 text-xs text-muted-foreground">已完成任务</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 设置表单 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> 计划设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="targetDate">考试日期</Label>
              <Input id="targetDate" type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>每日目标题数</Label>
                <Input type="number" min={5} max={200} value={form.dailyGoal} onChange={(e) => setForm({ ...form, dailyGoal: Number(e.target.value) || 30 })} />
              </div>
              <div className="space-y-1.5">
                <Label>每日时长（分钟）</Label>
                <Input type="number" min={10} max={600} value={form.dailyMinutes} onChange={(e) => setForm({ ...form, dailyMinutes: Number(e.target.value) || 60 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>每周学习天数</Label>
              <div className="flex gap-1.5">
                {[3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => setForm({ ...form, daysPerWeek: d })}
                    className={cn(
                      "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                      form.daysPerWeek === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {d} 天
                  </button>
                ))}
              </div>
            </div>
            {msg ? <p className={cn("rounded-lg px-3 py-2 text-sm", msg.startsWith("✅") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>{msg}</p> : null}
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              保存并生成任务
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              任务按「薄弱章节优先」生成未来 14 天；提交答题后任务进度自动更新（今日任务可在 Dashboard 查看）。
            </p>
          </CardContent>
        </Card>

        {/* 任务日历 */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight">
            <CalendarDays className="h-4 w-4 text-violet-500" /> 任务日历（未来 14 天）
          </h2>
          {sortedDates.length === 0 ? (
            <EmptyState
              icon={<FishIcon className="h-6 w-8" />}
              title={pick("emptyPlan")}
              description="填上考试日期和每天能做多少题，系统会按剩下的日子慢慢排，只安排真正做得完的量 ⭐"
            />
          ) : (
            <div className="space-y-3">
              {sortedDates.map((date) => {
                const dayTasks = byDate.get(date) ?? [];
                const done = dayTasks.filter((t) => t.completed).length;
                const isToday = date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={date} className={cn("rounded-xl border p-4", isToday ? "border-primary/40 bg-primary/5" : "bg-card shadow-sm")}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {date}
                        {isToday ? <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">今天</span> : null}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        <Timer className="mr-1 inline h-3 w-3" />
                        {done}/{dayTasks.length} 完成
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {dayTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-3 py-2">
                          <button
                            onClick={() => toggleTask(t.id)}
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                              t.completed ? "border-success bg-success text-success-foreground" : "border-muted-foreground/40 hover:border-success"
                            )}
                            aria-label="切换完成状态"
                          >
                            {t.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                          </button>
                          <span className={cn("min-w-0 flex-1 truncate text-sm", t.completed && "text-muted-foreground line-through")}>
                            {t.title}
                          </span>
                          {t.paperCode ? (
                            <Link href={`/practice?chapter=${encodeURIComponent(t.referenceId ?? "")}`} className="shrink-0 text-[11px] text-primary hover:underline">
                              练习
                            </Link>
                          ) : (
                            <Link href="/practice?mode=mistakes" className="shrink-0 text-[11px] text-primary hover:underline">
                              复习
                            </Link>
                          )}
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {t.doneCount}/{t.targetCount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
        <TrendingUp className="h-4 w-4 text-primary" />
        提示：完成计划需要长期坚持。系统会根据你的掌握度动态生成薄弱章节练习建议，详见 Dashboard「今日建议」。
      </div>
    </div>
  );
}
