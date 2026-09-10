"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS } from "@/lib/constants";

interface Opt { key: string; text: string; isCorrect: boolean; feedbackMd: string; }

const NUMERIC_JSON_EXAMPLE = '{"value":"12500","tolerancePercent":1}';
const SINGLE_JSON_EXAMPLE = '["A"]';
const MULTI_JSON_EXAMPLE = '["A","C"]';

export function AdminQuestionForm({ params }: { params?: Promise<{ id?: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [papers, setPapers] = useState<{ id: string; code: string; name: string }[]>([]);
  const [form, setForm] = useState({
    paper: "FR",
    variant: "GLO",
    type: "SINGLE_CHOICE",
    difficulty: "3",
    textMd: "",
    answerJson: "[\"A\"]",
    explanationMd: "",
    marks: "2",
    status: "draft",
    standardReference: "",
  });
  const [options, setOptions] = useState<Opt[]>([
    { key: "A", text: "", isCorrect: true, feedbackMd: "" },
    { key: "B", text: "", isCorrect: false, feedbackMd: "" },
    { key: "C", text: "", isCorrect: false, feedbackMd: "" },
    { key: "D", text: "", isCorrect: false, feedbackMd: "" },
  ]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/papers");
      if (res.ok) setPapers((await res.json()).papers ?? []);
      // 编辑模式
      const p = await params;
      if (!p?.id) {
        setLoading(false);
        return;
      }
      setId(p.id);
      const qres = await fetch(`/api/admin/questions/${p.id}`);
      if (qres.ok) {
        const d = await qres.json();
        setForm({
          paper: d.paperCode ?? "FR",
          variant: "GLO",
          type: d.type ?? "SINGLE_CHOICE",
          difficulty: String(d.difficulty ?? 3),
          textMd: d.textMd ?? "",
          answerJson: d.answerJson ?? "[\"A\"]",
          explanationMd: d.explanationMd ?? "",
          marks: String(d.marks ?? 2),
          status: d.status ?? "draft",
          standardReference: d.standardReference ?? "",
        });
        if (Array.isArray(d.options) && d.options.length) {
          setOptions(d.options.map((o: { key: string; text: string; isCorrect: boolean; feedbackMd?: string }) => ({
            key: o.key, text: o.text, isCorrect: o.isCorrect, feedbackMd: o.feedbackMd ?? "",
          })));
        }
      }
      setLoading(false);
    })();
  }, [params]);

  async function save() {
    setSaving(true);
    setMsg("");
    const body = { ...form, difficulty: Number(form.difficulty), marks: Number(form.marks) };
    let res: Response;
    if (id) {
      res = await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textMd: body.textMd,
          answerJson: body.answerJson,
          explanationMd: body.explanationMd,
          difficulty: body.difficulty,
          marks: body.marks,
          status: body.status,
          standardReference: body.standardReference,
        }),
      });
      if (res.ok && ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "CASE_MCQ"].includes(body.type)) {
        await fetch(`/api/admin/questions/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ options }),
        });
      }
    } else {
      res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper: body.paper,
          type: body.type,
          difficulty: body.difficulty,
          textMd: body.textMd,
          answerJson: body.answerJson,
          explanationMd: body.explanationMd,
          marks: body.marks,
          status: body.status,
          standardReference: body.standardReference || undefined,
          options: ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "CASE_MCQ"].includes(body.type) ? options : undefined,
        }),
      });
    }
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push("/admin/questions");
      router.refresh();
    } else {
      setMsg(`⚠️ ${d.error ?? "保存失败"}`);
    }
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-muted-foreground">加载中…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>科目</Label>
              <Select value={form.paper} onValueChange={(v) => setForm({ ...form, paper: v })} disabled={!!id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {papers.map((p) => <SelectItem key={p.id} value={p.code}>{p.code} {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>题型</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>难度</Label>
              <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((d) => <SelectItem key={d} value={String(d)}>{d} 级</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>标准引用（如 IFRS 15）</Label>
              <Input value={form.standardReference} onChange={(e) => setForm({ ...form, standardReference: e.target.value })} placeholder="IFRS 15 / IAS 16 / ISA 500" />
            </div>
            <div className="space-y-1.5">
              <Label>分值</Label>
              <Input type="number" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="published">发布</SelectItem>
                  <SelectItem value="archived">归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Label>题干（Markdown + $LaTeX$）</Label>
          <Textarea rows={5} value={form.textMd} onChange={(e) => setForm({ ...form, textMd: e.target.value })} className="mt-1.5 font-mono text-sm" />
        </div>

        {["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "CASE_MCQ"].includes(form.type) ? (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <Label>选项（勾选 = 正确项）</Label>
              <Button
                size="sm" variant="outline"
                onClick={() => setOptions((o) => [...o, { key: String.fromCharCode(65 + o.length), text: "", isCorrect: false, feedbackMd: "" }])}
              >
                <Plus className="h-3.5 w-3.5" /> 添加选项
              </Button>
            </div>
            <div className="space-y-3">
              {options.map((o, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={o.isCorrect}
                      onChange={() => setOptions(options.map((x, j) => (j === i ? { ...x, isCorrect: !x.isCorrect } : x)))}
                      aria-label="正确项"
                    />
                    <span className="w-6 font-mono text-xs font-bold">{o.key}</span>
                    <Input value={o.text} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="选项内容" className="flex-1" />
                    <Button
                      size="icon-sm" variant="ghost"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      disabled={options.length <= 2}
                      aria-label="删除选项"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={o.feedbackMd}
                    onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, feedbackMd: e.target.value } : x)))}
                    placeholder="该选项点评（正确说明为什么对，错误说明为什么错）"
                    className="mt-2 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <Label>答案 JSON（参考 content/README.md 约定）</Label>
            <Textarea rows={3} value={form.answerJson} onChange={(e) => setForm({ ...form, answerJson: e.target.value })} className="mt-1.5 font-mono text-xs" />
          </div>
        )}

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Label>解析（Markdown）</Label>
          <Textarea rows={10} value={form.explanationMd} onChange={(e) => setForm({ ...form, explanationMd: e.target.value })} className="mt-1.5 font-mono text-sm" />
        </div>
      </div>

      <div className="space-y-4">
        {msg ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{msg}</p> : null}
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? "保存中…" : id ? "保存修改" : "创建题目"}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => router.back()}>取消</Button>
        <div className="rounded-xl border border-dashed p-4 text-xs leading-relaxed text-muted-foreground">
          <p>单选题答案 JSON 示例：<code className="rounded bg-secondary px-1 py-0.5 font-mono">{SINGLE_JSON_EXAMPLE}</code>；多选：<code className="rounded bg-secondary px-1 py-0.5 font-mono">{MULTI_JSON_EXAMPLE}</code>；数字题：<code className="rounded bg-secondary px-1 py-0.5 font-mono">{NUMERIC_JSON_EXAMPLE}</code>。</p>
          <p className="mt-2">主观题评分要点以 rubric 数组表达（参考 content/README.md）。</p>
        </div>
      </div>
    </div>
  );
}
