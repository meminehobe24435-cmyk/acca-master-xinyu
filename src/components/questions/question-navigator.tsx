"use client";

import { cn } from "@/lib/utils";

export function QuestionNavigator({
  total,
  current,
  answered,
  onJump,
}: {
  total: number;
  current: number;
  answered: (number | null)[];
  onJump: (i: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">题目导航</p>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: total }, (_, i) => {
          const state = answered[i];
          const isCurrent = i === current;
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md border text-xs font-medium tabular-nums transition-all",
                isCurrent
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : state === 1
                    ? "border-success/50 bg-success/10 text-success"
                    : state === 0
                      ? "border-destructive/40 bg-destructive/5 text-destructive/70"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
              aria-label={`第 ${i + 1} 题`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-success/60" /> 答对</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-destructive/50" /> 答错</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-border" /> 未答</span>
      </div>
    </div>
  );
}

export function SessionTimer({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    <span className="font-mono tabular-nums">
      {h > 0 ? `${String(h).padStart(2, "0")}:` : ""}
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
