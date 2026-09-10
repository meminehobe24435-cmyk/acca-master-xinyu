import { cn } from "@/lib/utils";
import { StarGlyph } from "@/components/brand/fish";
import { Progress } from "@/components/ui/progress";
import { masteryLevel } from "@/lib/constants";

/** 掌握度星级：保留百分比，星级只是辅助观感（不替代专业数据） */
export function StarMeter({ score, className }: { score: number; className?: string }) {
  const stars = Math.max(0, Math.min(5, Math.round((score / 100) * 5)));
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`掌握度 ${score} 分（${stars}/5 星）`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <StarGlyph
          key={i}
          filled={i <= stars}
          className={cn(i <= stars ? "text-amber" : "text-muted-foreground/50")}
        />
      ))}
    </span>
  );
}

export function MasteryBar({
  score,
  showLabel = true,
  showStars = true,
  className,
  barClassName,
}: {
  score: number;
  showLabel?: boolean;
  showStars?: boolean;
  className?: string;
  barClassName?: string;
}) {
  const level = masteryLevel(score);
  const colorMap: Record<string, string> = {
    薄弱: "bg-gradient-to-r from-rose-400 to-rose-500",
    待加强: "bg-gradient-to-r from-amber-400 to-amber-500",
    掌握: "bg-gradient-to-r from-sky-400 to-indigo-500",
    熟练: "bg-gradient-to-r from-emerald-400 to-teal-500",
  };
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress value={score} className="h-1.5 flex-1" indicatorClassName={cn(colorMap[level.label], barClassName)} />
      {showLabel ? (
        <span className={cn("w-11 shrink-0 text-right text-xs font-semibold tabular-nums", level.color)}>
          {score}
          <span className="ml-1 hidden text-[10px] font-normal sm:inline">{level.label}</span>
        </span>
      ) : null}
      {showStars ? <StarMeter score={score} className="hidden shrink-0 sm:inline-flex" /> : null}
    </div>
  );
}
