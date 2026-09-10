"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ListChecks, Loader2, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_META, QUESTION_TYPES, QUESTION_TYPE_LABELS } from "@/lib/constants";
import { FishIcon } from "@/components/brand/fish";
import type { PublicQuestion } from "@/lib/serializers";

interface MetaPaper { id: string; code: string; name: string; }

export default function QuestionBankPage() {
  const sp = useSearchParams();
  const [filters, setFilters] = useState({
    paper: sp.get("paper") ?? "",
    chapter: sp.get("chapter") ?? "",
    topic: "",
    kp: "",
    difficulty: "",
    type: "",
    done: "",
    wrong: "",
    favorite: "",
    q: "",
  });
  const [papers, setPapers] = useState<MetaPaper[]>([]);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/papers")
      .then((r) => r.json())
      .then((d) => setPapers(d.papers ?? []))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ ...filters, page: String(page) });
      Object.entries(filters).forEach(([k, v]) => {
        if (!v) params.delete(k);
      });
      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  // 重置页码
  const setFilter = (k: keyof typeof filters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  // 活跃筛选数量
  const activeCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">题库浏览 ⭐🐟</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            支持组合筛选：科目 / 章节 / 知识点 / 难度 / 题型 / 掌握状态
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setFilters({ paper: "", chapter: "", topic: "", kp: "", difficulty: "", type: "", done: "", wrong: "", favorite: "", q: "" }); setPage(1); }}>
          <RefreshCw className="h-3.5 w-3.5" /> 重置筛选
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          筛选器 {activeCount > 0 ? `（${activeCount} 项）` : ""}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索题干关键词…"
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filters.paper} onValueChange={(v) => setFilter("paper", v)}>
            <SelectTrigger><SelectValue placeholder="科目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部科目</SelectItem>
              {papers.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.difficulty} onValueChange={(v) => setFilter("difficulty", v)}>
            <SelectTrigger><SelectValue placeholder="难度" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部难度</SelectItem>
              {[1, 2, 3, 4, 5].map((d) => (
                <SelectItem key={d} value={String(d)}>{DIFFICULTY_META[d].label} {DIFFICULTY_META[d].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.type} onValueChange={(v) => setFilter("type", v)}>
            <SelectTrigger><SelectValue placeholder="题型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部题型</SelectItem>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.done} onValueChange={(v) => setFilter("done", v)}>
            <SelectTrigger><SelectValue placeholder="是否做过" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="true">做过</SelectItem>
              <SelectItem value="false">未做过</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.wrong} onValueChange={(v) => setFilter("wrong", v)}>
            <SelectTrigger><SelectValue placeholder="错题状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="true">仅错题</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.favorite} onValueChange={(v) => setFilter("favorite", v)}>
            <SelectTrigger><SelectValue placeholder="收藏状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="true">仅收藏</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            共 <span className="mx-1 font-semibold text-foreground">{total}</span> 题
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title={error} description="请稍后重试" className="border-destructive/20" />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<FishIcon className="h-6 w-8" />}
          title="这个筛选下暂时没有题目"
          description="试着放宽条件，或者直接去刷题 —— 系统会自动帮你挑合适的题 ⭐"
          action={
            <Link href="/practice" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              去刷几道题
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {questions.map((q) => (
              <Link
                key={q.id}
                href={`/question/${q.id}`}
                className="card-hover block rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="default" className="font-semibold">{q.meta.paperCode}</Badge>
                  {q.meta.variant ? <Badge variant="secondary">{q.meta.variant}</Badge> : null}
                  <Badge variant="outline">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                  <Badge className={DIFFICULTY_META[q.difficulty]?.className}>
                    {DIFFICULTY_META[q.difficulty]?.label}
                  </Badge>
                  <span className="text-muted-foreground">· {q.marks} 分</span>
                  {q.statuses.favorited ? <Badge variant="warning">★ 已收藏</Badge> : null}
                  {q.statuses.inWrongBook ? <Badge variant="destructive">错题 ×{q.statuses.wrongCount}</Badge> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6">{plainText(q.textMd)}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {q.meta.chapterTitle ?? ""}
                  {q.meta.knowledgePointTitle ? ` · ${q.meta.knowledgePointTitle}` : ""}
                  {q.meta.sourceName ? ` · ${q.meta.sourceName}` : ""}
                </p>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {page} 页 · 共 {Math.max(1, Math.ceil(total / 20))} 页
            </span>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
              下一页
            </Button>
          </div>
        </>
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
