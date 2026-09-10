# ⭐🐟 ACCA Master — 部署报告

更新日期：2026-09-10
项目位置：`D:\ACCA-Master`（唯一正式目录，C 盘无任何副本）

---

## 1. 当前可访问地址

| 地址类型 | URL | 状态 | 说明 |
|---|---|---|---|
| **立即可用（已在线）** | https://binary-copper-entrance-filter.trycloudflare.com | ✅ 已实测 HTTPS 200 | Cloudflare 快速隧道，指向本机 `127.0.0.1:3000`。**需要这台电脑开机并保持服务运行**；重启后会更换地址 |
| 本地 | http://127.0.0.1:3000 | ✅ 200 | `start-acca-master.cmd` 一键启动 |
| **永久公网地址** | 待授权后生成 | ⏳ 需要一次性账号授权 | 见第 4 节（唯一阻塞点） |

已通过公网 URL 完成真实验证（非仅看"部署成功"提示）：

```
GET /                    → 200      GET /plan               → 200
GET /dashboard           → 200      GET /favorites          → 200
GET /practice            → 200      GET /profile            → 200
GET /papers              → 200      GET /help               → 200
GET /mock                → 200      GET /admin              → 307 → /admin-login（受保护）
GET /mistakes            → 200      GET /api/admin/stats    → 401（无口令）
GET /analytics           → 200      GET /api/admin/stats    → 200（带口令）
子页面直接刷新 /practice、/papers/FR、/mock → 200（无 404）
HTTPS：证书有效，server: cloudflare
答题写入 → 公网提交成功并持久化（analytics.attempts 递增）
```

## 2. 部署架构与技术准备

| 项目 | 内容 |
|---|---|
| 框架 | Next.js 15（App Router，SSR + Route Handlers），Node 22 |
| 数据库（本地） | SQLite `file:./dev.db`（零配置，随项目在 D 盘） |
| 数据库（生产） | **PostgreSQL**（Neon / Vercel Postgres / Supabase 免费档均可）。已提供 `prisma/schema.postgresql.prisma` 生成脚本与 `npm run db:pg:*` 命令，`prisma validate` 通过 |
| 持久化保证 | 学习记录 / 错题 / 收藏 / Mastery / 计划全部写数据库；生产使用托管 Postgres，重新部署不会清零 |
| 部署配置 | `vercel.json`（Vercel，构建时自动切换 Postgres schema）、`render.yaml`（Render Blueprint：Web + Postgres）、`Dockerfile`（自托管，SQLite 挂载 `/data` 卷） |
| 环境变量 | `DATABASE_URL`、`AUTH_SECRET`、`ADMIN_PASSWORD`、`AI_PROVIDER` + 对应 API Key —— **只写平台 Secret，绝不入库**（`.env` 已在 `.gitignore`） |
| HTTPS | 平台默认提供；隧道方案亦为 HTTPS |
| 代码仓库 | https://github.com/meminehobe24435-cmyk/acca-master-xinyu （私有，main 分支） |

## 3. 永久部署的三条路径（任选其一）

### A. Vercel（推荐，全程约 3 分钟）
1. 打开 https://vercel.com/new → 用 GitHub 登录并授权（这一步需要你本人操作一次）
2. 选择仓库 `acca-master-xinyu` → Import
3. 在 **Storage** 里创建 Postgres（Neon，免费档即可），Vercel 会自动注入 `DATABASE_URL`
4. Environment Variables 添加：`AUTH_SECRET`（随机长字符串）、`ADMIN_PASSWORD`（自定，≥6 位）、可选 `AI_PROVIDER` + API Key
5. Deploy → 得到形如 `https://acca-master-xinyu.vercel.app` 的永久 HTTPS 地址
6. 首次初始化数据库（本机执行一次，指向生产库）：
   ```powershell
   cd D:\ACCA-Master
   $env:DATABASE_URL="<Vercel/Neon 的连接串>"
   npm run db:pg:push     # 建表
   npm run db:pg:seed     # 导入 15 科目 / 1038 知识点 / 119 道题
   ```

### B. Render（Blueprint，含免费 Postgres）
1. https://dashboard.render.com → New → Blueprint → 选择本仓库（已提供 `render.yaml`）
2. 填写 `ADMIN_PASSWORD`、可选 AI Key → Apply
3. 构建命令会自动建表 + 导入种子数据；地址形如 `https://acca-master.onrender.com`

### C. 自托管（VPS / 群晖 / 家用主机，数据 100% 自己掌控）
```bash
git clone git@github.com:meminehobe24435-cmyk/acca-master-xinyu.git && cd acca-master-xinyu
docker build -t acca-master .
docker run -d --name acca-master -p 3000:3000 -v acca-data:/data \
  -e ADMIN_PASSWORD='你的口令' -e AUTH_SECRET='随机长字符串' acca-master
```
首次启动会自动建表并导入知识树与题库；`/data` 卷保存学习数据。

## 4. 唯一阻塞点（需要你本人授权一次）

我已完成代码改造、构建、测试、截图检查、GitHub 推送与部署配置，但**无法代替你注册/登录部署平台账号**：

> 生成"永久公网地址"必须在 Vercel / Render / Cloudflare 之一完成一次 GitHub 授权登录 + 创建数据库（免费档即可）。
> 这一步涉及账号与授权，我这边没有、也不应该持有你的平台凭据。

**在此之前，你现在的用法：**
- 手机/电脑直接打开 → https://binary-copper-entrance-filter.trycloudflare.com （本机开机时可用）
- 想换回稳定本地入口 → 双击 `D:\ACCA-Master\start-acca-master.cmd`
- 想恢复公网隧道 → 双击 `D:\ACCA-Master\start-public-tunnel.cmd`（会打印新的 HTTPS 地址）

只要你按第 3 节 A 或 B 操作一次（约 3 分钟），就能拿到永久 HTTPS 网址；如果需要我接手后续步骤，把平台访问令牌（Vercel Token 等）配置好，我可以直接完成剩余部署与验证。

## 5. 部署前测试记录（本地，2026-09-10）

```
npx tsc --noEmit     → PASS
npx next lint        → PASS（0 error）
npx vitest run       → 32/32 PASS（含 API 集成：注册→刷题→提交→收藏→错题→模考→统计→AI 降级）
npm run build        → PASS
Prisma（SQLite）      → in sync
Prisma（PostgreSQL）  → schema valid
视觉 QA              → 21 个页面 + 8 个交互流程全部 PASS，Console 无错误
```

## 6. 安全确认

- 管理后台：独立口令（`ADMIN_PASSWORD`，仅存服务器环境变量），未通过时页面 307 跳转登录页、API 返回 401；口令不进入前端 bundle。
- 学习端：无需登录（单用户模式），但**没有**暴露任何写库的管理接口。
- 未提交任何 Secret：`.env` 被 gitignore；仓库中只有 `.env.example` 占位模板。
- 考试模式：正确答案不下发浏览器，评分全部服务端完成（沿用 v1.0 设计）。
