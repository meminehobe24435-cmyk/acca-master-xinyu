"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, LayoutDashboard, ListChecks, LogOut, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "概览", icon: LayoutDashboard, exact: true },
  { href: "/admin/questions", label: "题库管理", icon: ListChecks },
  { href: "/admin/import", label: "批量导入", icon: Upload },
  { href: "/admin/generate", label: "AI 生成", icon: Sparkles },
  { href: "/admin/review", label: "审核队列", icon: ShieldCheck },
  { href: "/admin/reports", label: "题目反馈", icon: Flag },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <div className="mr-2 min-w-0">
        <h1 className="text-xl font-bold tracking-tight">管理后台 Admin Dashboard</h1>
        <p className="truncate text-xs text-muted-foreground">题库管理 · 批量导入 · AI 生成与审核</p>
      </div>
      <nav className="ml-auto flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5 shadow-sm scrollbar-thin">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
        <button
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            window.location.href = "/dashboard";
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          退出
        </button>
      </nav>
    </div>
  );
}
