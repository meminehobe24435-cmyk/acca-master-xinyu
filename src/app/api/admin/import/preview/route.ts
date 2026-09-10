import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdminApi } from "@/lib/auth";
import { parseImportBuffer, summarizeParse } from "@/lib/import/parse";
import { fnv1a, normalizeText } from "@/lib/utils";

// POST /api/admin/import/preview — 解析上传文件并预览（不落库）
export async function POST(req: NextRequest) {
  const guard = await guardAdminApi();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }
  const buffer = await file.arrayBuffer();
  const rows = await parseImportBuffer(buffer, file.name);
  const summary = summarizeParse(rows);

  // 数据库查重（取 hash 在全部行中）
  const hashes = rows
    .filter((r) => r.data?.question)
    .map((r) => `import-${fnv1a(normalizeText(`${r.data!.paper}|${r.data!.question}`))}`);
  const existing = hashes.length
    ? await prisma.question.findMany({
        where: { questionHash: { in: hashes } },
        select: { questionHash: true },
      })
    : [];
  const existingSet = new Set(existing.map((e) => e.questionHash));

  return NextResponse.json({
    fileName: file.name,
    summary,
    existingCount: existingSet.size,
    rows: rows.slice(0, 500).map((r) => ({
      row: r.row,
      status: r.status,
      message: r.message,
      preview: r.data ? r.data.question.slice(0, 120) : "",
      duplicate: r.data ? existingSet.has(`import-${fnv1a(normalizeText(`${r.data.paper}|${r.data.question}`))}`) : false,
      data: r.data ?? null,
    })),
  });
}

export const dynamic = "force-dynamic";
