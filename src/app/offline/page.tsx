"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <WifiOff className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">离线状态</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        当前网络不可用。ACCA Master 需要联网访问题库与解析，网络恢复后自动刷新。
      </p>
      <Link href="/" className="mt-6 rounded-lg border px-5 py-2.5 text-sm font-medium">
        返回
      </Link>
    </div>
  );
}
