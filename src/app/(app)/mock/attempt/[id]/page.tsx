"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Flag, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/markdown-content";
import { QuestionAnswerArea, EmptyAnswer, type AnyAnswer } from "@/components/questions/answer-area";
import { formatClock } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PublicQuestion } from "@/lib/serializers";

interface SectionMeta { id: string; name: string; count: number; marksPerQuestion: number; }

interface AttemptInfo {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  durationMin: number;
  totalMarks: number;
  paperCode: string;
  paperName: string;
}

export default function MockAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const id = useRef<string | null>(null);
  if (id.current === null) {
    params.then((p) => { id.current = p.id; }).catch(() => undefined);
  }

  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  const [questions, setQuestions] = useState<{ seq: number; question: PublicQuestion }[]>([]);
  const [sections, setSections] = useState<SectionMeta[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnyAnswer>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    (async () => {
      let aid = id.current;
      if (!aid) {
        const p = await params;
        aid = p.id;
      }
      if (!aid) return;
      setAttemptId(aid);
      const res = await fetch(`/api/mock/attempt/${aid}`);
      if (!res.ok) {
        router.push("/mock");
        return;
      }
      const data = await res.json();
      setAttempt(data.attempt);
      setQuestions(data.questions ?? []);
      setSections(data.sections ?? []);
      setAnswers(data.savedAnswers ?? {});
      setLoading(false);
    })();
  }, [params, router]);

  // 倒计时
  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      const remain = Math.floor((new Date(attempt.endAt).getTime() - Date.now()) / 1000);
      setRemaining(Math.max(0, remain));
      if (remain <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        submit(true);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (!attemptId || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      try {
        const res = await fetch(`/api/mock/attempt/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersRef.current, submitEarly: !auto }),
        });
        if (res.ok || res.status === 409) {
          router.push(`/mock/attempt/${attemptId}/result`);
        }
      } catch {
        submittedRef.current = false;
        setSubmitting(false);
      }
    },
    [attemptId, router]
  );

  function updateAnswer(qid: string, v: AnyAnswer) {
    setAnswers((a) => ({ ...a, [qid]: v }));
  }

  function toggleFlag(qid: string) {
    setFlags((f) => {
      const next = new Set(f);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }

  if (loading || !attempt || questions.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> 正在加载考试…
        </div>
      </div>
    );
  }

  const q = questions[current];
  const qid = q.question.id;
  const answer = answers[qid] ?? EmptyAnswer(q.question.type);
  const answeredCount = questions.filter((x) => {
    const v = answers[x.question.id];
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v).length > 0;
    return false;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* 顶部：计时 + 进度 */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {attempt.paperCode}
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">{attempt.paperName} Mock</p>
            <p className="text-xs text-muted-foreground">
              已答 {answeredCount}/{questions.length} · 标记 {flags.size}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums",
              remaining < 300 ? "animate-pulse bg-destructive/10 text-destructive" : "bg-secondary text-foreground"
            )}
            title="剩余时间"
          >
            {formatClock(remaining)}
          </div>
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} 交卷
          </Button>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex min-h-0 flex-1">
        {/* 题目区 */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="default">{q.question.meta.paperCode}</Badge>
              <Badge variant="outline">第 {q.seq} 题</Badge>
              <Badge variant="secondary">{q.question.marks} 分</Badge>
              <span className="text-muted-foreground">
                {q.question.meta.chapterTitle ?? ""}
                {q.question.meta.knowledgePointTitle ? ` · ${q.question.meta.knowledgePointTitle}` : ""}
              </span>
              <button
                onClick={() => toggleFlag(qid)}
                className={cn(
                  "ml-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  flags.has(qid) ? "border-amber text-amber" : "border-border text-muted-foreground hover:border-amber/60"
                )}
              >
                <Flag className="h-3 w-3" /> {flags.has(qid) ? "已标记" : "标记"}
              </button>
            </div>
            <div className="mb-5 rounded-xl border bg-card p-5">
              <MarkdownContent content={q.question.textMd} />
            </div>
            <QuestionAnswerArea question={q.question} value={answer} onChange={(v) => updateAnswer(qid, v)} />
            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
                <ChevronLeft className="h-4 w-4" /> 上一题
              </Button>
              <span className="text-xs text-muted-foreground">{current + 1} / {questions.length}</span>
              {current === questions.length - 1 ? (
                <Button onClick={() => setConfirmOpen(true)}>
                  <CheckCircle2 className="h-4 w-4" /> 完成并交卷
                </Button>
              ) : (
                <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
                  下一题 <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* 导航（桌面右侧 / 移动抽屉式置底折叠） */}
        {questions.length > 8 ? (
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-l bg-card/60 p-4 scrollbar-thin lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Flag for Review
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((x, i) => {
                const v = answers[x.question.id];
                const has = typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : v && typeof v === "object" ? Object.keys(v).length > 0 : false;
                return (
                  <button
                    key={x.question.id}
                    onClick={() => setCurrent(i)}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-md border text-xs font-medium tabular-nums",
                      i === current
                        ? "border-primary bg-primary text-primary-foreground"
                        : has
                          ? "border-success/50 bg-success/10 text-success"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {i + 1}
                    {flags.has(x.question.id) ? (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-background bg-amber-400" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success/60" /> 已作答</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> 已标记</span>
              <span>倒计时结束将自动交卷。</span>
            </p>
          </aside>
        ) : null}
      </div>

      {/* 移动端题号条 */}
      <div className="shrink-0 border-t bg-card p-3 lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {questions.map((x, i) => {
            const v = answers[x.question.id];
            const has = typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : v && typeof v === "object" ? Object.keys(v).length > 0 : false;
            return (
              <button
                key={x.question.id}
                onClick={() => setCurrent(i)}
                className={cn(
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-medium",
                  i === current
                    ? "border-primary bg-primary text-primary-foreground"
                    : has
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                {i + 1}
                {flags.has(x.question.id) ? <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 交卷确认 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认交卷？</DialogTitle>
            <DialogDescription>
              已作答 {answeredCount} / {questions.length} 题，剩余时间 {formatClock(remaining)}。交卷后不可修改。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>继续答题</Button>
            <Button variant="success" onClick={() => submit(false)}>
              <CheckCircle2 className="h-4 w-4" /> 确认交卷
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {flags.size === 0 && questions.length > 1 ? (
        <div className="fixed bottom-20 right-4 hidden lg:bottom-6 lg:block">
          <Button variant="outline" size="sm" onClick={() => setFlags(new Set(questions.map((x) => x.question.id)))}>
            <Flag className="h-3.5 w-3.5" /> 全选标记稍后检查
          </Button>
        </div>
      ) : null}
    </div>
  );
}
