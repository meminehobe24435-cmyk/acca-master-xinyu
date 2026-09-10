import { describe, expect, it } from "vitest";

// 集成测试：需要运行中的服务（npm run dev / npm run start）。
// 若服务不可达则跳过，不阻塞 CI 中的单元测试。
const BASE = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";

async function probeAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/papers`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

const available = await probeAvailable();

describe("API 集成流程（需要服务在运行）", () => {
  it.skipIf(!available)("健康检查", async () => {
    const res = await fetch(`${BASE}/api/papers`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.papers.length).toBeGreaterThanOrEqual(13);
  });

  it.skipIf(!available)("注册 → 刷题 → 提交 → 收藏 → 统计 全流程", async () => {
    const email = `test_${Date.now()}@example.com`;
    const register = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username: `t_${Date.now() % 100000}`, password: "pass1234" }),
    });
    const cookies = register.headers.getSetCookie?.() ?? [];
    expect(register.status).toBe(200);
    expect(cookies.length).toBeGreaterThan(0);

    const cookie = cookies.map((c) => c.split(";")[0]).join("; ");

    // 题目列表
    const qs = await fetch(`${BASE}/api/questions?paper=FR&page=1`, { headers: { cookie } });
    const qData = await qs.json();
    expect(qData.total).toBeGreaterThan(0);

    // 提交答案
    const q = qData.questions[0];
    const answer = q.options?.[0]?.key ?? "A";
    const attempt = await fetch(`${BASE}/api/questions/${q.id}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ answer, timeSpentSec: 5, mode: "TEST" }),
    });
    expect(attempt.status).toBe(200);
    const aData = await attempt.json();
    expect(typeof aData.result.isCorrect).toBe("boolean");
    expect(aData.result.explanationMd.length).toBeGreaterThan(100);

    // 收藏
    const fav = await fetch(`${BASE}/api/questions/${q.id}/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: "{}",
    });
    expect(fav.status).toBe(200);
    expect((await fav.json()).favorited).toBe(true);

    // 错题本
    const mis = await fetch(`${BASE}/api/mistakes`, { headers: { cookie } });
    expect(mis.status).toBe(200);
    const misData = await mis.json();
    expect(misData.total).toBeGreaterThanOrEqual(0);

    // 智能刷题组卷
    const ss = await fetch(`${BASE}/api/practice/session?mode=smart&count=10`, { headers: { cookie } });
    expect(ss.status).toBe(200);
    expect((await ss.json()).questionIds.length).toBeGreaterThan(0);

    // 统计
    const ana = await fetch(`${BASE}/api/analytics?period=7`, { headers: { cookie } });
    expect(ana.status).toBe(200);
    expect((await ana.json()).metrics.attempts).toBeGreaterThanOrEqual(1);
  });

  it.skipIf(!available)("模拟考试全流程", async () => {
    const login = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@example.com", password: "demo1234" }),
    });
    const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

    const start = await fetch(`${BASE}/api/mock/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ paper: "FR" }),
    });
    expect(start.status).toBe(200);
    const sData = await start.json();

    const exam = await fetch(`${BASE}/api/mock/attempt/${sData.attemptId}`, { headers: { cookie } });
    expect(exam.status).toBe(200);
    const eData = await exam.json();
    expect(eData.questions.length).toBeGreaterThanOrEqual(5);

    const answers: Record<string, string> = {};
    for (const item of eData.questions) {
      answers[item.question.id] = item.question.options?.[0]?.key ?? "";
    }
    const submit = await fetch(`${BASE}/api/mock/attempt/${sData.attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ answers, submitEarly: true }),
    });
    expect(submit.status).toBe(200);
    const subData = await submit.json();
    expect(typeof subData.score).toBe("number");
    expect(subData.status).toBe("SUBMITTED");
  });

  it.skipIf(!available)("未配置 AI 时 AI Tutor 降级为 503", async () => {
    const qs = await fetch(`${BASE}/api/questions?paper=BT&page=1`);
    const qData = await qs.json();
    if (qData.total === 0) return;
    const res = await fetch(`${BASE}/api/ai/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: qData.questions[0].id, message: "hi" }),
    });
    // 允许 503（未配置）或 200（已配置 key）
    expect([503, 200]).toContain(res.status);
  });
});
