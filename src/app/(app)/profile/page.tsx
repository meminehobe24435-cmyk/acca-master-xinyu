"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Download, Loader2, Moon, ShieldCheck, Settings2, Sun, Fish } from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FishIcon, SparkIcon } from "@/components/brand/fish";
import { pick } from "@/lib/encourage";

interface Me {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: string;
  examDate: string | null;
  dailyGoal: number;
  streakCount: number;
  totalStudyMinutes: number;
}

interface AchievementRow {
  code: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [me, setMe] = useState<Me | null>(null);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ displayName: "", examDate: "", dailyGoal: 30 });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const d = await res.json();
          if (d.user) {
            setMe(d.user);
            setForm({
              displayName: d.user.displayName ?? d.user.username,
              examDate: d.user.examDate ? d.user.examDate.slice(0, 10) : "",
              dailyGoal: d.user.dailyGoal,
            });
          }
        }
        const ares = await fetch("/api/achievements");
        if (ares.ok) setAchievements((await ares.json()).achievements ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        examDate: form.examDate || null,
        dailyGoal: Number(form.dailyGoal) || 30,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "✅ 已保存" : `⚠️ ${d.error ?? "保存失败"}`);
    setSaving(false);
  }

  if (loading || !me) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的 ⭐🐟</h1>
          <p className="mt-1 text-sm text-muted-foreground">学习数据、外观与导出设置</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <FishIcon className="h-3.5 w-4" /> 单用户模式 · 无需登录
        </Badge>
      </div>

      {msg ? (
        <p className={cn("rounded-xl px-3 py-2 text-sm", msg.startsWith("✅") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
          {msg}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 学习者信息 */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" /> 学习者信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-cyan-500 text-white shadow-lg">
                <SparkIcon className="absolute -right-1 -top-1 h-4 w-4 text-amber" />
                <FishIcon className="h-7 w-9" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold">{me.displayName ?? me.username}</p>
                <p className="text-xs text-muted-foreground">本地学习者 · 数据只保存在这台设备/本部署中</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  连续学习 {me.streakCount} 天
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-xl font-bold tabular-nums">{me.streakCount} 天</p>
                <p className="text-[11px] text-muted-foreground">连续学习</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-xl font-bold tabular-nums">{Math.round(me.totalStudyMinutes / 60)} 小时</p>
                <p className="text-[11px] text-muted-foreground">累计学习</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>昵称（显示在首页问候里）</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>考试日期</Label>
                <Input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>每日目标（题）</Label>
                <Input
                  type="number"
                  min={5}
                  max={200}
                  value={form.dailyGoal}
                  onChange={(e) => setForm({ ...form, dailyGoal: Number(e.target.value) || 30 })}
                />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} 保存设置
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* 外观 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                外观
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>主题</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "light", label: "Light" },
                    { v: "dark", label: "Dark" },
                    { v: "system", label: "跟随系统" },
                  ].map((t) => (
                    <button
                      key={t.v}
                      onClick={() => setTheme(t.v)}
                      className={cn(
                        "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                        theme === t.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="rounded-xl bg-secondary/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {pick("brand")}
              </p>
            </CardContent>
          </Card>

          {/* 数据导出 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" /> 数据导出
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: "mistakes", label: "错题 CSV" },
                  { type: "favorites", label: "收藏 CSV" },
                  { type: "notes", label: "笔记 CSV" },
                  { type: "attempts", label: "学习记录 CSV" },
                ].map((e) => (
                  <a
                    key={e.type}
                    href={`/api/export?type=${e.type}`}
                    download
                    className="flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <Download className="h-3.5 w-3.5" /> {e.label}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                学习数据保存在服务端数据库中，刷新、关闭浏览器或重新部署都不会丢失（部署平台需配置持久数据库）。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 成就 */}
      <Card id="achievements">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber" /> 成就
            <Badge variant="secondary">
              {unlockedCount}/{achievements.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {achievements.map((a) => (
              <div
                key={a.code}
                className={cn(
                  "rounded-2xl border p-4 text-center transition-all",
                  a.unlocked ? "border-amber/40 bg-gradient-to-b from-amber/5 to-transparent" : "border-border opacity-55"
                )}
              >
                <p className={cn("text-2xl", a.unlocked ? "" : "grayscale")}>{iconEmoji(a.icon)}</p>
                <p className="mt-2 text-sm font-semibold">{a.name}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{a.description}</p>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {a.unlocked ? `解锁于 ${a.unlockedAt?.slice(0, 10) ?? "—"}` : "未解锁"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 管理员入口 */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber/10 text-amber">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">管理后台</p>
              <p className="text-xs text-muted-foreground">
                题库管理、批量导入与 AI 生成，使用独立管理员口令保护（不放在前端）。
              </p>
            </div>
          </div>
          <Link href="/admin">
            <Button variant="outline">进入管理后台</Button>
          </Link>
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-muted-foreground">
        <Fish className="h-3 w-3" /> Made for <span className="text-amber">⭐</span>
        <span className="text-primary">🐟</span>
      </p>
    </div>
  );
}

function iconEmoji(icon: string): string {
  const map: Record<string, string> = {
    Play: "▶️",
    ListChecks: "📋",
    Medal: "🥇",
    Flame: "🔥",
    Award: "🏆",
    Crosshair: "🎯",
    GraduationCap: "🎓",
    Trophy: "🏆",
    Timer: "⏱️",
  };
  return map[icon] ?? "🎖️";
}
