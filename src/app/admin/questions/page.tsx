"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUESTION_STATUS, QUESTION_TYPE_LABELS, DIFFICULTY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  paperCode: string;
  type: string;
  difficulty: number;
  status: string;
  reviewStatus: string | null;
  sourceType: string;
  marks: number;
  attemptCount: number;
  reportCount: number;
  kpTitle: string;
  textMd: string;
  updatedAt: string;
}

export default function AdminQuestionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [paper, setPaper] = useState("");
  const [papers, setPapers] = useState<{ id: string; code: string }[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status, paper, q });
    const res = await fetch(`/api/admin/questions?${params.toString()}`);
    if (res.ok) {
      const d = await res.json();
      setRows(d.questions ?? []);
      setTotal(d.total ?? 0);
    }
    setLoading(false);
  }, [page, status, paper, q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/papers").then((r) => r.json()).then((d) => setPapers((d.papers ?? []).map((p: { id: string; code: string }) => ({ id: p.id, code: p.code })))).catch(() => undefined);
  }, []);

  async function batch(action: "publish" | "archive" | "delete") {
    if (selected.size === 0) return;
    setBusy(true);
    if (action === "delete") {
      for (const id of selected) await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    } else {
      for (const id of selected) {
        await fetch(`/api/admin/questions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action === "publish" ? "published" : "archived", reviewStatus: action === "publish" ? "human_reviewed" : "archived" }),
        });
      }
    }
    setSelected(new Set());
    setBusy(false);
    load();
  }

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="搜索题干…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            {Object.keys(QUESTION_STATUS).map((s) => (
              <SelectItem key={s} value={s}>{QUESTION_STATUS[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paper} onValueChange={(v) => { setPaper(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="科目" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部科目</SelectItem>
            {papers.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>刷新</Button>
        <Link href="/admin/questions/new" className="ml-auto">
          <Button size="sm"><Plus className="h-4 w-4" /> 新增题目</Button>
        </Link>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="font-medium">已选 {selected.size} 题</span>
          <Button size="sm" variant="success" disabled={busy} onClick={() => batch("publish")}>批量发布</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => batch("archive")}>批量归档</Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => batch("delete")}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} 批量删除
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} aria-label="全选" />
                </th>
                <th className="px-3 py-2.5">题目</th>
                <th className="w-20 px-3 py-2.5">科目</th>
                <th className="w-24 px-3 py-2.5">题型</th>
                <th className="w-20 px-3 py-2.5">难度</th>
                <th className="w-24 px-3 py-2.5">状态</th>
                <th className="w-28 px-3 py-2.5">来源</th>
                <th className="w-24 px-3 py-2.5">数据</th>
                <th className="w-16 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30">
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`选择 ${r.id}`} />
                  </td>
                  <td className="max-w-md px-3 py-2.5">
                    <p className="line-clamp-1">{plainText(r.textMd)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.kpTitle}</p>
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{r.paperCode}</td>
                  <td className="px-3 py-2.5 text-xs">{QUESTION_TYPE_LABELS[r.type]}</td>
                  <td className="px-3 py-2.5 text-xs">{DIFFICULTY_META[r.difficulty]?.label}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={r.status === "published" ? "success" : r.status === "archived" ? "secondary" : "warning"} className="text-[10px]">
                      {QUESTION_STATUS[r.status]?.label ?? r.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{r.sourceType}</td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                    {r.attemptCount} 次答题{(r.reportCount > 0 ? ` · ⚠${r.reportCount}` : "")}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/questions/${r.id}`} className="text-primary hover:underline">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">没有符合条件的题目</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 text-sm">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
        <span className="text-muted-foreground">{page} / {Math.max(1, Math.ceil(total / 25))}（共 {total}）</span>
        <Button variant="outline" size="sm" disabled={page * 25 >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
      </div>
    </div>
  );
}

function plainText(md: string): string {
  return md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`|$-]/g, "").replace(/\s+/g, " ").trim();
}
