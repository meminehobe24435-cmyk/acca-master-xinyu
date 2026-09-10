/**
 * ⭐🐟 ACCA Master 视觉 QA 脚本
 * 用途：启动本地服务后，逐页截图（桌面 + 手机尺寸）并收集浏览器 Console 错误。
 * 用法：node scripts/visual-qa.mjs [baseUrl]
 * 输出：reports/screenshots/*.png 与 reports/visual-qa.json
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const OUT = path.resolve("reports", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const MOBILE_L = { width: 430, height: 932 };

/** 需要截图的页面 */
const PAGES = [
  { file: "01-landing-desktop.png", path: "/", viewport: DESKTOP, name: "Landing Desktop" },
  { file: "02-dashboard-desktop.png", path: "/dashboard", viewport: DESKTOP, name: "Dashboard Desktop" },
  { file: "03-practice-desktop.png", path: "/practice", viewport: DESKTOP, name: "Practice Desktop" },
  { file: "04-papers-desktop.png", path: "/papers", viewport: DESKTOP, name: "Papers Desktop" },
  { file: "05-mock-desktop.png", path: "/mock", viewport: DESKTOP, name: "Mock Desktop" },
  { file: "06-wrong-questions-desktop.png", path: "/mistakes", viewport: DESKTOP, name: "Mistakes Desktop" },
  { file: "07-analytics-desktop.png", path: "/analytics", viewport: DESKTOP, name: "Analytics Desktop" },
  { file: "08-mobile-home.png", path: "/dashboard", viewport: MOBILE, name: "Dashboard Mobile 390" },
  { file: "09-mobile-practice.png", path: "/practice", viewport: MOBILE, name: "Practice Mobile 390" },
  { file: "10-mobile-dashboard.png", path: "/papers", viewport: MOBILE, name: "Papers Mobile 390" },
  { file: "11-mobile-mock.png", path: "/mock", viewport: MOBILE, name: "Mock Mobile 390" },
  { file: "12-admin.png", path: "/admin", viewport: DESKTOP, name: "Admin Dashboard", adminAuth: true },
  { file: "12b-admin-login.png", path: "/admin-login", viewport: DESKTOP, name: "Admin Login (protected)" },
  { file: "13-mobile-large-knowledge.png", path: "/papers/FR", viewport: MOBILE_L, name: "Paper FR Mobile 430" },
  { file: "14-analytics-mobile.png", path: "/analytics", viewport: MOBILE, name: "Analytics Mobile 390" },
  { file: "15-plan-desktop.png", path: "/plan", viewport: DESKTOP, name: "Plan Desktop" },
  { file: "16-favorites-desktop.png", path: "/favorites", viewport: DESKTOP, name: "Favorites Desktop" },
  { file: "17-help-desktop.png", path: "/help", viewport: DESKTOP, name: "Help Desktop" },
  { file: "18-profile-desktop.png", path: "/profile", viewport: DESKTOP, name: "Profile Desktop" },
  { file: "19-question-bank-desktop.png", path: "/question-bank", viewport: DESKTOP, name: "Question Bank Desktop" },
  { file: "20-dark-dashboard.png", path: "/dashboard", viewport: DESKTOP, name: "Dashboard Dark", dark: true },
];

const results = [];

const browser = await chromium.launch();

for (const pageDef of PAGES) {
  const context = await browser.newContext({
    viewport: pageDef.viewport,
    deviceScaleFactor: 2,
    colorScheme: pageDef.dark ? "dark" : "light",
    locale: "zh-CN",
    isMobile: pageDef.viewport.width < 500,
    hasTouch: pageDef.viewport.width < 500,
  });
  const page = await context.newPage();

  // 管理后台：先用管理员口令登录（口令来自环境变量，不写死在脚本里）
  if (pageDef.adminAuth && process.env.ADMIN_PASSWORD) {
    await context.request.post(`${BASE}/api/admin/login`, {
      data: { password: process.env.ADMIN_PASSWORD },
    });
  }

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));
  page.on("requestfailed", (req) => failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText ?? ""}`.slice(0, 200)));

  let status = 0;
  try {
    const res = await page.goto(`${BASE}${pageDef.path}`, { waitUntil: "networkidle", timeout: 45000 });
    status = res?.status() ?? 0;
  } catch (e) {
    pageErrors.push(`navigation: ${String(e).slice(0, 200)}`);
  }

  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, pageDef.file), fullPage: false });

  // 横向溢出 + 文字被挤压（竖排单字）检测
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const offenders = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > winWidth + 2 || r.left < -2)) {
        const tag = el.tagName.toLowerCase();
        const cls = typeof el.className === "string" ? el.className.slice(0, 60) : "";
        offenders.push(`${tag}.${cls} right=${Math.round(r.right)}`);
      }
    });

    // 检测被压成窄条的文字（中文竖排单字）：宽 <120px 且 高宽比 > 2 且文字较长
    const squeezed = [];
    document.querySelectorAll("p, h1, h2, h3, h4, li, span, div, td").forEach((el) => {
      if (el.children.length > 0) return;
      const text = (el.textContent || "").trim();
      if (text.length < 12) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      if (r.width < 120 && r.height / r.width > 2) {
        const cls = typeof el.className === "string" ? el.className.slice(0, 50) : "";
        squeezed.push(`${el.tagName.toLowerCase()}.${cls} w=${Math.round(r.width)} h=${Math.round(r.height)} "${text.slice(0, 24)}"`);
      }
    });

    return { docWidth, winWidth, overflowing: offenders.slice(0, 5), squeezed: squeezed.slice(0, 6) };
  });

  results.push({
    file: pageDef.file,
    name: pageDef.name,
    path: pageDef.path,
    viewport: pageDef.viewport,
    status,
    horizontalOverflow: overflow.docWidth > overflow.winWidth + 1,
    docWidth: overflow.docWidth,
    winWidth: overflow.winWidth,
    offenders: overflow.overflowing,
    squeezedText: overflow.squeezed,
    consoleErrors,
    pageErrors,
    failedRequests,
  });

  console.log(
    `${pageDef.file} · ${pageDef.name} → HTTP ${status}` +
      (overflow.docWidth > overflow.winWidth + 1 ? `  ⚠ 横向溢出 ${overflow.docWidth}>${overflow.winWidth}` : "  ✓ 无横向溢出") +
      (overflow.squeezed.length ? `  ⚠ 文字挤压 ×${overflow.squeezed.length}` : "  ✓ 无文字挤压") +
      (consoleErrors.length ? `  ⚠ console error ×${consoleErrors.length}` : "  ✓ console 干净")
  );

  await context.close();
}

await browser.close();

const reportPath = path.resolve("reports", "visual-qa.json");
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf8");
console.log(`\n报告已写入 ${reportPath}`);
console.log(`截图目录：${OUT}`);

const problems = results.filter(
  (r) => r.status !== 200 || r.horizontalOverflow || r.consoleErrors.length || r.pageErrors.length || r.squeezedText.length
);
if (problems.length) {
  console.log(`\n需要注意的页面：${problems.length}`);
  for (const p of problems) {
    console.log(
      `- ${p.file}: status=${p.status} overflow=${p.horizontalOverflow} squeezed=${p.squeezedText.length} console=${p.consoleErrors.length} pageerror=${p.pageErrors.length}`
    );
    p.squeezedText.slice(0, 3).forEach((s) => console.log(`    squeezed: ${s}`));
    p.consoleErrors.slice(0, 3).forEach((e) => console.log(`    console: ${e}`));
    p.pageErrors.slice(0, 3).forEach((e) => console.log(`    pageerror: ${e}`));
  }
}
