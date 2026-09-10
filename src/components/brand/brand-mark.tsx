import Link from "next/link";
import { cn } from "@/lib/utils";
import { FishIcon, SparkIcon } from "@/components/brand/fish";

/** 品牌标识：⭐🐟 ACCA Master */
export function BrandMark({
  size = "md",
  href = "/dashboard",
  showTagline = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  showTagline?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: { box: "h-8 w-8 text-[13px]", title: "text-base" },
    md: { box: "h-10 w-10 text-sm", title: "text-lg" },
    lg: { box: "h-14 w-14 text-lg", title: "text-2xl" },
  }[size];

  const content = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-cyan-500 text-white shadow-sm shadow-primary/25",
          sizes.box
        )}
      >
        <SparkIcon className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber drop-shadow" />
        <FishIcon className="h-[55%] w-[55%] text-white" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className={cn("block font-bold leading-tight tracking-tight", sizes.title)}>
          ACCA <span className="gradient-text">Master</span>
        </span>
        {showTagline ? (
          <span className="block text-[11px] text-muted-foreground">⭐🐟 专属学习空间</span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}

/** 极简页脚：小而精致 */
export function BrandFooter({ className }: { className?: string }) {
  return (
    <p className={cn("no-print py-6 text-center text-[11px] text-muted-foreground/80", className)}>
      Made for <span className="text-amber">⭐</span>
      <span className="text-primary">🐟</span> · 慢慢来，比较快
    </p>
  );
}
