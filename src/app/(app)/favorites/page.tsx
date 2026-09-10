"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Download, Loader2, NotebookPen, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownContent } from "@/components/markdown-content";
import { DIFFICULTY_META } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { FishIcon } from "@/components/brand/fish";
import { pick } from "@/lib/encourage";

export default function FavoritesPage() {
  const [tab, setTab] = useState("questions");
  const [items, setItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/favorites?type=${tab}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.favorites ?? data.notes ?? []);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">⭐🐟 的收藏与笔记</h1>
          <p className="mt-1 text-sm text-muted-foreground">收藏的题目、知识点，以及你在做题/学习时写下的笔记。</p>
        </div>
        <div className="flex gap-2">
          {[
            { type: "mistakes", label: "导出错题 CSV" },
            { type: "favorites", label: "导出收藏 CSV" },
            { type: "notes", label: "导出笔记 CSV" },
            { type: "attempts", label: "导出学习记录 CSV" },
          ].map((e) => (
            <Button key={e.type} variant="outline" size="sm" asChild>
              <a href={`/api/export?type=${e.type}`} download>
                <Download className="h-3.5 w-3.5" /> {e.label}
              </a>
            </Button>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="questions"><Star className="h-3.5 w-3.5" /> 收藏题目</TabsTrigger>
          <TabsTrigger value="knowledge"><Bookmark className="h-3.5 w-3.5" /> 收藏知识点</TabsTrigger>
          <TabsTrigger value="notes"><NotebookPen className="h-3.5 w-3.5" /> 我的笔记</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FishIcon className="h-6 w-8" />}
          title={tab === "notes" ? pick("emptyNotes") : pick("emptyFavorites")}
          description={
            tab === "notes"
              ? "在题目下方或知识点页面点击「笔记」，写一句自己的理解就够了。"
              : "刷题时点击「收藏」，把觉得重要的题留在这里，考前回来看很方便 ⭐"
          }
          action={
            <Link href="/practice" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              去刷几道题
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {(items as Array<Record<string, unknown>>).map((item) => (
            <div key={String(item.id)} className="rounded-xl border bg-card p-4 shadow-sm">
              {tab === "questions" || tab === "knowledge" ? (
                <Link href={tab === "questions" ? `/question/${item.targetId}` : `/knowledge/${item.targetId}`} className="group block">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="default">{String(item.paperCode ?? item.kpTitle ?? "")}</Badge>
                    {tab === "questions" ? (
                      <Badge className={DIFFICULTY_META[Number(item.difficulty)]?.className}>
                        难度 {DIFFICULTY_META[Number(item.difficulty)]?.label}
                      </Badge>
                    ) : null}
                    <span className="text-muted-foreground">收藏于 {formatDateTime(String(item.createdAt ?? ""))}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 group-hover:text-primary">
                    {tab === "questions" ? plainText(String(item.textMd ?? "")) : plainText(String(item.kpTitle ?? ""))}
                  </p>
                  {tab === "knowledge" && item.summary ? (
                    <p className="mt-1 text-xs text-muted-foreground">{String(item.summary)}</p>
                  ) : null}
                  {tab === "questions" && item.kpTitle ? (
                    <p className="mt-1 text-xs text-muted-foreground">{String(item.kpTitle)}</p>
                  ) : null}
                </Link>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{String(item.title)}</Badge>
                    <span>更新于 {formatDateTime(String(item.updatedAt ?? ""))}</span>
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-secondary/40 p-3 scrollbar-thin">
                    <MarkdownContent content={String(item.contentMd ?? "")} className="!text-[13px]" />
                  </div>
                  <Link
                    href={item.targetType === "KNOWLEDGE_POINT" ? `/knowledge/${item.targetId}` : `/question/${item.targetId}`}
                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    查看原文 →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function plainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|$-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
