"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Minus } from "lucide-react";
import type { PublicQuestion } from "@/lib/serializers";
import { CHOICE_LIKE_TYPES, NUMERIC_TYPES, SUBJECTIVE_TYPES } from "@/lib/constants";
import { MarkdownContent } from "@/components/markdown-content";

export type AnyAnswer = string | string[] | Record<string, string>;

export function EmptyAnswer(type: string): AnyAnswer {
  if (CHOICE_LIKE_TYPES.includes(type)) return type === "MULTIPLE_CHOICE" ? [] : "";
  if (NUMERIC_TYPES.includes(type)) return "";
  if (type === "MATCHING") return {};
  if (type === "CLASSIFICATION") return {};
  return "";
}

export function isAnswerEmpty(type: string, value: AnyAnswer): boolean {
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === "object") return Object.keys(value).length === 0;
  return true;
}

export function QuestionAnswerArea({
  question,
  value,
  onChange,
  disabled,
}: {
  question: PublicQuestion;
  value: AnyAnswer;
  onChange: (v: AnyAnswer) => void;
  disabled?: boolean;
}) {
  const type = question.type;

  if (CHOICE_LIKE_TYPES.includes(type)) {
    const multiple = type === "MULTIPLE_CHOICE";
    const selected = Array.isArray(value) ? (value as string[]) : typeof value === "string" ? [value as string] : [];
    return (
      <div className="space-y-2.5">
        {question.options.map((opt, i) => {
          const isSel = multiple ? selected.includes(opt.key) : selected[0] === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (multiple) {
                  onChange(isSel ? selected.filter((k) => k !== opt.key) : [...selected, opt.key]);
                } else {
                  onChange(opt.key);
                }
              }}
              className={cn(
                "group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
                isSel
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground group-hover:border-primary/50"
                )}
              >
                {multiple ? (
                  isSel ? <Check className="h-3.5 w-3.5" /> : null
                ) : (
                  opt.key
                )}
              </span>
              <span className="flex-1">
                <MarkdownContent content={opt.text} className="!text-sm !leading-6" />
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "TRUE_FALSE") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {["TRUE", "FALSE"].map((v) => (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-xl border p-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === v
                ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/40"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            {v === "TRUE" ? "✓ True 正确" : "✗ False 错误"}
          </button>
        ))}
      </div>
    );
  }

  if (NUMERIC_TYPES.includes(type)) {
    const unit = (question.answerExtras?.unit as string | undefined) ?? "";
    return (
      <div className="flex items-center gap-3">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="输入数值，如 12,500"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 max-w-xs font-mono text-base"
        />
        {unit ? <span className="text-sm font-medium text-muted-foreground">{unit}</span> : null}
        <span className="text-xs text-muted-foreground">允许 ±1% 容差</span>
      </div>
    );
  }

  if (type === "MATCHING") {
    const left = (question.answerExtras?.left as string[] | undefined) ?? [];
    const right = (question.answerExtras?.right as string[] | undefined) ?? [];
    const current = (value as Record<string, string>) ?? {};
    return (
      <div className="space-y-2">
        {left.map((l, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <span className="w-10 shrink-0 rounded-md bg-secondary px-2 py-1 text-center font-mono text-xs font-bold">
              {l}
            </span>
            <Select
              value={current[l] ?? ""}
              disabled={disabled}
              onValueChange={(v) => onChange({ ...current, [l]: v })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="选择匹配项" />
              </SelectTrigger>
              <SelectContent>
                {right.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden w-12 text-right text-xs text-muted-foreground sm:block">{String(i + 1).padStart(2, "0")}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "CLASSIFICATION") {
    const groups = (question.answerExtras?.groups as { group: string; items: string[] }[] | undefined) ?? [];
    const current = (value as Record<string, string>) ?? {};
    const allItems = groups.flatMap((g) => g.items);
    const groupNames = groups.map((g) => g.group);
    return (
      <div className="space-y-2.5">
        {allItems.map((item, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 truncate text-sm">{item}</span>
            <div className="flex flex-wrap gap-1.5">
              {groupNames.map((g) => {
                const sel = current[item] === g;
                return (
                  <button
                    key={g}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...current, [item]: sel ? "" : g })}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      sel
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sel ? "inherit" : "#94a3b8" }} />
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (SUBJECTIVE_TYPES.includes(type)) {
    return (
      <div className="space-y-2">
        <Textarea
          placeholder="写下你的答案（支持 Markdown：**加粗**、$公式$、- 列表）…"
          rows={8}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[220px] font-mono text-sm leading-6"
        />
        <p className="text-xs text-muted-foreground">
          主观题由关键词评分 + 自评相结合：交卷后系统给出参考评分，可查看标准答案与评分要点。
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Minus className="h-4 w-4" /> 暂不支持的题型
    </div>
  );
}
