"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, ListChecks, Upload, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => undefined);
  }, []);

  if (!stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  const cards = [
    { label: "题目总数", value: stats.questions, sub: `已发布 ${stats.published} · 草稿 ${stats.drafts}`, href: "/admin/questions" },
    { label: "科目数", value: stats.papers, sub: "ACCA 全科目", href: "/admin/questions" },
    { label: "知识点数", value: stats.kpsCount, sub: "知识树全量", href: "/papers" },
    { label: "今日新增", value: stats.todayNew, sub: "今日新入库题目", href: "/admin/questions" },
    { label: "待审核", value: stats.drafts, sub: "draft + ai_reviewed", href: "/admin/review" },
    { label: "用户数", value: stats.users, sub: "注册用户", href: "/admin" },
    { label: "答题次数", value: stats.attempts, sub: "累计提交", href: "/admin" },
    { label: "待处理反馈", value: stats.reports, sub: "Question Reports", href: "/admin/reports" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card-hover rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="mt-1 text-sm font-medium">{c.label}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/import" className="card-hover rounded-xl border border-dashed p-6 text-center">
          <Upload className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-sm font-semibold">批量导入题目</p>
          <p className="mt-1 text-xs text-muted-foreground">Excel / CSV / JSON，解析预览后入库</p>
        </Link>
        <Link href="/admin/generate" className="card-hover rounded-xl border border-dashed p-6 text-center">
          <ListChecks className="mx-auto h-6 w-6 text-violet-500" />
          <p className="mt-2 text-sm font-semibold">AI 批量生成</p>
          <p className="mt-1 text-xs text-muted-foreground">按知识点生成原创题，进入审核队列</p>
        </Link>
        <Link href="/admin/reports" className="card-hover rounded-xl border border-dashed p-6 text-center">
          <Flag className="mx-auto h-6 w-6 text-amber" />
          <p className="mt-2 text-sm font-semibold">用户反馈</p>
          <p className="mt-1 text-xs text-muted-foreground">处理题目报告（答案异议 / 题干错误）</p>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        AI 审核状态分布：AI 已审 {stats.aiReviewed} · 人工已审 {stats.humanReviewed} · 导入批次 {stats.batches}
      </p>
    </div>
  );
}
