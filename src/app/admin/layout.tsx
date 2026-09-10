import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { isAdminAuthed, isAdminPasswordConfigured } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 管理后台独立保护：不依赖学习端会话
  if (!isAdminPasswordConfigured()) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber/10 text-amber">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight">管理后台未启用</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          请在服务器环境变量中设置 <code className="rounded bg-secondary px-1.5 py-0.5">ADMIN_PASSWORD</code>
          （至少 6 位），然后重启服务即可启用管理后台。学习页面无需登录，可正常使用。
        </p>
        <Link
          href="/dashboard"
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          返回学习中心
        </Link>
      </div>
    );
  }

  if (!(await isAdminAuthed())) {
    redirect("/admin-login");
  }

  return (
    <div className="space-y-6">
      <AdminNav />
      {children}
    </div>
  );
}
