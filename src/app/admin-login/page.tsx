"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand/brand-mark";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "验证失败");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="soft-aurora flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <BrandMark size="md" href="/dashboard" showTagline />
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card/90 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/10 text-amber">
              <ShieldCheck className="h-4 w-4" />
            </span>
            管理后台验证
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            学习页面无需登录；管理后台单独使用管理员口令保护，口令仅保存在服务器环境变量中。
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="password">管理员口令</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ADMIN_PASSWORD"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || password.length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {loading ? "验证中…" : "进入管理后台"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              返回学习中心 →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
