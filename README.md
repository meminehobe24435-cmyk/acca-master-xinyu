# ⭐🐟 ACCA Master

**ACCA 全科智能复习与刷题空间** — 打开就能学，不需要登录。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmeminehobe24435-cmyk%2Facca-master-xinyu&project-name=acca-master-xinyu&repository-name=acca-master-xinyu&env=AUTH_SECRET,ADMIN_PASSWORD&envDescription=%E4%BC%9A%E8%AF%9D%E7%AD%BE%E5%90%8D%E5%AF%86%E9%92%A5%E4%B8%8E%E7%AE%A1%E7%90%86%E5%91%98%E5%8F%A3%E4%BB%A4%EF%BC%88%E7%94%9F%E4%BA%A7%E7%8E%AF%E5%A2%83%E8%AF%B7%E5%8B%BF%E4%BD%BF%E7%94%A8%E7%A4%BA%E4%BE%8B%E5%80%BC%EF%BC%89)

> 这是给「歆瑜」的专属版本（v1.1）：在完整 ACCA 学习产品之上，加入更温柔的反馈、随时变化的鼓励语、⭐🐟 专属视觉，并把登录流程整个去掉 —— 打开网址直接开始学习。
> 专业内容（题目、答案、准则引用、计算公式、Mock 规则）保持严谨，不做任何可爱化改写。

**当前在线地址（临时隧道，本机开机时可用）**：https://binary-copper-entrance-filter.trycloudflare.com
**永久地址部署**：见 [`reports/DEPLOYMENT.md`](reports/DEPLOYMENT.md)（3 分钟，Vercel / Render 任选）

---

## 与 v1.0 的差异（专属版新增）

| 变化 | 说明 |
|---|---|
| 🚫 取消学习端登录 | 删除 `/login`、`/register` 流程（旧链接自动跳转学习中心）；单用户模式，所有记录写入默认学习者「歆瑜」 |
| 🔐 管理后台独立保护 | `/admin` 使用 `ADMIN_PASSWORD` 口令 + 签名 Cookie（7 天）；未验证时页面 307 跳转 `/admin-login`，管理 API 返回 401 |
| 💬 鼓励语系统 | `src/data/encouragements.ts`：**140+ 条原创文案**，覆盖问候 / 学习开始 / 答对 / 连对 / 答错 / 完成 / 模考 / 空状态 / 休息提醒；`src/lib/encourage.ts` 负责按时段与场景随机选取（同会话内避免重复） |
| ✅ 答对反馈 | 随机夸奖 + 连续 3 / 5 / 10 题的额外反馈（例：「连对 5 题 ⭐ 这一段掌握得越来越稳。」） |
| 🌊 答错反馈 | 不再出现「错误 / Incorrect」这类生硬字眼，改为温柔提示并直接进入解析（例：「差一点点，这题正好帮我们抓到了一个容易混淆的地方。」） |
| 🎯 真实数据驱动的夸奖 | 只按真实学习数据说话；当天 0 题时不会硬夸，只提示「第一题一直在这里等你 🐟」 |
| ⭐🐟 视觉体系 | 自绘 SVG 小鱼 + 星星（`src/components/brand/fish.tsx`）、象牙白/薰衣草/雾蓝/微量玫瑰/柔和金配色、深色模式为深蓝黑 + 柔和金；掌握度同时显示百分比与 ⭐⭐⭐☆☆ |
| 📱 移动端重构 | 底部导航改为「首页 / 刷题 / 知识库 / 模考 / 我的」；手机刷题把题号导航收进底部抽屉（Bottom Sheet）、进度条吸顶；考试模式计时器吸顶；宽表格横向滚动带提示 |
| 🐟 专属页脚 | `Made for ⭐🐟 · 慢慢来，比较快`（低调，不铺满全站） |
| 📊 休息提醒 | 连续专注学习较久时出现一次轻量提醒（不打断考试模式，可关闭） |
| 📦 部署准备 | PostgreSQL schema 生成脚本、`vercel.json`、`render.yaml`、`Dockerfile`、`start-public-tunnel.cmd` |

---

## 功能总览

| 模块 | 说明 |
|---|---|
| 📚 知识树 | 15 门科目（Applied Knowledge 3 + Applied Skills 6 + Strategic Professional 6）× 158 章节 × 374 Topic × **1,038 知识点**，含地区变体（TX-UK / TX-CHN / LW-ENG / LW-GLO …） |
| 🧠 知识点页 | 一句话理解 / 核心概念 / 常见考法 / 易错点 / 例子 / 考试提醒，Markdown + LaTeX（KaTeX），可收藏、写笔记 |
| 📝 刷题引擎 | **119 道原创专业题**，12 种题型（单选/多选/判断/数字填空/计算/匹配/分类/案例/主观/论述/分录/报表）；智能刷题、章节、知识点、随机、错题、收藏 6 种模式；服务端校验答案 |
| ⚖️ 解析面板 | 正确答案 / 为什么 / 计算过程 / 对应知识点 / 逐选项点评 / 易错提醒 / 考试技巧；错题自动推荐 3 道同知识点 + 2 道稍难题 |
| 🔁 错题本 | 自动收录，间隔重复 1→3→7→14→30 天动态调度；错误原因标签可修改；顶部文案「错题不是扣掉的分数，是提前发现的漏洞」 |
| ⭐ 收藏 & 笔记 | 题目 / 知识点收藏；Markdown 笔记（支持公式/表格）；错题 / 收藏 / 笔记 / 学习记录均可导出 CSV |
| ⏱ 模拟考试 | 按官方考制自动组卷（Section A/B/C、时长、分值），全屏考试：倒计时、标记 Flag for Review、自动交卷；成绩页按分数分层给反馈（不羞辱、不夸大） |
| 📊 成绩与分析 | 总分/分 Section/章节得分/知识点雷达图/逐题回顾；掌握度算法（正确率 + 最近表现 + 难度 + 重复次数 + 答题时间）→ 0-100（薄弱/待加强/掌握/熟练） |
| 🔥 学习闭环 | 首页时段问候、今日目标、连续学习、12 周热力图、今日建议、Exam Readiness、成就系统 |
| 🤖 AI Tutor | Provider 抽象（OpenAI / DeepSeek / Anthropic / Gemini / OpenRouter），5 种讲解模式；**未配置 API Key 时自动降级**，核心功能不受影响 |
| 🛠 管理后台 | 题库 CRUD 与批量发布/归档/删除、导入预览（正常/警告/错误定位）+ 库内查重、AI 批量生成（标注 AI-generated）、AI 二次审核队列（Accept/Edit/Reject）、用户反馈处理 |
| 🔐 安全 | 学习端无需登录但不暴露管理接口；管理后台独立口令；考试模式不下发正确答案；答案全部服务端校验 |

