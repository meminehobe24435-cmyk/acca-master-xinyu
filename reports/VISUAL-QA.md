# ⭐🐟 ACCA Master — 视觉 QA 报告

检查日期：2026-09-10
检查方式：**Playwright 真实浏览器**（Chromium 1243）逐页加载 → 截图 → 读取截图人工确认 → 修正 → 复检。
脚本：`scripts/visual-qa.mjs`（页面截图 + 溢出/挤压检测 + Console 捕获）、`scripts/interaction-qa.mjs`（真实点击流程）
结果数据：`reports/visual-qa.json`、`reports/interaction-qa.json`
截图目录：`reports/screenshots/`

---

## 1. 静态页面检查（21 项，全部 PASS）

| 页面 | 尺寸 | HTTP | 横向溢出 | 文字挤压 | Console |
|---|---|---|---|---|---|
| Landing `/` | 1440×900 | 200 | 无 | 无 | 干净 |
| Dashboard `/dashboard` | 1440×900 | 200 | 无 | 无 | 干净 |
| Practice `/practice` | 1440×900 | 200 | 无 | 无 | 干净 |
| Papers `/papers` | 1440×900 | 200 | 无 | 无 | 干净 |
| Mock `/mock` | 1440×900 | 200 | 无 | 无 | 干净 |
| Mistakes `/mistakes` | 1440×900 | 200 | 无 | 无 | 干净 |
| Analytics `/analytics` | 1440×900 | 200 | 无 | 无 | 干净 |
| Plan `/plan` | 1440×900 | 200 | 无 | 无 | 干净 |
| Favorites `/favorites` | 1440×900 | 200 | 无 | 无 | 干净 |
| Help `/help` | 1440×900 | 200 | 无 | 无 | 干净 |
| Profile `/profile` | 1440×900 | 200 | 无 | 无 | 干净 |
| Question Bank `/question-bank` | 1440×900 | 200 | 无 | 无 | 干净 |
| Admin `/admin`（带口令） | 1440×900 | 200 | 无 | 无 | 干净 |
| Admin Login `/admin-login` | 1440×900 | 200 | 无 | 无 | 干净 |
| Dashboard（Dark） | 1440×900 | 200 | 无 | 无 | 干净 |
| Dashboard 手机 | 390×844 | 200 | 无 | 无 | 干净 |
| Practice 手机 | 390×844 | 200 | 无 | 无 | 干净 |
| Papers 手机 | 390×844 | 200 | 无 | 无 | 干净 |
| Mock 手机 | 390×844 | 200 | 无 | 无 | 干净 |
| Analytics 手机 | 390×844 | 200 | 无 | 无 | 干净 |
| Paper FR 手机 | 430×932 | 200 | 无 | 无 | 干净 |

## 2. 交互流程检查（8 项，全部 PASS）

| 流程 | 结果 |
|---|---|
| 刷题 → 选择选项 → 提交答案 → 显示解析 | PASS（截图 `22-answer-feedback-desktop.png`） |
| 答对反馈（随机夸奖 + 成就提示） | PASS，显示「✅ 思路很稳 ⭐ / 得分 2/2」 |
| 手机刷题页布局（题干全宽 + 底部导航） | PASS（`23-mobile-runner.png`） |
| 手机题号抽屉（Bottom Sheet） | PASS（`24-mobile-nav-drawer.png`） |
| 模拟考试桌面（计时 / 标记 / 导航 / 交卷） | PASS（`25-mock-exam-desktop.png`） |
| 模拟考试手机（计时吸顶、题号条、表格可滚动） | PASS（`26-mock-exam-mobile.png`） |
| 手机知识点页（正文 Markdown + 公式 + 关联题） | PASS（`27-mobile-knowledge-point.png`） |
| 深色模式答题反馈 | PASS（`28-dark-feedback.png`） |

## 3. 本轮发现并修复的真实问题

| # | 问题 | 现象 | 修复 |
|---|---|---|---|
| 1 | Radix Select 空字符串值 | 刷题 / 错题本 / 题库页 Console 报错：`A <Select.Item /> must have a value prop that is not an empty string` | 在 `components/ui/select.tsx` 中把空值映射为内部哨兵值 `__all__`，调用方仍可用 `""` 表示「全部」；已复检 Console 干净 |
| 2 | `/admin` 重定向死循环 | 未验证时访问 `/admin` → `ERR_TOO_MANY_REDIRECTS` | 登录页移出受保护布局（`/admin-login`），布局改为 307 跳转；公网复检 `GET /admin → 307 Location=/admin-login` |
| 3 | 科目页手机布局文字被压成竖排 | 430px 下 `FR Financial Reporting` 标题与简介被压成每行 1 个字 | 头部 flex 改为移动端整行占位（`w-full sm:w-auto sm:flex-1`）+ 收窄徽标尺寸；并新增「文字挤压」自动检测以防回归 |
| 4 | 章节树手机端被 `pl-16` 裁切 | 章节内知识点标题被截断 | 内边距改为 `p-3 sm:p-4 sm:pl-16`，标题改为换行而非截断 |
| 5 | 空数据文案语义重复 | 0 题时首页出现「…随时可以从第一道题进 ⭐ 随时可以从第一道题开始 🐟」两句同意 | `dailyPraise()` 零数据分支改为「温柔提示 + 连续天数/翻页引导」，不再同义重复 |

## 4. 最终状态

```
Landing Desktop      PASS        Landing Mobile        PASS
Dashboard Desktop    PASS        Dashboard Mobile      PASS
Practice Desktop     PASS        Practice Mobile       PASS
Papers Desktop       PASS        Papers Mobile (430)   PASS
Mock Desktop         PASS        Mock Mobile           PASS
Mistakes Desktop     PASS        Analytics Mobile      PASS
Analytics Desktop    PASS        Dark Mode             PASS
Plan Desktop         PASS        Overflow (375/390/430) PASS
Favorites Desktop    PASS        Text Squeeze          PASS
Profile Desktop      PASS        Console Errors        PASS
Admin (protected)    PASS        Admin API 401         PASS
```

> 说明：桌面按 1440×900 检查，手机按 390×844 与 430×932 检查，并额外用脚本在 390px 宽度下做了「元素越界 / 竖排挤压」的程序化扫描（0 命中）。
