"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminGeneratePage() {
  const [papers, setPapers] = useState<{ id: string; code: string; name: string }[]>([]);
  const [kpOptions, setKpOptions] = useState<{ id: string; title: string }[]>([]);
  const [form, setForm] = useState({ paper: "", kp: "", count: 10, difficulty: "3" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; ids: string[] } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/papers").then((r) => r.json()).then((d) => setPapers(d.papers ?? [])).catch(() => undefined);
  }, []);

  async function loadKps(code: string) {
    setForm((f) => ({ ...f, paper: code, kp: "" }));
    const res = await fetch(`/api/papers/${code}/tree`);
    if (res.ok) {
      const d = await res.json();
      const kps = (d.chapters ?? []).flatMap((c: { topics: { knowledgePoints: { id: string; title: string }[] }[] }) =>
        c.topics.flatMap((t) => t.knowledgePoints)
      );
      setKpOptions(kps);
    }
  }

  async function generate() {
    if (!form.paper) { setMsg("请选择科目"); return; }
    setBusy(true);
    setMsg("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper: form.paper, knowledgePointId: form.kp || undefined, count: Number(form.count), difficulty: Number(form.difficulty) }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(`⚠️ ${d.message ?? d.error ?? "生成失败"}`);
        return;
      }
      setResult({ created: d.created, ids: d.questionIds ?? [] });
      setMsg(`✅ 已生成 ${d.created} 道原创题（草稿状态），请到审核队列进行二次审核`);
    } catch {
      setMsg("⚠️ 生成失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">AI 批量生成题目</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          选择科目与知识点，AI 生成原创练习题（自动标注「AI-generated practice question」）。生成结果进入审核队列，由第二轮 AI 校验后人工发布。
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>科目</Label>
            <Select value={form.paper} onValueChange={loadKps}>
              <SelectTrigger><SelectValue placeholder="选择科目" /></SelectTrigger>
              <SelectContent>
                {papers.map((p) => <SelectItem key={p.id} value={p.code}>{p.code} {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>知识点（可选）</Label>
            <Select value={form.kp} onValueChange={(v) => setForm({ ...form, kp: v })}>
              <SelectTrigger><SelectValue placeholder="整科目随机" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">整科目随机</SelectItem>
                {kpOptions.map((k) => <SelectItem key={k.id} value={k.id}>{k.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>数量</Label>
            <Input type="number" min={1} max={50} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) || 10 })} />
          </div>
          <div className="space-y-1.5">
            <Label>难度</Label>
            <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((d) => <SelectItem key={d} value={String(d)}>{d} 级 · {["基础", "简单", "中等", "困难", "Exam"][d - 1]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "生成中（可能需要 1-2 分钟）…" : "开始生成"}
        </Button>
        {msg ? <p className="text-sm">{msg}</p> : null}
      </div>

      {result ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5">
          <p className="text-sm font-semibold text-success">✅ 成功生成 {result.created} 道题</p>
          <div className="mt-3 flex gap-2">
            <Link href="/admin/review">
              <Button size="sm"><Sparkles className="h-3.5 w-3.5" /> 去审核队列</Button>
            </Link>
            <Link href="/api_admin_questions" className="sr-only" />
          </div>
          <p className="mt-3 break-all text-[11px] text-muted-foreground">
            IDs: {result.ids.join(", ")}
          </p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        ⚠️ AI 生成的题目可能存在错误，必须经过审核（AI 校验 + 人工确认）后才能发布。AI 不会声称题目来自 ACCA 官方。
      </p>
    </div>
  );
}
