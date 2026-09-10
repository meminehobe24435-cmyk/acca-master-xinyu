import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: "ACCA Master | ⭐🐟",
    template: "%s · ACCA Master ⭐🐟",
  },
  description:
    "ACCA 全科复习与刷题空间：知识点、题库、错题本、模拟考试、学习统计与 AI 讲题。打开就能学，不需要登录。",
  applicationName: "ACCA Master",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ACCA Master",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "ACCA Master | ⭐🐟",
    description: "ACCA 全科复习与刷题空间：打开就能学，不需要登录。",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0d15" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
