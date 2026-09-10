import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getUserPaperStats } from "@/lib/stats";
import { MasteryBar } from "@/components/mastery-bar";
import { PAPER_CATEGORIES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PapersPage() {
  const session = await getSession();
  const papers = await prisma.paper.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { chapters: true, questions: { where: { status: "published" } } } },
    },
  });

  const levelKeys = ["APPLIED_KNOWLEDGE", "APPLIED_SKILLS", "STRATEGIC_PROFESSIONAL"] as const;
  const levelEn: Record<string, string> = {
    APPLIED_KNOWLEDGE: "Applied Knowledge",
    APPLIED_SKILLS: "Applied Skills",
    STRATEGIC_PROFESSIONAL: "Strategic Professional",
  };
  const levelCn: Record<string, string> = {
    APPLIED_KNOWLEDGE: "应用知识",
    APPLIED_SKILLS: "应用技能",
    STRATEGIC_PROFESSIONAL: "战略专业",
  };

  const renderedLevels = [];
  for (const key of levelKeys) {
    const list = papers.filter((p) => p.level === key).sort((a, b) => a.order - b.order);
    if (list.length === 0) continue;
    const cards = await Promise.all(
      list.map(async (p) => {
        const stats = await getUserPaperStats(session?.id ?? null, p.id);
        return (
          <Link
            key={p.id}
            href={`/papers/${p.code}`}
            className="card-hover group rounded-xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm"
                style={{ backgroundColor: p.accent ?? "#4f46e5" }}
              >
                {p.code}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.nameCn ?? ""}
                  {p.category ? ` · ${PAPER_CATEGORIES[p.category]?.label ?? p.category}` : ""}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-secondary/50 py-2">
                <p className="text-sm font-bold tabular-nums">{p._count.questions}</p>
                <p className="text-[10px] text-muted-foreground">题目</p>
              </div>
              <div className="rounded-lg bg-secondary/50 py-2">
                <p className="text-sm font-bold tabular-nums">{p._count.chapters}</p>
                <p className="text-[10px] text-muted-foreground">章节</p>
              </div>
              <div className="rounded-lg bg-secondary/50 py-2">
                <p className="text-sm font-bold tabular-nums">{stats.accuracy}%</p>
                <p className="text-[10px] text-muted-foreground">正确率</p>
              </div>
            </div>
            {session && stats.masteryAvg > 0 ? (
              <div className="mt-3">
                <MasteryBar score={stats.masteryAvg} className="text-xs" />
              </div>
            ) : null}
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ClockIcon /> {p.examDurationMin} 分钟官方考制 · 满分 100 · 50 分通过
            </p>
          </Link>
        );
      })
    );
    renderedLevels.push({ key, en: levelEn[key], cn: levelCn[key], cards });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">科目体系 Syllabus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          基于当前 ACCA 官方 Qualification Structure 与大纲章节化整理（含地区变体）。请以 ACCA 官网 syllabus 与考试规则为准。
        </p>
      </div>

      {renderedLevels.map((lv) => (
        <section key={lv.key}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight">{lv.en}</h2>
            <Badge variant="outline">{lv.cn}</Badge>
            <span className="text-xs text-muted-foreground">{lv.cards.length} 门</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{lv.cards}</div>
        </section>
      ))}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M9 2h6" />
    </svg>
  );
}
