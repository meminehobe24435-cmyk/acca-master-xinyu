"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Lightbulb,
  Loader2,
  NotebookPen,
  RotateCcw,
  Star,
  XCircle,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DISPLAY_META } from "@/lib/display";
import { MarkdownContent } from "@/components/markdown-content";
import { QuestionAnswerArea, EmptyAnswer, isAnswerEmpty, type AnyAnswer } from "@/components/questions/answer-area";
import { AITutor } from "@/components/questions/ai-tutor";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIFFICULTY_META,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_EN,
  SOURCE_TYPES,
  REPORT_REASONS,
} from "@/lib/constants";
import { praiseForCorrect, gentleForWrong, restReminder } from "@/lib/encourage";
import { FishIcon, SparkIcon } from "@/components/brand/fish";
import type { PublicQuestion } from "@/lib/serializers";

interface AttemptResult {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  correctAnswer: string;
  explanationMd: string;
  optionsDetail?: { key: string; text: string; isCorrect: boolean; feedbackMd: string | null }[];
  rubric?: { point: string; marks: number; matched: boolean }[];
  modelAnswer?: string;
  keywords?: string[];
}

export function QuestionAnswerCard({
  questionId,
  mode = "PRACTICE",
  index,
  total,
  onPrev,
  onNext,
  onDone,
  onAnswered,
  enableShortcuts = false,
  autoFocus,
}: {
  questionId: string;
  mode?: string;
  index?: number;
  total?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onDone?: () => void;
  onAnswered?: (correct: 0 | 1 | null) => void;
  enableShortcuts?: boolean;
  autoFocus?: boolean;
}) {
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<AnyAnswer>(() => "");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [similar, setSimilar] = useState<PublicQuestion[] | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [unlocked, setUnlocked] = useState<string[]>([]);
  // ⭐🐟 温柔反馈
  const [praise, setPraise] = useState<{ text: string; streakText?: string } | null>(null);
  const [gentle, setGentle] = useState<string | null>(null);
  const streakRef = useRef(0);
  const focusStartRef = useRef(Date.now());
  const [restHint, setRestHint] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setSimilar(null);
    setAnswer(EmptyAnswer(""));
    setTimeSpent(0);
    startRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    try {
      const res = await fetch(`/api/questions/${questionId}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "题目加载失败");
      }
      const data = await res.json();
      setQuestion(data.question as PublicQuestion);
      setAnswer(EmptyAnswer(data.question.type));
      setFavorited(!!data.question.statuses?.favorited);
    } catch (e) {
      setError(e instanceof Error ? e.message : "题目加载失败");
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    load();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  // 轻量休息提醒：连续专注学习较久时提示一次，不打断考试模式
  useEffect(() => {
    if (mode === "MOCK") return;
    const t = setInterval(() => {
      const minutes = Math.floor((Date.now() - focusStartRef.current) / 60000);
      const hint = restReminder(minutes);
      if (hint) setRestHint(hint);
    }, 60000);
    return () => clearInterval(t);
  }, [mode]);

  async function submit() {
    if (!question || submitting || !answer || isAnswerEmpty(question.type, answer)) {
      showToast("请先作答");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/questions/${question.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer,
          timeSpentSec: Math.floor((Date.now() - startRef.current) / 1000),
          mode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "提交失败");
      setResult(data.result as AttemptResult);
      onAnswered?.(data.result.isCorrect ? 1 : 0);
      if (data.unlockedAchievements?.length) setUnlocked(data.unlockedAchievements);

      // ⭐🐟 温柔反馈：答对给夸奖（含连对加成），答错给鼓励而不是责备
      if (data.result.isCorrect) {
        streakRef.current += 1;
        setGentle(null);
        setPraise(praiseForCorrect(streakRef.current));
      } else {
        streakRef.current = 0;
        setPraise(null);
        setGentle(gentleForWrong());
      }

      if (!data.result.isCorrect) {
        // 拉取相似题
        fetch(`/api/questions/${question.id}/similar`)
          .then((r) => r.json())
          .then((d) => setSimilar(d.similar ?? []))
          .catch(() => undefined);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  function setSimilarVisible() {
    if (similar === null && question) {
      fetch(`/api/questions/${question.id}/similar`)
        .then((r) => r.json())
        .then((d) => setSimilar(d.similar ?? []))
        .catch(() => undefined);
    }
  }

  async function toggleFavorite() {
    if (!question) return;
    const res = await fetch(`/api/questions/${question.id}/favorite`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setFavorited(d.favorited);
      showToast(d.favorited ? "已收藏 ★" : "已取消收藏");
    } else {
      showToast("请先登录再收藏");
    }
  }

  async function openNote() {
    if (!question) return;
    setNoteOpen(true);
    setNoteLoading(true);
    try {
      const res = await fetch(`/api/questions/${question.id}/note`);
      const d = await res.json();
      setNoteText(d.note ?? "");
    } catch {
      setNoteText("");
    } finally {
      setNoteLoading(false);
    }
  }

  async function saveNote() {
    if (!question) return;
    const res = await fetch(`/api/questions/${question.id}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentMd: noteText }),
    });
    if (res.ok) {
      setNoteOpen(false);
      showToast(noteText.trim() ? "笔记已保存" : "笔记已删除");
    } else {
      showToast("保存失败，请先登录");
    }
  }

  async function submitReport(reason: string, detail: string) {
    if (!question) return;
    const res = await fetch(`/api/questions/${question.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, detail: detail || undefined }),
    });
    if (res.ok) {
      setReportOpen(false);
      showToast("已提交反馈，感谢你的帮助");
    } else {
      showToast("提交失败，请稍后再试");
    }
  }

  // 快捷键
  useEffect(() => {
    if (!enableShortcuts || !question) return;
    const q = question;
    const submitFn = submit;
    const nextFn = onNext;
    const prevFn = onPrev;
    const favFn = toggleFavorite;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const isChoice = ["SINGLE_CHOICE", "TRUE_FALSE", "CASE_MCQ"].includes(q.type);
      const idx = ["1", "2", "3", "4", "5"].indexOf(e.key);
      if (isChoice && idx >= 0) {
        const opt = q.options[idx];
        if (opt && !result) setAnswer(opt.key);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!result) submitFn();
        else nextFn?.();
        return;
      }
      if (e.key.toLowerCase() === "n") nextFn?.();
      if (e.key.toLowerCase() === "p") prevFn?.();
      if (e.key.toLowerCase() === "f") favFn();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableShortcuts, question, result, submit]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
        {error || "题目不存在"}
      </div>
    );
  }

  const meta = DISPLAY_META(question);

  return (
    <div className="space-y-4">
      {/* toast */}
      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg lg:bottom-8">
          {toast}
        </div>
      ) : null}

      {/* 休息提醒（轻量、可关闭、不打断考试）*/}
      {restHint ? (
        <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground/85">
          <span className="mt-0.5 shrink-0 text-primary">
            <FishIcon className="h-4 w-5" />
          </span>
          <p className="flex-1 leading-relaxed">{restHint}</p>
          <button
            onClick={() => setRestHint(null)}
            className="shrink-0 rounded-md px-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            知道了
          </button>
        </div>
      ) : null}

      {/* 题头信息 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="default" className="font-semibold">
          {question.meta.paperCode}
        </Badge>
        {question.meta.variant ? <Badge variant="secondary">{question.meta.variant}</Badge> : null}
        <Badge variant="outline">{QUESTION_TYPE_LABELS[question.type]}</Badge>
        <Badge className={DIFFICULTY_META[question.difficulty]?.className}>
          {DIFFICULTY_META[question.difficulty]?.label} {DIFFICULTY_META[question.difficulty]?.en}
        </Badge>
        <Badge variant="secondary">
          {question.marks} mark{question.marks > 1 ? "s" : ""}
        </Badge>
        {meta.standardReference ? <Badge variant="cyan">{meta.standardReference}</Badge> : null}
        {meta.taxYear ? <Badge variant="violet">Tax {meta.taxYear}</Badge> : null}
        <span className="ml-auto flex items-center gap-1 tabular-nums text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/70" />
          {formatDuration(timeSpent)}
        </span>
      </div>
      {question.meta.chapterTitle ? (
        <p className="text-xs text-muted-foreground">
          {question.meta.chapterTitle}
          {question.meta.topicTitle ? ` · ${question.meta.topicTitle}` : ""}
        </p>
      ) : null}

      {/* 题干 */}
      <div className="rounded-xl border bg-card p-5">
        <MarkdownContent content={question.textMd} />
      </div>

      {/* 答案交互区 */}
      {!result ? (
        <>
          <QuestionAnswerArea question={question} value={answer} onChange={setAnswer} />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={submit} disabled={submitting} size="lg" className="min-w-36">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "提交中…" : "提交答案"}
            </Button>
            <Button variant="outline" size="lg" onClick={toggleFavorite}>
              <Star className={cn("h-4 w-4", favorited && "fill-amber text-amber")} />
              {favorited ? "已收藏" : "收藏"}
            </Button>
            <Button variant="outline" size="lg" onClick={openNote}>
              <NotebookPen className="h-4 w-4" /> 笔记
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setReportOpen(true)} className="text-muted-foreground">
              <Flag className="h-4 w-4" /> 反馈
            </Button>
            {enableShortcuts ? (
              <span className="ml-auto hidden items-center gap-3 text-[11px] text-muted-foreground md:flex">
                <kbd className="rounded border bg-secondary px-1.5 py-0.5 font-mono">1-4</kbd> 选择
                <kbd className="rounded border bg-secondary px-1.5 py-0.5 font-mono">Enter</kbd> 提交
                <kbd className="rounded border bg-secondary px-1.5 py-0.5 font-mono">N</kbd> 下一题
                <kbd className="rounded border bg-secondary px-1.5 py-0.5 font-mono">P</kbd> 上一题
                <kbd className="rounded border bg-secondary px-1.5 py-0.5 font-mono">F</kbd> 收藏
              </span>
            ) : null}
          </div>
        </>
      ) : (
        /* ===== 解析区 ===== */
        <div className="space-y-4 acca-rise">
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              result.isCorrect
                ? "border-success/30 bg-success/5"
                : "border-amber/30 bg-amber/5"
            )}
          >
            {result.isCorrect ? (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <SparkIcon className="h-4 w-4" />
              </span>
            ) : (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
                <FishIcon className="h-4 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-base font-semibold",
                  result.isCorrect ? "text-success" : "text-foreground"
                )}
              >
                {result.isCorrect
                  ? `✅ ${praise?.text ?? "答对啦 ✨"}`
                  : `🐟 ${gentle ?? "这一题先留下来，下次它就不容易骗到你了。"}`}
              </p>
              {result.isCorrect && praise?.streakText ? (
                <p className="mt-1 text-sm font-medium text-primary">{praise.streakText}</p>
              ) : null}
              {!result.isCorrect ? (
                <p className="mt-1 text-xs text-muted-foreground">已自动收进错题本，过两天会提醒你复习 ⭐</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                得分 {result.score} / {result.maxScore} · 用时 {formatDuration(timeSpent)}
              </p>
            </div>
            {unlocked.length > 0 ? (
              <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-amber/10 px-3 py-1 text-xs font-medium text-amber">
                <Award className="h-3.5 w-3.5" /> 成就 ×{unlocked.length}
              </span>
            ) : null}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-success" /> 正确答案
            </p>
            <div className="rounded-lg bg-secondary/60 px-4 py-3 font-mono text-sm font-semibold">
              {result.correctAnswer}
            </div>

            {result.optionsDetail ? (
              <div className="mt-4 space-y-2">
                {result.optionsDetail.map((o) => (
                  <div
                    key={o.key}
                    className={cn(
                      "rounded-lg border p-3",
                      o.isCorrect
                        ? "border-success/40 bg-success/5"
                        : "border-border bg-card"
                    )}
                  >
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold",
                          o.isCorrect
                            ? "border-success bg-success/10 text-success"
                            : "border-border bg-secondary text-muted-foreground"
                        )}
                      >
                        {o.key}
                      </span>
                      {o.text}
                      {o.isCorrect ? <Badge variant="success" className="ml-auto">正确</Badge> : null}
                    </p>
                    {o.feedbackMd ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground/70">点评：</span>
                        {o.feedbackMd}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {result.rubric ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold">评分要点（关键词自动评分）</p>
                <div className="space-y-1.5">
                  {result.rubric.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                      {r.matched ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className="flex-1">{r.point}</span>
                      <Badge variant={r.matched ? "success" : "outline"}>{r.marks} 分</Badge>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  参考评分 {result.score}/{result.maxScore}。主观题分数可结合答案要点自行校准。
                </p>
              </div>
            ) : null}
          </div>

          {/* 解析正文 */}
          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-amber" /> 题目解析
            </p>
            <MarkdownContent content={result.explanationMd} />
          </div>

          {/* 相似题 */}
          {!result.isCorrect && similar && similar.length > 0 ? (
            <div className="rounded-xl border bg-card p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <RotateCcw className="h-4 w-4 text-primary" /> 相似题训练（同知识点 + 进阶）
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    href={`/question/${s.id}`}
                    className="group flex items-center gap-2 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <Badge variant="secondary" className="shrink-0 font-semibold">
                      {s.meta.paperCode}
                    </Badge>
                    <span className="line-clamp-1 flex-1 text-xs text-muted-foreground group-hover:text-foreground">
                      {s.meta.knowledgePointTitle ?? s.textMd.slice(0, 60)}
                    </span>
                    <Badge className={DIFFICULTY_META[s.difficulty]?.className}>{DIFFICULTY_META[s.difficulty]?.label}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* AI Tutor */}
          <AITutor questionId={question.id} userAnswer={JSON.stringify(answer)} />

          {/* 操作区 */}
          <div className="flex items-center gap-2">
            {onPrev ? (
              <Button variant="outline" onClick={onPrev}>
                <ChevronLeft className="h-4 w-4" /> 上一题
              </Button>
            ) : null}
            {onNext ? (
              <Button size="lg" onClick={onNext} className="min-w-36">
                下一题 <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}
            {onDone ? (
              <Button size="lg" onClick={onDone} className="min-w-36">
                完成本组 <CheckCircle2 className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="outline" onClick={toggleFavorite} className="ml-auto">
              <Star className={cn("h-4 w-4", favorited && "fill-amber text-amber")} />
              {favorited ? "已收藏" : "收藏"}
            </Button>
            <Button variant="outline" onClick={openNote}>
              <NotebookPen className="h-4 w-4" /> 笔记
            </Button>
            <Button variant="ghost" onClick={() => setReportOpen(true)} className="text-muted-foreground">
              <Flag className="h-4 w-4" /> 反馈
            </Button>
          </div>

          {similar === null && !result.isCorrect ? (
            <Button variant="ghost" size="sm" onClick={setSimilarVisible} className="text-muted-foreground">
              查看相似练习题
            </Button>
          ) : null}
        </div>
      )}

      {/* 笔记对话框 */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>做题笔记</DialogTitle>
            <DialogDescription>支持 Markdown：**加粗**、- 列表、$公式$、|表格|</DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="记录你在这道题上的收获…"
            rows={10}
            disabled={noteLoading}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>取消</Button>
            <Button onClick={saveNote}>保存笔记</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 题目报告 */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        onSubmit={submitReport}
      />
    </div>
  );
}

function ReportDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (reason: string, detail: string) => void;
}) {
  const [reason, setReason] = useState("WRONG_ANSWER");
  const [detail, setDetail] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>报告题目问题</DialogTitle>
          <DialogDescription>你的反馈将进入后台处理队列，帮助提升题库质量。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>问题类型</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_REASONS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>补充说明（可选）</Label>
            <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4} placeholder="例如：我认为答案应为 C，因为…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => onSubmit(reason, detail)}>提交反馈</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
