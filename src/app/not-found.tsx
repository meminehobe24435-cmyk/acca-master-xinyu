import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">404 · 页面不存在</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        你访问的页面可能已被移动或删除。检查网址，或者回到学习中心继续刷题。
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          学习中心
        </Link>
        <Link href="/" className="rounded-lg border px-5 py-2.5 text-sm font-medium">
          返回首页
        </Link>
      </div>
    </div>
  );
}
