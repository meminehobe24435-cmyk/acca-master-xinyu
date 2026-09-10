"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Flag, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { REPORT_REASONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

interface ReportRow {
  id: string;
  status: string;
  reason: string;
  detail: string | null;
  createdAt: string;
  questionId: string;
  paperCode: string;
  questionText: string;
  username: string;
}

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/reports");
    if (res.ok) setRows((await res.json()).reports ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolve(id: string, status: "RESOLVED" | "REJECTED") {
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">题目反馈 Question Reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">用户报告：答案错误 / 题干错误 / 解析不清 / 内容过期</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Flag className="h-6 w-6" />} title="暂无用户反馈" description="题目质量良好，继续保持。" />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={r.status === "OPEN" ? "destructive" : "secondary"}>
                  {r.status === "OPEN" ? "待处理" : r.status === "RESOLVED" ? "已处理" : "已驳回"}
                </Badge>
                <Badge variant="default">{r.paperCode}</Badge>
                <Badge variant="outline">#{r.id.slice(-6)}</Badge>
                <span className="text-muted-foreground">
                  {REPORT_REASONS[r.reason] ?? r.reason} · {r.username} · {formatDateTime(r.createdAt)}
                </span>
              </div>
              <Link href={`/question/${r.questionId}`} className="mt-2 block">
                <p className="line-clamp-2 text-sm hover:text-primary">{plainText(r.questionText)}</p>
              </Link>
              {r.detail ? (
                <p className="mt-1.5 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">用户补充：{r.detail}</p>
              ) : null}
              {r.status === "OPEN" ? (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="success" onClick={() => resolve(r.id, "RESOLVED")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> 标记已处理
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(r.id, "REJECTED")}>
                    <XCircle className="h-3.5 w-3.5" /> 驳回（无问题）
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function plainText(md: string): string {
  return md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`|$-]/g, "").replace(/\s+/g, " ").trim();
}
