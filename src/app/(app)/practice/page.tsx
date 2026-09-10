"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  LayoutGrid,
  ListChecks,
  Loader2,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionAnswerCard } from "@/components/questions/question-answer-card";
import { QuestionNavigator, SessionTimer } from "@/components/questions/question-navigator";
import { Sheet } from "@/components/ui/sheet";
import { FishIcon, SparkIcon } from "@/components/brand/fish";
import { pick } from "@/lib/encourage";
import { cn, formatDuration } from "@/lib/utils";
import { PRACTICE_MODES } from "@/lib/constants";

interface MetaPaper { id: string; code: string; name: string; }
interface TreeNode {
  id: string;
  code: string;
  title: string;
  questionCount: number;
  topics: { id: string; title: string; questionCount: number; knowledgePoints: { id: string; title: string }[] }[];
}

export default function PracticePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<string>(sp.get("mode") ?? "smart");
  const [paper, setPaper] = useState<string>(sp.get("paper") ?? "");
  const [chapter, setChapter] = useState<string>(sp.get("chapter") ?? "");
  const [kp, setKp] = useState<string>("");
  const [count, setCount] = useState(20);
  const [papers, setPapers] = useState<MetaPaper[]>([]);
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);

  // runner 状态
  const [runner, setRunner] = useState<{ ids: string[]; mode: string; label: string } | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState<(number | null)[]>([]);
  const [sessionStart, setSessionStart] = useState(() => Date.now());
  const [sessionSec, setSessionSec] = useState(0);
  const [loadingIds, setLoadingIds] = useState(false);
  const [summary, setSummary] = useState<{ correct: number; wrong: number; total: number } | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [startLine, setStartLine] = useState<string>("");

  useEffect(() => {
    const t = setInterval(() => setSessionSec(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [sessionStart]);

  useEffect(() => {
    fetch("/api/papers")
      .then((r) => r.json())
      .then((d) => setPapers(d.papers ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!paper) { setTree(null); return; }
    setLoadingTree(true);
    fetch(`/api/papers/${paper}/tree`)
      .then((r) => r.json())
      .then((d) => setTree(d.chapters ?? []))
      .catch(() => setTree([]))
      .finally(() => setLoadingTree(false));
  }, [paper]);

  const selectedPaper = useMemo(() => papers.find((p) => p.id === paper), [papers, paper]);
  const currentChapter = useMemo(
    () => (tree ?? []).find((c) => c.id === chapter) ?? null,
    [tree, chapter]
  );
  const kpOptions = useMemo(
    () => currentChapter?.topics.flatMap((t) => t.knowledgePoints) ?? [],
    [currentChapter]
  );

  async function startSession() {
    setLoadingIds(true);
    setSummary(null);
    setNavOpen(false);
    setStartLine(pick("start"));
    try {
      const params = new URLSearchParams({
        mode,
        count: String(count),
        ...(paper ? { paper } : {}),
        ...(chapter ? { chapter } : {}),
        ...(kp ? { kp } : {}),
      });
      const res = await fetch(`/api/practice/session?${params.toString()}`);
      if (!res.ok) throw new Error("加载题目失败");
      const data = await res.json();
      if (!data.questionIds.length) {
        throw new Error("没有匹配的题目，请调整筛选条件");
      }
      const label =
        mode === "chapter" && selectedPaper
          ? `${selectedPaper.code} · 章节刷题`
          : mode === "knowledge" && selectedPaper
            ? `${selectedPaper.code} · 知识点刷题`
            : mode === "smart"
              ? "智能刷题 Smart Practice"
              : mode === "mistakes"
                ? "错题重刷"
                : mode === "favorites"
                  ? "收藏题"
                  : "随机刷题";
      setRunner({ ids: data.questionIds, mode, label });
      setIds(data.questionIds);
      setCurrent(0);
      setAnswered(Array(data.questionIds.length).fill(null));
      setSessionStart(Date.now());
      setSessionSec(0);
    } catch (e) {
      alert(e instanceof Error ? e.message : "加载题目失败");
    } finally {
      setLoadingIds(false);
    }
  }

  if (runner) {
    const total = ids.length;
    const correctness = answered.filter((a) => a === 1).length;
    if (summary) {
      return (
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-500/10 text-primary">
                <SparkIcon className="absolute -right-1 -top-1 h-4 w-4 text-amber" />
                <FishIcon className="h-7 w-9" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {summary.wrong === 0 ? "这一组收好啦 ✨" : "这一组完成 ✨"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {runner.label} · {summary.total} 题已作答
              </p>
              <div className="mx-auto mt-5 rounded-xl bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/85">
                {pick("sessionComplete")}
                {summary.wrong === 0 ? " 全对，今天的状态很好 ⭐" : ` 错的 ${summary.wrong} 题已经收进错题本，过两天会提醒你复习。`}
              </div>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
                <div className="rounded-xl border p-4">
                  <p className="text-2xl font-bold text-success">{summary.correct}</p>
                  <p className="mt-1 text-xs text-muted-foreground">答对</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-2xl font-bold text-amber">{summary.wrong}</p>
                  <p className="mt-1 text-xs text-muted-foreground">待复习</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-2xl font-bold">
                    {Math.round((summary.correct / Math.max(1, summary.total)) * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">正确率</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                总用时 {formatDuration(sessionSec)} · 掌握度与错题计划已自动更新
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Button onClick={() => { setRunner(null); setIds([]); }} variant="outline">
                  返回刷题配置
                </Button>
                <Button
                  onClick={() => {
                    setSummary(null);
                    setCurrent(0);
                    setAnswered(Array(total).fill(null));
                    setSessionStart(Date.now());
                    setSessionSec(0);
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> 再来一组
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const jump = (i: number) => setCurrent(Math.max(0, Math.min(total - 1, i)));
    const answeredCount = answered.filter((a) => a !== null).length;

    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {/* 手机：进度吸顶条 + 题号抽屉；桌面：标题行 */}
          <div className="sticky top-14 z-30 -mx-4 mb-3 border-b bg-background/90 px-4 py-2 backdrop-blur lg:static lg:mx-0 lg:mb-4 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
            <div className="flex items-center gap-3">
              <h1 className="hidden text-lg font-bold tracking-tight lg:block">{runner.label}</h1>
              <Badge variant="outline" className="lg:hidden">
                {current + 1} / {total}
              </Badge>
              <span className="text-xs text-muted-foreground lg:text-sm">
                <SessionTimer seconds={sessionSec} />
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                已答 {answeredCount}/{total}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-8 text-xs lg:hidden"
                onClick={() => setNavOpen(true)}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> 题号
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden text-muted-foreground lg:ml-auto lg:inline-flex"
                onClick={() => {
                  const done = answered.filter((a) => a !== null).length;
                  setSummary({ correct: correctness, wrong: done - correctness, total: done });
                }}
              >
                结束并查看结果
              </Button>
            </div>
            {/* 手机进度条 */}
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary lg:hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-500 transition-all"
                style={{ width: `${((current + 1) / Math.max(1, total)) * 100}%` }}
              />
            </div>
          </div>

          {startLine ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm leading-relaxed text-foreground/85 lg:mb-4">
              <FishIcon className="mt-0.5 h-4 w-5 shrink-0 text-primary" />
              <span>{startLine}</span>
            </div>
          ) : null}

          <QuestionAnswerCard
            key={`${runner.mode}-${ids[current]}`}
            questionId={ids[current]}
            mode={runner.mode.toUpperCase()}
            onPrev={current > 0 ? () => jump(current - 1) : undefined}
            onNext={current < total - 1 ? () => jump(current + 1) : undefined}
            onDone={() =>
              setSummary({
                correct: correctness,
                wrong: answered.filter((a) => a === 0).length,
                total: answered.filter((a) => a !== null).length,
              })
            }
            onAnswered={(state) =>
              setAnswered((prev) => {
                const next = [...prev];
                next[current] = state;
                return next;
              })
            }
            enableShortcuts
          />
        </div>

        {/* 桌面端题号导航 */}
        <div className="hidden space-y-4 lg:sticky lg:top-6 lg:block lg:self-start">
          <QuestionNavigator total={total} current={current} answered={answered} onJump={jump} />
        </div>

        {/* 手机端题号抽屉 */}
        <Sheet open={navOpen} onOpenChange={setNavOpen} title={`题目导航 · ${answeredCount}/${total} 已作答`}>
          <QuestionNavigator
            total={total}
            current={current}
            answered={answered}
            onJump={(i) => {
              jump(i);
              setNavOpen(false);
            }}
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setNavOpen(false);
                const done = answered.filter((a) => a !== null).length;
                setSummary({ correct: correctness, wrong: done - correctness, total: done });
              }}
            >
              结束并查看结果
            </Button>
          </div>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">刷题 ⭐🐟</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择模式与范围，系统为你智能组题（优先推送高频考点、薄弱知识点与近期错题）
        </p>
      </div>

      {/* 模式选择 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {PRACTICE_MODES.map((m) => {
          const active = mode === m.id;
          const icons: Record<string, React.ReactNode> = {
            smart: <Sparkles className="h-4 w-4" />,
            chapter: <BookOpen className="h-4 w-4" />,
            knowledge: <Target className="h-4 w-4" />,
            random: <Shuffle className="h-4 w-4" />,
            mistakes: <RotateCcw className="h-4 w-4" />,
            favorites: <Star className="h-4 w-4" />,
            exam: <Timer className="h-4 w-4" />,
          };
          return (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                if (m.id === "exam") router.push("/mock");
              }}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 card-hover"
              )}
            >
              <div
                className={cn(
                  "mb-2 flex h-8 w-8 items-center justify-center rounded-lg",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {icons[m.id]}
              </div>
              <p className="text-sm font-semibold">{m.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{m.en}</p>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground/80">{m.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">科目</label>
            <Select
              value={paper}
              onValueChange={(v) => { setPaper(v); setChapter(""); setKp(""); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部科目</SelectItem>
                {papers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">章节</label>
            <Select
              value={chapter}
              disabled={!paper || loadingTree}
              onValueChange={(v) => { setChapter(v); setKp(""); }}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTree ? "加载中…" : paper ? "全部章节" : "请先选择科目"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部章节</SelectItem>
                {(tree ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} {c.title}（{c.questionCount}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">知识点</label>
            <Select
              value={kp}
              disabled={!chapter}
              onValueChange={setKp}
            >
              <SelectTrigger>
                <SelectValue placeholder={chapter ? "全部知识点" : "请先选择章节"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部知识点</SelectItem>
                {kpOptions.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">题量</label>
            <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 15, 20, 30, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} 题</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={startSession} disabled={loadingIds}>
          {loadingIds ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
          {loadingIds ? "组题中…" : "开始刷题"}
        </Button>
        <Link
          href="/question-bank"
          className="hidden items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
        >
          按筛选条件浏览题库 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <p className="ml-auto hidden text-xs text-muted-foreground md:block">
          快捷键：1-4 选择 · Enter 提交 · N/P 切题 · F 收藏
        </p>
      </div>
    </div>
  );
}
