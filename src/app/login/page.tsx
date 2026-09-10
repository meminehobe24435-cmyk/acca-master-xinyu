import { redirect } from "next/navigation";

/** 单用户模式：不再需要登录页，直接进入学习中心 */
export default function LoginPage() {
  redirect("/dashboard");
}
