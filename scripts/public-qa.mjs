/**
 * 公网 URL 真机尺寸验证：用 Playwright 手机视口访问线上地址，检查渲染与 Console
 * 用法：node scripts/public-qa.mjs https://xxx.trycloudflare.com
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2];
if (!BASE) {
  console.error("用法: node scripts/public-qa.mjs <public-url>");
  process.exit(1);
}

const OUT = path.resolve("reports", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];

const targets = [
  { file: "30-public-mobile-home.png", path: "/dashboard", viewport: { width: 390, height: 844 } },
  { file: "31-public-mobile-practice.png", path: "/practice", viewport: { width: 390, height: 844 } },
  { file: "32-public-mobile-papers.png", path: "/papers/FR", viewport: { width: 430, height: 932 } },
  { file: "33-public-desktop-home.png", path: "/", viewport: { width: 1440, height: 900 } },
];

for (const t of targets) {
  const ctx = await browser.newContext({
    viewport: t.viewport,
    deviceScaleFactor: 2,
    locale: "zh-CN",
    isMobile: t.viewport.width < 500,
    hasTouch: t.viewport.width < 500,
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));

  const res = await page.goto(`${BASE}${t.path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, t.file) });

  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
    title: document.title,
  }));

  results.push({
    file: t.file,
    path: t.path,
    status: res?.status(),
    title: overflow.title,
    overflow: overflow.doc > overflow.win + 1,
    consoleErrors,
    pageErrors,
  });
  console.log(
    `${t.file} · ${t.path} → ${res?.status()} | title="${overflow.title}" | ${overflow.doc > overflow.win + 1 ? "⚠ 横向溢出" : "✓ 无溢出"} | console ${consoleErrors.length}`
  );
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.resolve("reports", "public-qa.json"), JSON.stringify(results, null, 2), "utf8");
