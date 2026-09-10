# ACCA Master

**ACCA 全科智能复习与刷题平台** — Master ACCA. One topic at a time.

一个可直接运行、可长期扩展的个人 ACCA 备考 SaaS：覆盖 ACCA 全科知识树（15 门科目 / 158 章节 / 1,000+ 知识点），内置 100+ 道原创专业演示题，提供刷题、解析、错题本（间隔重复）、收藏笔记、Mock Exam（按官方考制）、成绩分析、学习计划、AI Tutor 与完整管理后台（题库管理 / Excel·CSV·JSON 导入 / AI 批量生成审核）。

> 题源声明：本站题目均为**原创练习材料**或用户自有内容（来源标注于每题），非 ACCA 官方真题，未复制任何商业题库；涉及准则与税率请以当前 ACCA 官方 syllabus 和考试规则为准。

## 功能一览

| 模块 | 说明 |
|---|---|
| 📚 知识树 | 15 门科目（Applied Knowledge 3 + Applied Skills 6 + Strategic Professional 6）× 章节 × Topic × 知识点，含地区变体（TX-UK / TX-CHN / LW-ENG / LW-GLO …） |
| 🧠 知识点页 | 一句话理解 / 核心概念 / 常见考法 / 易错点 / 例子 / 考试提醒，Markdown + LaTeX（KaTeX），可收藏、写笔记 |
| 📝 刷题引擎 | 12 种题型（单选/多选/判断/数字填空/计算/匹配/分类/案例/主观/论述/分录/报表）；智能刷题、章节、知识点、随机、错题、收藏 6 种模式；服务端校验答案 |
| ⚖️ 解析面板 | 正确答案 / 为什么 / 计算过程 / 对应知识点 / 逐选项点评 / 易错提醒 / 考试技巧；错题自动推荐 3 道同知识点 + 2 道稍难题 |
| 🔁 错题本 | 自动收录，间隔重复 1→3→7→14→30 天动态调度；错误原因标签（概念不清/公式记错/计算错误/审题错误/知识遗忘/标准混淆/粗心）可修改 |
| ⭐ 收藏 & 笔记 | 题目 / 知识点收藏；Markdown 笔记（支持公式/表格），全部可导出 CSV |
| ⏱ 模拟考试 | 按官方考制自动组卷（Section A/B/C、时长、分值），全屏考试模式：倒计时、标记 Flag for Review、自动交卷；答案不出服务器 |
| 📊 成绩与分析 | 总分/通过判定/分 Section 得分/章节得分/知识点雷达图/逐题回顾；掌握度算法（正确率+最近表现+难度+重复次数+答题时间）→ 0-100（薄弱/待加强/掌握/熟练） |
| 🔥 学习闭环 | Dashboard 今日目标、连续学习天数、学习热力图、今日建议（薄弱点推送）、Exam Readiness、成就系统 |
| 🤖 AI Tutor | Provider 抽象（OpenAI / DeepSeek / Anthropic / Gemini / OpenRouter），直接讲解 / 苏格拉底 / 考试技巧 / 简单解释 / 专业解释 5 种模式；**无 API Key 自动降级**，核心功能不受影响 |
| 🛠 管理后台 | 题库 CRUD 与批量发布/归档/删除、导入预览（正常/警告/错误定位）+ 库内查重、AI 批量生成（含 "AI-generated practice question" 标注）、AI 二次审核队列（Accept/Edit/Reject）、用户反馈处理 |
| 🔐 安全 | bcrypt 密码哈希、JWT 签名会话（httpOnly Cookie）、考试模式不下发正确答案、答案全部服务端校验 |

## 技术栈

- **Frontend**: Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3 · shadcn 风格组件（Radix UI）· Lucide Icons · Recharts · KaTeX · React Markdown · Framer Motion（少量）
- **Backend**: Next.js Route Handlers · Zod · Prisma ORM · SQLite（本地零配置，可切 PostgreSQL）
- **Auth**: bcryptjs + jose (JWT)
- **AI**: 自研 `AIProvider` 抽象（OpenAI 兼容协议 + Anthropic 原生协议）
- **测试**: Vitest（单元 + API 集成测试）

## 快速开始

要求：Node.js ≥ 20（开发验证环境为 Node 24 + npm 11）。

