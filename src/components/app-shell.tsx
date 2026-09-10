"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PencilLine,
  BookOpen,
  Timer,
  Star,
  RotateCcw,
  LineChart,
  CalendarDays,
  Settings,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";
import { FishIcon } from "@/components/brand/fish";

export interface ShellUser {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  role: string;
}

const NAV = [
  { href: "/dashboard", label: "学习中心", en: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/practice", label: "刷题", en: "Practice", icon: PencilLine },
  { href: "/mock", label: "模拟考试", en: "Mock Exam", icon: Timer },
  { href: "/papers", label: "知识库", en: "Syllabus", icon: BookOpen },
  { href: "/mistakes", label: "错题本", en: "Mistakes", icon: RotateCcw },
  { href: "/favorites", label: "收藏与笔记", en: "Favorites", icon: Star },
  { href: "/analytics", label: "学习统计", en: "Analytics", icon: LineChart },
  { href: "/plan", label: "学习计划", en: "Study Plan", icon: CalendarDays },
  { href: "/profile", label: "我的", en: "Profile", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "首页", icon: LayoutDashboard },
  { href: "/practice", label: "刷题", icon: PencilLine },
  { href: "/papers", label: "知识库", icon: BookOpen },
  { href: "/mock", label: "模考", icon: Timer },
  { href: "/profile", label: "我的", icon: Star },
];

export function AppShell({
  user,
  isAdmin = false,
  children,
}: {
  user: ShellUser;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const displayName = user.displayName ?? user.username;

  return (
    <div className="min-h-screen">
      {/* ===== 桌面侧边栏 ===== */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-card/70 backdrop-blur lg:flex">
        <div className="flex h-16 items-center border-b px-4">
          <BrandMark size="sm" showTagline />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href, item.exact)
                  ? "bg-primary/10 text-primary shadow-sm dark:bg-primary/15"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          {isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                "mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive("/admin")
                  ? "bg-amber/10 text-amber"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              管理后台
            </Link>
          ) : null}

          <Link
            href="/help"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive("/help")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <HelpCircle className="h-4 w-4" />
            帮助 & 快捷键
          </Link>
        </nav>

        <div className="border-t p-3">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-cyan-500/80 text-white">
              <FishIcon className="h-4 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{displayName}</span>
              <span className="block truncate text-[11px] text-muted-foreground">⭐🐟 专属学习空间</span>
            </span>
          </Link>
          <div className="mt-1 flex items-center justify-between px-2 py-1">
            <span className="text-[11px] text-muted-foreground">ACCA Master v1.1</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ===== 移动端顶栏 ===== */}
      <header className="no-print sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-lg lg:hidden">
        <BrandMark size="sm" />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-cyan-500/80 text-white"
            aria-label="我的"
          >
            <FishIcon className="h-4 w-5" />
          </Link>
        </div>
      </header>

      {/* ===== 主内容 ===== */}
      <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pl-60 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">{children}</div>
      </main>

      {/* ===== 移动端底部导航（首页 / 刷题 / 知识库 / 模考 / 我的）===== */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.href, item.href === "/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className={cn("h-5 w-5", active && "drop-shadow-sm")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
