import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Info, MessageSquareWarning } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { QuestionAnswerCard } from "@/components/questions/question-answer-card";
import { Badge } from "@/components/ui/badge";
import { DISPLAY_META } from "@/lib/display";
import { SOURCE_TYPES, COPYRIGHT_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      paper: { select: { code: true, name: true } },
      chapter: { select: { id: true, title: true } },
      topic: { select: { title: true } },
      knowledgePoint: { select: { id: true, title: true } },
    },
  });
  if (!q || q.status !== "published") notFound();

  const meta = DISPLAY_META({
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    textMd: q.textMd,
    marks: q.marks,
    estimatedTimeSec: q.estimatedTimeSec,
    options: [],
    meta: {
      paperCode: q.paper.code,
      paperName: q.paper.name,
      variant: null,
      chapterTitle: q.chapter?.title ?? null,
      topicTitle: q.topic?.title ?? null,
      knowledgePointTitle: q.knowledgePoint?.title ?? null,
      standardReference: q.standardReference,
      taxYear: q.taxYear,
      jurisdiction: q.jurisdiction,
      sourceType: q.sourceType,
      sourceName: q.sourceName,
    },
    statuses: { favorited: false, inWrongBook: false, wrongCount: 0, masteryScore: null },
  });

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/question-bank" className="hover:text-foreground">题库</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/papers/${q.paper.code}`} className="hover:text-foreground">{q.paper.code}</Link>
        {q.chapter ? (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/chapter/${q.chapter.id}`} className="hover:text-foreground">{q.chapter.title}</Link>
          </>
        ) : null}
      </nav>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{SOURCE_TYPES[q.sourceType]?.label ?? q.sourceType}</Badge>
        <span>{q.sourceName}</span>
        {q.sourceUrl ? (
          <a href={q.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            查看来源
          </a>
        ) : null}
        <span>· {COPYRIGHT_STATUS[q.copyrightStatus] ?? "原创"}</span>
        {q.variantId ? null : null}
        {q.taxYear ? <Badge variant="violet">Tax Year {q.taxYear}</Badge> : null}
        {q.jurisdiction ? <Badge variant="cyan">Jurisdiction {q.jurisdiction}</Badge> : null}
        {q.syllabusVersionId ? <Badge variant="outline">Syllabus 2026</Badge> : null}
        <p className="ml-auto flex items-center gap-1">
          <MessageSquareWarning className="h-3.5 w-3.5" />
          如发现答案有异议，请点击「反馈」
        </p>
      </div>

      <QuestionAnswerCard questionId={q.id} mode="PRACTICE" />

      <p className="flex items-start gap-2 rounded-lg bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        本题来源标注为 {q.sourceName}（{SOURCE_TYPES[q.sourceType]?.en ?? q.sourceType}），非 ACCA 官方真题；
        涉及准则与税率的题目已标注 {meta.taxYear ? `税年 ${meta.taxYear}` : `标准 ${meta.standardReference ?? "—"}`}，请以当前 ACCA 官方 syllabus 和考试规则为准。
      </p>
    </div>
  );
}
