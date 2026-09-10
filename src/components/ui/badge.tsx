import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground/80",
        success: "border-transparent bg-success/10 text-success",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        warning: "border-transparent bg-amber/10 text-amber",
        violet: "border-transparent bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
        cyan: "border-transparent bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
