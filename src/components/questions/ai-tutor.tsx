"use client";

import { useState } from "react";
import { Bot, Loader2, Send, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TUTOR_PRESETS } from "@/lib/ai/prompt";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";

export function AITutor({
  questionId,
  userAnswer,
}: {
  questionId: string;
  userAnswer?: string;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [mode, setMode] = useState("direct");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [probeDone, setProbeDone] = useState(false);

  async function probe() {
    if (probeDone) return;
    setProbeDone(true);
    try {
      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, message: "你好，请用一句话说明这道题的考点。", mode, userAnswer }),
      });
      if (res.status === 503) {
        setConfigured(false);
      } else if (res.ok) {
        const data = await res.json();
        setConfigured(true);
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      } else {
        setConfigured(false);
      }
    } catch {
      setConfigured(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, message: text, mode, userAnswer }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfigured(true);
        setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "" }]);
      } else {
        // 移除刚追加的用户消息，给出错误提示
        setMessages((m) => m.slice(0, -1));
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${data.message ?? data.error ?? "AI 请求失败"}` }]);
      }
    } catch {
      setMessages((m) => m.slice(0, -1));
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ 网络错误，请稍后再试。" }]);
    } finally {
      setLoading(false);
    }
  }

  if (configured === false) {
    return (
      <div className="rounded-xl border border-dashed bg-secondary/40 p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="h-4 w-4 text-amber" /> AI 功能未配置
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          在 <code className="rounded bg-secondary px-1 py-0.5">.env</code> 中设置{" "}
          <code className="rounded bg-secondary px-1 py-0.5">AI_PROVIDER</code> 与对应 API Key
          （openai / deepseek / anthropic / gemini / openrouter），即可解锁 AI Tutor。核心刷题功能不受影响。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </span>
          AI Tutor
        </p>
        <div className="flex flex-wrap gap-1">
          {TUTOR_PRESETS.map((p) => (
            <button
              key={p.mode}
              type="button"
              onClick={() => setMode(p.mode)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                mode === p.mode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              对这道题有疑问？选择讲解模式后提问，例如：
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["为什么选这个答案？", "我还是没懂", "用最简单的话解释", "给我举一个例子", "为什么 A 不对？", "再出一道一样的题", "出一道更难的"].map(
                (q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {q}
                  </button>
                )
              )}
            </div>
            <Button size="sm" variant="outline" onClick={probe} className="mt-1">
              <Sparkles className="h-3.5 w-3.5" /> 简单介绍一下本题
            </Button>
          </div>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto scrollbar-thin">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" ? (
                  <div className="flex max-w-[90%] items-start gap-2">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                    <div className="rounded-xl rounded-tl-sm border bg-secondary/40 px-3 py-2">
                      <MarkdownContent content={m.content} className="!text-[13px] !leading-6" />
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-xl rounded-tr-sm border bg-primary/10 px-3 py-2 text-sm">{m.content}</div>
                )}
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 pl-8 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI 正在思考…
              </div>
            ) : null}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="输入问题，Enter 发送，Shift+Enter 换行"
            rows={1}
            className="min-h-[42px] flex-1 resize-none"
          />
          <Button size="icon" onClick={send} disabled={loading || !input.trim()} aria-label="发送">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            提示
          </Badge>
          AI 讲解基于题库标准答案，不会更改正确答案；如对答案有异议，可提交题目反馈。
        </p>
      </div>
    </div>
  );
}
