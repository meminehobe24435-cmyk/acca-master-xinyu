"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PAPER_LEVELS } from "@/lib/constants";

interface PaperInfo {
  id: string;
  code: string;
  name: string;
  nameCn: string | null;
  level: string;
  examDurationMin: number;
  passMark: number;
  examConfig: { sections: { id: string; name: string; count: number; marksPerQuestion: number; sectionMarks: number }[] } | null;
  questionCount: number;
  variants: { id: string; code: string; label: string }[];
}

export default function MockPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [papers, setPapers] = useState<PaperInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const preselected = sp.get("paper");

  useEffect(() => {
    fetch("/api/mock/papers")
      .then((r) => r.json())
      .then((d) => setPapers(d.papers ?? []))
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, []);

  async function start(paper: PaperInfo) {
    setStarting(paper.code);
    setError("");
    try {
      const res = await fetch("/api/mock/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper: paper.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "创建考试失败");
        return;
      }
      router.push(`/mock/attempt/${data.attemptId}`);
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setStarting(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const ordered = [...papers].sort((a, b) => {
    if (a.code === preselected) return -1;
    if (b.code === preselected) return 1;
    return a.code.localeCompare(b.code);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">模拟考试 Mock Exam</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          按官方考试结构自动组卷：时间、题型、Section 结构均按 ACCA 官方考制配置；开始后进入全屏考试模式，支持答案标记与自动交卷。
        </p>
        {error ? <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ordered.map((p) => (
          <Card key={p.id} className="card-hover flex flex-col">
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {p.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {PAPER_LEVELS[p.level]?.en ?? p.level}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {(p.examConfig?.sections ?? []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Section {s.id} · {s.count} 题 × {s.marksPerQuestion} 分
                    </span>
                    <Badge variant="outline">{s.sectionMarks} 分</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" /> {p.examDurationMin} 分钟
                </span>
                <span>
                  题库 {p.questionCount} 题 · 50 分通过
                </span>
              </div>
              <Button
                className="mt-4 w-full"
                disabled={starting !== null}
                onClick={() => start(p)}
              >
                {starting === p.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
                {starting === p.code ? "组卷中…" : "开始模拟考试"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        注意：模拟考试题目来自本站原创题库，组卷逻辑模拟官方 Section 结构；不能保证与真实考试难度分布完全一致。
      </p>
    </div>
  );
}
