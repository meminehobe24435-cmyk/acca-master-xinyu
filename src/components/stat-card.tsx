import * as React from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "default" | "primary" | "success" | "warning" | "violet" | "cyan" | "destructive";
}) {
  const accents: Record<string, string> = {
    default: "bg-secondary text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-amber/10 text-amber",
    violet: "bg-violet-500/10 text-violet-500",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      {icon ? (
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accents[accent])}>
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xl font-semibold tracking-tight">{value}</p>
        {sub ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}
