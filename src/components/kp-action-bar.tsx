"use client";

import { useState } from "react";
import { BookMarked, NotebookPen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";

/** 知识点页操作条：收藏 / 笔记 / Markdown 预览 */
export function KpActionBar({ kpId }: { kpId: string }) {
  const [favorited, setFavorited] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [notePreview, setNotePreview] = useState<null | string>(null);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState("");

  const show = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };

  async function toggleFavorite() {
    const res = await fetch(`/api/knowledge/${kpId}/favorite`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setFavorited(d.favorited);
      show(d.favorited ? "已收藏 ★" : "已取消收藏");
    } else {
      show("请先登录");
    }
  }

  async function openNote() {
    setNoteOpen(true);
    setNotePreview(null);
    try {
      const res = await fetch(`/api/knowledge/${kpId}/note`);
      const d = await res.json();
      setNoteText(d.note ?? "");
    } catch {
      setNoteText("");
    }
  }

  async function saveNote() {
    const res = await fetch(`/api/knowledge/${kpId}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentMd: noteText }),
    });
    if (res.ok) {
      setNoteOpen(false);
      show(noteText.trim() ? "笔记已保存" : "笔记已删除");
    } else {
      show("保存失败，请先登录");
    }
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={toggleFavorite}>
        <Star className={cn("h-3.5 w-3.5", favorited && "fill-amber text-amber")} />
        {favorited ? "已收藏" : "收藏知识点"}
      </Button>
      <Button variant="outline" size="sm" onClick={openNote}>
        <NotebookPen className="h-3.5 w-3.5" /> 学习笔记
      </Button>
      {toast ? (
        <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">{toast}</span>
      ) : null}

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>学习笔记</DialogTitle>
            <DialogDescription>支持 Markdown：**加粗**、- 列表、$公式$ 等，保存后随时在个人中心查看。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {notePreview === null ? (
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="记录这个知识点的理解、口诀、易错点…"
                rows={12}
                className="font-mono text-sm"
              />
            ) : (
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border p-4 scrollbar-thin">
                <MarkdownContent content={notePreview} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setNotePreview(notePreview === null ? noteText : null)}>
                <BookMarked className="h-3.5 w-3.5" /> {notePreview === null ? "预览" : "编辑"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>取消</Button>
            <Button onClick={saveNote}>保存笔记</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