```bash
# 1. 安装依赖（postinstall 自动生成 Prisma Client）
npm install

# 2. 一键初始化数据库（创建 SQLite + 建表 + 种子数据 15 科目/158 章/1000+ 知识点/100+ 题）
npm run setup

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

> 若数据库已初始化：`npm run dev` 即可；重置数据：`npm run db:reset`。

### Demo 账号（Development only）

| 角色 | 邮箱 | 密码 | 说明 |
|---|---|---|---|
| 学员 | `demo@example.com` | `demo1234` | 含 14 天预置学习记录 / 掌握度 / 错题，便于体验 Dashboard |
| 管理员 | `admin@example.com` | `admin1234` | 管理后台（题库/导入/审核/反馈） |

游客直接访问 `/practice` 可免注册体验刷题。

## AI 配置（可选）

复制 `.env.example` 为 `.env`，任一 Provider 即启用 AI Tutor / AI 学习报告 / AI 批量生成：

```ini
AI_PROVIDER=deepseek            # openai | deepseek | anthropic | gemini | openrouter | 留空禁用
DEEPSEEK_API_KEY=sk-...
# 或
OPENAI_API_KEY=sk-...           # 配合 OPENAI_BASE_URL / OPENAI_MODEL
```

未配置时：AI 区域显示「AI 功能未配置」提示，刷题/错题/统计/模拟考试等核心功能完全可用。**切勿提交任何真实 Key。**

## 常用命令

```bash
npm run dev          # 开发
npm run build        # 生产构建（PASS 才可交付）
npm run start        # 生产启动（本地 HTTP 测试请设 AUTH_INSECURE_COOKIE=1）
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest（含运行中服务的 API 集成测试；服务未启动时自动跳过）
npm run setup        # generate + db push + seed
npm run db:reset     # 重置数据库并重新 seed
```

## 题库导入（管理后台 → 批量导入）

支持 **CSV / XLSX / JSON**，导入前先解析预览（总计/正常/警告/错误/库内重复），通过后写入「草稿」状态，经审核发布。

列名（支持中英文表头）：

```
paper variant chapter topic knowledge_point type difficulty question
option_a option_b option_c option_d option_e answer explanation marks source
tax_year jurisdiction standard_reference source_url（可选）
```

- 题型取值：`单选/多选/判断/填空/计算/匹配/分类/案例/主观/论述/分录/报表`（或英文 `single_choice` 等）
- 难度取值：`1-5` 或 `基础/简单/中等/困难/Exam`
- 选择题答案：`A` 或 `A B`（多选）
- 重复检测：题干规范化（去空白标点）后哈希比对，跨批次自动提示「与库中已有题目重复」

「AI 生成」页可选择科目/知识点/数量/难度批量生成原创题，系统自动标注来源为 AI-generated practice question，随后可在「审核队列」由第二轮 AI 校验 + 人工 Accept / Edit / Reject。

## 目录结构

```
acca-master/
├─ prisma/schema.prisma        # 数据模型（25+ 张表：users/papers/questions/attempts/mock_exams/wrong_questions/mastery_scores/import_batches ...）
├─ content/                    # 种子内容（syllabus / questions JSON，见 content/README.md 规范）
│  └─ README.md                # 内容 Schema 规范（子代理写题库时遵守）
├─ scripts/seed.ts             # 种子脚本（知识树+题库+演示数据）
├─ src/
│  ├─ app/
│  │  ├─ (app)/                # 学习端：dashboard practice question-bank papers chapter knowledge question mistakes favorites mock analytics plan profile help
│  │  ├─ admin/                # 管理后台：overview questions import generate review reports
│  │  ├─ api/                  # Route Handlers（questions/attempts/mock/ai/admin/import/export/plan/analytics ...）
│  │  ├─ login register help offline not-found error
│  ├─ components/              # UI 原语 + 业务组件（question-answer-card / ai-tutor / navigator / heatmap / charts ...）
│  └─ lib/                     # db / auth / mastery / srs / activities / stats / ai(provider,prompt) / import(parse) / serializers / check
└─ tests/                      # Vitest 单元 + API 集成测试
```

## 核心设计说明

- **答案安全**：`/api/questions` 与考试接口只返回公共题目数据（不含正确答案与 `isCorrect`）；提交后由服务端 `checkAnswer` 统一校验。考试模式下正确答案从不进入浏览器。
- **掌握度算法** `lib/mastery.ts`：最近 20 次作答按时间衰减加权（正确率 62% + 难度 12% + 重复次数 14% + 基分 12%），超时答题轻微扣分 → 0-100；分类：0-39 薄弱 / 40-59 待加强 / 60-79 掌握 / 80-100 熟练。
- **间隔重复** `lib/srs.ts`：错 → 阶段 0；对 → +1 阶段（1/3/7/14/30 天），阶段 5 自动标记「已掌握」。
- **Exam Readiness**：大纲覆盖 + 正确率 + Exam Level 表现 + 模拟考均分 + 近期活跃度综合估计，明确标注「仅供参考，不构成结果预测」。
- **数据库迁移**：当前 SQLite 零配置；切换 PostgreSQL 只需改 `prisma/schema.prisma` 的 provider 与 `DATABASE_URL`，建议生产 `npx prisma migrate deploy`。

## 部署

1. Vercel / 自托管均可；构建命令 `npm run build`，启动 `npm run start`。
2. 环境变量见 `.env.example`；生产环境必须设置强随机 `AUTH_SECRET`（`openssl rand -base64 48`）。
3. 生产 HTTPS 下 Cookie 自动 Secure；本地 HTTP 调试设 `AUTH_INSECURE_COOKIE=1`。
4. 生产数据库推荐 PostgreSQL（或保持 SQLite 单机文件 + 定期备份）。

## 版权与内容说明

- 题库内容为 **ACCA Master 原创**（`sourceType: original_ai_generated`）或用户自有导入（`user_imported`），每题强制标注来源与版权状态；禁止导入未授权商业题库。
- 知识树按 ACCA 公开 syllabus 主题章节化整理，页面注明「请以当前 ACCA 官方 syllabus 和考试规则为准」。
- 税务题标注税年（如 TX-UK 2025/26），法律题标注 jurisdiction（如 England & Wales），准则题标注 standardReference（IFRS 15 / IAS 16 / ISA 500 …）。
- AI 讲解严格绑定题库标准答案；用户可对题目「报告问题」，后台审核处理。

## License

Private / 项目自用。演示账号密码仅限本地开发，请勿在生产环境使用。
