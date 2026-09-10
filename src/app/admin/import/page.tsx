"use client";

import { useState } from "react";
import { Download, FileUp, Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

interface PreviewRow {
  row: number;
  status: string;
  message: string;
  preview: string;
  duplicate: boolean;
  data: Record<string, unknown> | null;
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    fileName: string;
    summary: { total: number; ok: number; warn: number; err: number };
    existingCount: number;
    rows: PreviewRow[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [committed, setCommitted] = useState<number | null>(null);

  async function parse() {
    if (!file) return;
    setBusy(true);
    setMsg("");
    setCommitted(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/import/preview", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        setMsg(`⚠️ ${d.error ?? "解析失败"}`);
        return;
      }
      setPreview(d);
    } catch {
      setMsg("⚠️ 解析失败，请检查文件");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    try {
      const okRows = preview.rows.filter((r) => r.status === "OK" && !r.duplicate);
      // 重新提交完整 rows（用原始解析结果，这里用预览行近似——完整行由服务端重新解析兜底）
      const res = await fetch("/api/admin/import/commit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: preview.fileName,
          format: preview.fileName.split(".").pop(),
          rows: okRows.map((r) => ({ row: r.row, status: "OK", data: r.data })),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(`⚠️ ${d.error ?? "导入失败"}`);
        return;
      }
      setCommitted(d.created);
      setMsg(`✅ 已创建 ${d.created} 道草稿题，失败 ${d.failed} 条`);
      setPreview(null);
    } catch {
      setMsg("⚠️ 导入失败");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const rows = [
      ["paper", "variant", "chapter", "topic", "knowledge_point", "type", "difficulty", "question", "option_a", "option_b", "option_c", "option_d", "answer", "explanation", "marks", "source"],
      ["FR", "GLO", "08", "Revenue recognition", "IFRS 15 - Five-step model", "单选", "3", "An entity sells goods on credit for $100,000 with terms 30 days. No performance obligations remain. Under IFRS 15, when should revenue be recognised?", "On delivery of goods", "On receipt of cash", "When the customer receives the invoice", "At contract inception", "A", "## 正确答案\n\nA\n\n## 为什么\n\n控制权转移时确认收入...", "2", "ACCA Master 模板"],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "question-import-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">批量导入题库</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            支持 CSV / XLSX / JSON；导入前先解析预览（正常 / 警告 / 错误定位），通过后再入库为「草稿」状态。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4" /> 下载 CSV 模板
        </Button>
      </div>

      <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
        <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
        <label className="mt-4 inline-block cursor-pointer rounded-xl border bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:border-primary/40">
          {file ? file.name : "选择文件（.csv / .xlsx / .json）"}
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.json,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={parse} disabled={!file || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            解析预览
          </Button>
        </div>
        {file && !preview ? (
          <p className="mt-3 text-xs text-muted-foreground">
            列名支持：paper/variant/chapter/topic/knowledge_point/type/difficulty/question/option_a~e/answer/explanation/marks/source（也支持中文表头）
          </p>
        ) : null}
        {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      </div>

      {preview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "总计", value: preview.summary.total, cls: "text-foreground" },
              { label: "正常", value: preview.summary.ok, cls: "text-emerald-600" },
              { label: "警告", value: preview.summary.warn, cls: "text-amber-500" },
              { label: "错误", value: preview.summary.err, cls: "text-rose-500" },
              { label: "已有重复", value: preview.existingCount, cls: "text-muted-foreground" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4 text-center shadow-sm">
                <p className={`text-2xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">行号</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">预览</th>
                  <th className="px-3 py-2">提示</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">Row {r.row}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.status === "OK" ? "success" : r.status === "WARN" ? "warning" : "destructive"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="max-w-sm truncate px-3 py-2 text-xs">{r.preview || "—"}</td>
                    <td className="max-w-xs px-3 py-2 text-xs text-muted-foreground">
                      {r.message}
                      {r.duplicate ? " ⚠ 与库中已有题目重复" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="success" onClick={commit} disabled={busy || preview.summary.err > 0}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              导入 {preview.summary.ok} 道正常题目
            </Button>
            <p className="text-xs text-muted-foreground">错误行不会导入；警告行导入后可在审核队列中补充。</p>
          </div>
        </div>
      ) : null}

      {!file && !preview && committed === null ? (
        <EmptyState
          title="尚无导入任务"
          description="先下载模板填写题目，或直接使用 content/questions/*.json 的格式导出批量 JSON。"
        />
      ) : null}
    </div>
  );
}
