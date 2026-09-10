# ⭐🐟 ACCA Master —— 自托管镜像（含持久化 SQLite 卷）
# 说明：适合 VPS / 群晖 / 本地长期运行；数据保存在 /data 卷中，重建容器不丢数据。
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1

# ---- 依赖 ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ---- 构建 ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- 运行 ----
FROM base AS runner
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/acca-master.db"
ENV PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/content ./content
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
VOLUME ["/data"]
EXPOSE 3000
# 首次启动：建表 + 导入知识树/题库；随后启动 Next.js
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx scripts/seed.ts && npm run start"]
