"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewRow {
  id: string;
  paperCode: string;
  type: string;
  difficulty: number;
  status: string;
  reviewStatus: string | null;
  textMd: string;
  kpTitle: string;
  attemptCount: number;
}

export default function AdminReviewPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<string, { ok: boolean; issues: string[] }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/questions?status=draft");
    if (res.ok) {
      const d = await res.json();
      // 加上 ai_reviewed 状态
      const res2 = await fetch("/api/admin/questions?status=ai_reviewed");
      const d2 = res2.ok ? await res2.json() : { questions: [] };
      setRows([...(d.questions ?? []), ...(d2.questions ?? [])]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function aiReview() {
    const ids = selected.size ? [...selected] : rows.map((r) => r.id).slice(0, 30);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/generate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error === "AI_NOT_CONFIGURED" ? "AI 未配置，无法进行 AI 审核（仍可人工发布）" : "审核失败");
      } else {
        const map: Record<string, { ok: boolean; issues: string[] }> = {};
        for (const r of d.results ?? []) map[r.id] = { ok: r.ok, issues: r.issues };
        setResults(map);
      }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewStatus: status === "published" ? "human_reviewed" : status }),
    });
    load();
  }

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">审核队列</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            草稿 / AI 已审题目：第二轮 AI 校验（题干清晰、答案唯一、计算正确、解析合理）+ 人工 Accept / Edit / Reject
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set(rows.map((r) => r.id)))}>全选</Button>
          <Button size="sm" onClick={aiReview} disabled={busy || rows.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            AI 批量审核（{selected.size || rows.slice(0, 30).length} 题）
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm font-medium">审核队列已清空 🎉</p>
          <p className="mt-1 text-xs text-muted-foreground">前往「AI 生成」或「批量导入」创建新题目。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const review = results[r.id];
            return (
              <div key={r.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label="选择" />
                  <Badge variant="default">{r.paperCode}</Badge>
                  <Badge variant="secondary">{r.type}</Badge>
                  <Badge variant="outline">难度 {r.difficulty}</Badge>
                  <Badge variant="warning">{r.status === "ai_reviewed" ? "AI 已审" : "草稿"}</Badge>
                  {review ? (
                    review.ok ? (
                      <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> AI 通过</Badge>
                    ) : (
                      <Badge variant="destructive"><XCircle className="h-3 w-3" /> AI 发现 {review.issues.length} 个问题</Badge>
                    )
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm">{plainText(r.textMd)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.kpTitle || "未绑定知识点"}</p>
                {review && !review.ok ? (
                  <p className="mt-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {review.issues.join("；")}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="success" onClick={() => setStatus(r.id, "published")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Accept 发布
                  </Button>
                  <Link href={`/admin/questions/${r.id}`}>
                    <Button size="sm" variant="outline">Edit 编辑</Button>
                  </Link>
                  <Button size="sm" variant="destructive" onClick={() => setStatus(r.id, "archived")}>
                    <XCircle className="h-3.5 w-3.5" /> Reject 驳回
                  </Button>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {r.attemptCount} 次答题 · 来源 {r.status === "ai_reviewed" ? "seed/import" : "draft"}
                  </span>
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
  return md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`|$-]/g, "").replace(/\s+/g, " ").trim();
}
