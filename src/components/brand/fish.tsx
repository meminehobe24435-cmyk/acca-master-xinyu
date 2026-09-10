import { cn } from "@/lib/utils";

/**
 * 原创极简小鱼图标（自绘 SVG，无任何第三方素材版权问题）
 * 线条简洁、体量小、可爱但不幼稚。
 */
export function FishIcon({
  className,
  filled = false,
  strokeWidth = 1.6,
}: {
  className?: string;
  filled?: boolean;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      {/* 身体 */}
      <path
        d="M4 12.6c3.1-4.3 7.5-6.5 12.2-6.5 4.2 0 8 1.9 10.5 4.9-2.4 3.4-5.9 5.6-10.2 5.9C11.6 17.2 7.2 15.6 4 12.6Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* 尾巴 */}
      <path
        d="M22.4 15.9c1.9.9 3.6 2.3 5 4.2-.6-2.6-.7-5.2-.2-7.8 1.1 1.6 2.4 2.9 4 3.9-2.6.6-5 1.6-7.1 2.9"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 眼睛 */}
      <circle cx="9.1" cy="11.7" r="1.05" fill={filled ? "var(--background)" : "currentColor"} />
      {/* 水纹 */}
      <path d="M6.5 20.6c1.7.8 3.4 1.2 5.2 1.2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** 四角星（原创，用于点缀） */
export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4", className)} aria-hidden="true">
      <path
        d="M12 2.6l1.7 6.1 6.1 1.7-6.1 1.7L12 18.2l-1.7-6.1L4.2 10.4l6.1-1.7L12 2.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** 五角星（可点亮，用于掌握度可视化） */
export function StarGlyph({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-3.5 w-3.5", className)} aria-hidden="true">
      <path
        d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1L3.2 9.6l6.1-.8L12 3.2Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.4}
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.45}
      />
    </svg>
  );
}

/** 柔和气泡装饰（纯 CSS/SVG，密度可控） */
export function Bubbles({ className, count = 5 }: { className?: string; count?: number }) {
  const positions = [
    { left: "6%", size: 10, delay: "0s", top: "62%" },
    { left: "18%", size: 6, delay: "1.2s", top: "78%" },
    { left: "34%", size: 8, delay: "2.1s", top: "70%" },
    { left: "62%", size: 5, delay: "0.6s", top: "80%" },
    { left: "82%", size: 9, delay: "1.8s", top: "66%" },
    { left: "48%", size: 7, delay: "2.6s", top: "84%" },
  ].slice(0, Math.max(0, Math.min(6, count)));

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {positions.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full border border-primary/25 bg-primary/5"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animation: `acca-float 7s ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** 正在游动的小鱼（加载动效 / 空状态） */
export function FishLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-8 text-center", className)}>
      <div className="relative h-8 w-24 overflow-hidden">
        <div className="acca-swim absolute top-1 text-primary/80">
          <FishIcon className="h-6 w-8" />
        </div>
        <span className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}

/** 星星点亮动画（用于目标完成，轻微、不夸张） */
export function StarBurst({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none relative inline-flex", className)} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <SparkIcon
          key={i}
          className="acca-twinkle absolute h-3 w-3 text-amber"
          // eslint-disable-next-line react/forbid-dom-props
        />
      ))}
    </div>
  );
}