## 技术栈

- **Frontend**: Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3 · shadcn 风格组件（Radix UI）· Lucide Icons · Recharts · KaTeX · React Markdown
- **Backend**: Next.js Route Handlers · Zod · Prisma ORM · SQLite（本地）/ PostgreSQL（生产）
- **测试**: Vitest（单元 + API 集成）· Playwright（视觉 QA + 交互流程）
- **AI**: 自研 `AIProvider` 抽象（OpenAI 兼容协议 + Anthropic 原生协议）

## 快速开始（本地）

要求：Node.js ≥ 20。

```bash
cd D:\ACCA-Master
npm install          # postinstall 自动生成 Prisma Client
npm run setup        # 建库 + 导入知识树/题库 + 创建默认学习者
npm run dev          # http://localhost:3000
```

或直接双击 **`start-acca-master.cmd`**（生产模式启动，自动处理本地 Cookie 设置）。

### 手机公网访问（临时）

双击 **`start-public-tunnel.cmd`** → 窗口会打印一个 `https://xxx.trycloudflare.com` 地址，手机浏览器打开即可（需本机开机）。永久地址请按 [`reports/DEPLOYMENT.md`](reports/DEPLOYMENT.md) 部署。

## 管理后台

- 地址：`/admin`（未验证会自动跳到 `/admin-login`）
- 口令：环境变量 `ADMIN_PASSWORD`（本地默认写在 `.env`，可自行修改；生产请在平台 Secret 中设置）
- 口令不进入前端 bundle；管理 API 未验证时返回 401

## 环境变量

见 `.env.example`。关键项：

```ini
DATABASE_URL="file:./dev.db"          # 生产改用 postgresql://...
AUTH_SECRET="随机长字符串"             # 生产必须更换
ADMIN_PASSWORD="管理员口令（≥6 位）"
AI_PROVIDER=""                        # openai | deepseek | anthropic | gemini | openrouter | 留空禁用
AUTH_INSECURE_COOKIE="1"              # 仅本地 HTTP 调试；生产 HTTPS 请删除
```

## 常用命令

```bash
npm run dev / build / start     # 开发 / 构建 / 生产启动
npm run lint / typecheck / test # 代码质量与测试
npm run setup / db:reset        # 初始化 / 重置数据
npm run db:pg:push / db:pg:seed # 生产 PostgreSQL：建表 / 导入种子
npm run qa:visual               # Playwright 逐页截图 + 溢出/挤压/Console 检查
npm run qa:interaction          # Playwright 真实点击：刷题→提交→反馈→模考
```

## 目录结构

```
D:\ACCA-Master\
├─ prisma/                 # schema.prisma（SQLite）· schema.postgresql.prisma（生成）
├─ content/                # 种子内容：syllabus/*.json · questions/*.json（见 content/README.md）
├─ scripts/                # seed.ts · prepare-postgres.mjs · visual-qa.mjs · interaction-qa.mjs
├─ src/
│  ├─ app/(app)/           # dashboard practice question-bank papers chapter knowledge question
│  │                       # mistakes favorites mock analytics plan profile help
│  ├─ app/admin/           # 管理后台（受 ADMIN_PASSWORD 保护）
│  ├─ app/admin-login/     # 管理员验证页
│  ├─ app/api/             # Route Handlers（questions/attempts/mock/ai/admin/import/export/plan/analytics）
│  ├─ components/          # UI 原语 + 业务组件 + brand/（小鱼与星星 SVG）
│  ├─ data/encouragements.ts   # ⭐🐟 140+ 条鼓励语池
│  └─ lib/                 # auth · encourage · mastery · srs · stats · ai · import · check
├─ reports/                # VISUAL-QA.md · DEPLOYMENT.md · c-drive-cleanup.md · screenshots/
├─ start-acca-master.cmd   # 本地一键启动
└─ start-public-tunnel.cmd # 临时公网地址（Cloudflare 隧道）
```

## 版权与内容说明

- 题库为**原创练习材料**（`sourceType: original_ai_generated`）或用户自有导入，每题强制标注来源与版权状态；未使用任何官方真题或商业题库内容。
- 知识树按 ACCA 公开 syllabus 主题章节化整理，页面注明「请以当前 ACCA 官方 syllabus 和考试规则为准」。
- 税务题标注税年（TX-UK 2025/26 等），法律题标注 jurisdiction，准则题标注 standardReference（IFRS 15 / IAS 16 / ISA 500 …）。
- AI 讲解严格绑定题库标准答案；用户可对题目「报告问题」，后台审核处理。

## License

Private / 个人自用。`.env` 中的默认口令与密钥仅供本地开发，生产环境请全部更换。
