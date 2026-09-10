/**
 * 生成 PostgreSQL 版本的 Prisma schema（用于生产部署）
 * 用法：node scripts/prepare-postgres.mjs
 * 输出：prisma/schema.postgresql.prisma
 */
import fs from "node:fs";
import path from "node:path";

const src = path.resolve("prisma", "schema.prisma");
const dst = path.resolve("prisma", "schema.postgresql.prisma");

let schema = fs.readFileSync(src, "utf8");

if (!schema.includes('provider = "sqlite"')) {
  console.error("未在 schema.prisma 中找到 sqlite provider，请检查文件是否被改动。");
  process.exit(1);
}

schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
schema = `// 自动生成，请勿手动编辑 —— 由 scripts/prepare-postgres.mjs 从 prisma/schema.prisma 转换而来\n${schema}`;

fs.writeFileSync(dst, schema, "utf8");
console.log(`已生成 ${dst}`);
