/**
 * ⭐🐟 交互式 QA：真实点击刷题 / 提交答案 / 打开手机题号抽屉 / 进入模拟考试
 * 用法：node scripts/interaction-qa.mjs [baseUrl]
 * 输出：reports/screenshots/21-*.png ... 与 reports/interaction-qa.json
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const OUT = path.resolve("reports", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const browser = await chromium.launch();

async function newCtx(viewport) {
  return browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    locale: "zh-CN",
    isMobile: viewport.width < 500,
    hasTouch: viewport.width < 500,
  });
}

function watch(page, bucket) {
  page.on("console", (m) => {
    if (m.type() === "error") bucket.consoleErrors.push(m.text().slice(0, 240));
  });
  page.on("pageerror", (e) => bucket.pageErrors.push(String(e).slice(0, 240)));
}

async function record(name, file, page, bucket, extra = {}) {
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  results.push({ name, file, consoleErrors: bucket.consoleErrors, pageErrors: bucket.pageErrors, ...extra });
  console.log(`${file} · ${name}${bucket.consoleErrors.length ? `  ⚠ console ×${bucket.consoleErrors.length}` : "  ✓"}`);
}

// ============ 1. 桌面：刷题 → 答题 → 反馈 ============
{
  const ctx = await newCtx({ width: 1440, height: 900 });
  const page = await ctx.newPage();
  const bucket = { consoleErrors: [], pageErrors: [] };
  watch(page, bucket);
  await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /开始刷题/ }).click();
  await page.waitForSelector("text=提交答案", { timeout: 30000 });
  await page.waitForTimeout(800);
  await record("Practice Runner Desktop", "21-practice-runner-desktop.png", page, bucket);

  // 选择第一个选项并提交
  const option = page.locator("button:has-text('A')").first();
  const firstOption = page.locator("div.space-y-2\\.5 > button").first();
  const target = (await firstOption.count()) > 0 ? firstOption : option;
  await target.click({ timeout: 8000 }).catch(() => undefined);
  await page.getByRole("button", { name: /提交答案/ }).click().catch(() => undefined);
  await page.waitForTimeout(2500);
  await record("Answer Feedback Desktop", "22-answer-feedback-desktop.png", page, bucket, {
    hasResultPanel: await page.locator("text=正确答案").count(),
  });
  await ctx.close();
}

// ============ 2. 手机：刷题 + 题号抽屉 ============
{
  const ctx = await newCtx({ width: 390, height: 844 });
  const page = await ctx.newPage();
  const bucket = { consoleErrors: [], pageErrors: [] };
  watch(page, bucket);
  await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /开始刷题/ }).click();
  await page.waitForSelector("text=提交答案", { timeout: 30000 });
  await page.waitForTimeout(800);
  await record("Practice Runner Mobile 390", "23-mobile-runner.png", page, bucket);

  await page.getByRole("button", { name: /题号/ }).click();
  await page.waitForTimeout(700);
  await record("Mobile Question Navigator Sheet", "24-mobile-nav-drawer.png", page, bucket);
  await ctx.close();
}

// ============ 3. 桌面：模拟考试（全屏模式） ============
{
  const ctx = await newCtx({ width: 1440, height: 900 });
  const page = await ctx.newPage();
  const bucket = { consoleErrors: [], pageErrors: [] };
  watch(page, bucket);
  await page.goto(`${BASE}/mock`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /开始模拟考试/ }).first().click();
  await page.waitForSelector("text=交卷", { timeout: 45000 });
  await page.waitForTimeout(1200);
  await record("Mock Exam Desktop", "25-mock-exam-desktop.png", page, bucket, { url: page.url() });
  await ctx.close();
}

// ============ 4. 手机：模拟考试 ============
{
  const ctx = await newCtx({ width: 390, height: 844 });
  const page = await ctx.newPage();
  const bucket = { consoleErrors: [], pageErrors: [] };
  watch(page, bucket);
  await page.goto(`${BASE}/mock`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /开始模拟考试/ }).first().click();
  await page.waitForSelector("text=交卷", { timeout: 45000 });
  await page.waitForTimeout(1200);
  await record("Mock Exam Mobile 390", "26-mock-exam-mobile.png", page, bucket, { url: page.url() });
  await ctx.close();
}

// ============ 5. 手机：知识库章节展开 + 知识点页 ============
{
  const ctx = await newCtx({ width: 390, height: 844 });
  const page = await ctx.newPage();
  const bucket = { consoleErrors: [], pageErrors: [] };
  watch(page, bucket);
  await page.goto(`${BASE}/papers/FR`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // 点击第一个知识点链接
  const kpLink = page.locator('a[href^="/knowledge/"]').first();
  if ((await kpLink.count()) > 0) {
    await kpLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, "27-mobile-knowledge-point.png") });
    results.push({
      name: "Knowledge Point Mobile 390",
      file: "27-mobile-knowledge-point.png",
      consoleErrors: bucket.consoleErrors,
      pageErrors: bucket.pageErrors,
      url: page.url(),
    });
    console.log(`27-mobile-knowledge-point.png · Knowledge Point Mobile 390${bucket.consoleErrors.length ? `  ⚠ console ×${bucket.consoleErrors.length}` : "  ✓"}`);
  }
  await ctx.close();
}

// ============ 6. 桌面：深色模式刷题反馈 ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN", deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const bucket = { consoleErrors: [], pageErrors: [] };
  watch(page, bucket);
  await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /开始刷题/ }).click();
  await page.waitForSelector("text=提交答案", { timeout: 30000 });
  await page.locator("div.space-y-2\\.5 > button").first().click({ timeout: 8000 }).catch(() => undefined);
  await page.getByRole("button", { name: /提交答案/ }).click().catch(() => undefined);
  await page.waitForTimeout(2500);
  await record("Dark Mode Feedback", "28-dark-feedback.png", page, bucket);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.resolve("reports", "interaction-qa.json"), JSON.stringify(results, null, 2), "utf8");

const problems = results.filter((r) => r.consoleErrors.length || r.pageErrors.length);
console.log(`\n交互流程页面：${results.length}，其中有 console/page error：${problems.length}`);
for (const p of problems) {
  console.log(`- ${p.file}`);
  p.consoleErrors.slice(0, 3).forEach((e) => console.log(`    console: ${e}`));
  p.pageErrors.slice(0, 3).forEach((e) => console.log(`    pageerror: ${e}`));
}
