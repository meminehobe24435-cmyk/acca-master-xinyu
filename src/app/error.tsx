"use client";

import { ServerCrash } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ServerCrash className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">500 · 服务器开小差了</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        发生了未预期的错误{digestOf(error)}。请稍后重试；若持续出现，请检查数据库连接与环境变量。
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        重试
      </button>
    </div>
  );
}

function digestOf(e: Error & { digest?: string }): string {
  return e.digest ? `（错误码 ${e.digest}）` : "";
}
