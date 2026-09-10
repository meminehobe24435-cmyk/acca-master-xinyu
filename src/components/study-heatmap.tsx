"use client";

import { cn } from "@/lib/utils";

/** GitHub 风格学习热力图（12 周） */
export function StudyHeatmap({
  data,
  className,
}: {
  data: { date: string; count: number }[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const colorOf = (count: number) => {
    if (count === 0) return "bg-secondary";
    const ratio = count / max;
    if (ratio > 0.75) return "bg-primary";
    if (ratio > 0.5) return "bg-primary/70";
    if (ratio > 0.25) return "bg-primary/40";
    return "bg-primary/20";
  };
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {data.map((d) => (
        <div
          key={d.date}
          title={`${d.date} · ${d.count} 题`}
          className={cn("h-2.5 w-2.5 rounded-[3px]", colorOf(d.count))}
        />
      ))}
    </div>
  );
}

export function StreakBadge({ streak }: { streak: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-rose-500/10 px-3 py-1 text-sm font-semibold text-orange-600 dark:text-orange-400"
      title="连续学习天数"
    >
      🔥 {streak} Days
    </span>
  );
}
