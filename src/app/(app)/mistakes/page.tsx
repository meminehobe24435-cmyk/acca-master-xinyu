"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, CheckCircle2, ChevronRight, Loader2, RefreshCw, RotateCcw, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ERROR_CATEGORIES, DIFFICULTY_META, SRS_STAGES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { Bubbles, FishIcon } from "@/components/brand/fish";
import { pick } from "@/lib/encourage";

interface WrongItem {
  id: string;
  questionId: string;
  firstWrongAt: string;
  lastWrongAt: string;
  wrongCount: number;
  stage: number;
  nextReviewAt: string;
  errorCategory: string | null;
  userLabel: string | null;
  mastered: boolean;
  question: { paperCode: string; paperName: string; textMd: string; difficulty: number; kpTitle: string | null };
}

export default function MistakesPage() {
  const [tab, setTab] = useState("active");
  const [category, setCategory] = useState("");
  const [paper, setPaper] = useState("");
  const [items, setItems] = useState<WrongItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; active: number; mastered: number; due: number }>({
    total: 0, active: 0, mastered: 0, due: 0,
  });
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<{ id: string; code: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: tab });
    if (category) params.set("category", category);
    if (paper) params.set("paper", paper);
    const res = await fetch(`/api/mistakes?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.wrongs ?? []);
      setMeta({ total: data.total, active: data.active, mastered: data.mastered, due: data.due });
    }
    setLoading(false);
  }, [tab, category, paper]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/papers").then((r) => r.json()).then((d) => setPapers(d.papers ?? [])).catch(() => undefined);
  }, []);

  async function act(id: string, action: string, extra?: Record<string, string>) {
    await fetch(`/api/mistakes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    load();
  }

  const effectiveItems = items;

  return (
    <div className="space-y-6">
      {/* ⭐🐟 温柔标题：错题不是失败 */}
      <div className="soft-aurora relative overflow-hidden rounded-2xl border bg-card/70 p-5 shadow-sm">
        <Bubbles count={4} />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">⭐🐟 的错题本</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              错题不是扣掉的分数，是提前发现的漏洞。
              <br className="hidden sm:block" />
              这里收藏的不是失败，而是那些已经被你发现的薄弱点。
            </p>
          </div>
          <Link href="/practice?mode=mistakes">
            <Button><RotateCcw className="h-4 w-4" /> 复习到期错题（{meta.due}）</Button>
          </Link>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "累计错题", value: meta.total, cls: "text-foreground" },
          { label: "待复习", value: meta.active, cls: "text-amber-500" },
          { label: "已掌握", value: meta.mastered, cls: "text-emerald-500" },
          { label: "今日到期", value: meta.due, cls: "text-rose-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <p className={cn("text-2xl font-bold tabular-nums", s.cls)}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">待复习</TabsTrigger>
            <TabsTrigger value="mastered">已掌握</TabsTrigger>
            <TabsTrigger value="all">全部</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={paper} onValueChange={setPaper}>
          <SelectTrigger className="w-44"><SelectValue placeholder="全部科目" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部科目</SelectItem>
            {papers.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="错误原因" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部原因</SelectItem>
            {Object.entries(ERROR_CATEGORIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => { setCategory(""); setPaper(""); }}>
          <RefreshCw className="h-3.5 w-3.5" /> 重置
        </Button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : effectiveItems.length === 0 ? (
        tab === "active" ? (
          <EmptyState
            icon={<FishIcon className="h-6 w-8" />}
            title={pick("emptyMistakes")}
            description="这里没有需要复习的错题。做错的题会自动保存，并按 1 → 3 → 7 → 14 → 30 天提醒你回来看。"
            action={
              <Link href="/practice" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                去刷几道题
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={<BookOpenCheck className="h-6 w-6" />}
            title="这个筛选下还没有内容"
            description="换一个科目或错误原因看看，或者去刷题生成新的记录 ⭐"
          />
        )
      ) : (
        <div className="space-y-3">
          {effectiveItems.map((w) => {
            const due = new Date(w.nextReviewAt).getTime() <= Date.now();
            return (
              <div key={w.id} className={cn("rounded-xl border bg-card p-4 shadow-sm", w.mastered && "opacity-70")}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="default">{w.question.paperCode}</Badge>
                  <Badge className={DIFFICULTY_META[w.question.difficulty]?.className}>
                    难度 {DIFFICULTY_META[w.question.difficulty]?.label}
                  </Badge>
                  <Badge variant={w.mastered ? "success" : "destructive"}>
                    {w.mastered ? "已掌握" : "待复习"}
                  </Badge>
                  <Badge variant="warning">错 {w.wrongCount} 次</Badge>
                  <span className="text-muted-foreground">
                    首次 {formatDate(w.firstWrongAt)} · 最近 {formatDate(w.lastWrongAt)}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    <Select
                      value={w.errorCategory ?? ""}
                      onValueChange={(v) => act(w.id, "category", { category: v })}
                    >
                      <SelectTrigger className="h-6 w-28 border-0 bg-secondary/50 px-2 text-[11px]">
                        <SelectValue placeholder="未归类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">未归类</SelectItem>
                        {Object.entries(ERROR_CATEGORIES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </span>
                </div>
                <Link href={`/question/${w.questionId}`} className="group mt-2.5 block">
                  <p className="line-clamp-2 text-sm font-medium leading-6 group-hover:text-primary">
                    {plainText(w.question.textMd)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {w.question.kpTitle ?? w.question.paperName}
                  </p>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* 间隔重复进度 */}
                  <div className="flex items-center gap-1">
                    {SRS_STAGES.map((d, i) => (
                      <span
                        key={d}
                        title={`第 ${i} 阶段 · ${d} 天后复习`}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          i <= w.stage ? (w.mastered ? "bg-emerald-500" : "bg-primary") : "bg-secondary"
                        )}
                      />
                    ))}
                    <span className="ml-1.5 text-[11px] text-muted-foreground">
                      阶段 {w.stage + 1}/6 · 下次复习 {formatDate(w.nextReviewAt)} {due ? "（已到期）" : ""}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {!w.mastered ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => act(w.id, "master")}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> 标记已掌握
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => act(w.id, "unmaster")}>
                        <RotateCcw className="h-3.5 w-3.5" /> 恢复复习
                      </Button>
                    )}
                    <Link href={`/question/${w.questionId}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
                        查看题目 <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
