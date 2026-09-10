import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { SUBJECTIVE_TYPES } from "@/lib/constants";

const schema = z.object({
  paper: z.string().min(1),
  variant: z.string().optional(),
  durationMin: z.number().int().min(10).max(300).optional(),
  questionCount: z.number().int().min(1).max(100).optional(),
});

// POST /api/mock/start — 按官方考制创建模拟考试（服务端选题，答案不离开服务器）
export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const paper = await prisma.paper.findUnique({
    where: { code: parsed.data.paper },
  });
  if (!paper) return NextResponse.json({ error: "科目不存在" }, { status: 404 });

  const config = paper.examConfigJson
    ? (JSON.parse(paper.examConfigJson) as { sections: { id: string; name: string; scope?: string; count: number; marksPerQuestion: number; sectionMarks: number }[] })
    : { sections: [{ id: "A", name: "Section A", count: 15, marksPerQuestion: 2, sectionMarks: 30 }] };

  const available = await prisma.question.findMany({
    where: { paperId: paper.id, status: "published" },
    select: { id: true, type: true, difficulty: true },
  });
  if (available.length < 5) {
    return NextResponse.json(
      { error: `${paper.code} 可用题目不足（${available.length} 道），请先导入或生成题目` },
      { status: 400 }
    );
  }

  // 按题型资源分配：主观题优先给 Section C，其余按比例分给 A/B
  const subjective = available.filter((q) => SUBJECTIVE_TYPES.includes(q.type));
  const objective = available.filter((q) => !SUBJECTIVE_TYPES.includes(q.type));
  const sections = config.sections.map((s) => ({ ...s, questionIds: [] as string[] }));

  // 分布：优先给主观题 Section；若主观题不足则用客观题补位
  const secC = sections.find((s) => s.id === "C") ?? sections[sections.length - 1];
  const secCNeeded = Math.min(secC.count, Math.max(1, Math.floor(available.length * 0.2)));
  const pickC = shuffle(subjective).slice(0, secCNeeded);
  const poolAfterC = available.filter((q) => !pickC.includes(q));

  const secA = sections.filter((s) => s.id !== secC.id);
  const secANeeded = Math.min(
    config.sections.filter((s) => s.id !== secC.id).reduce((a, s) => a + s.count, 0),
    poolAfterC.length
  );

  // 按 A/B 配置比例切分
  let cursor = 0;
  const rest = shuffle(poolAfterC).slice(0, secANeeded);
  for (const s of secA) {
    const take = Math.min(s.count, Math.max(1, Math.floor(rest.length * (s.count / Math.max(1, secANeeded))) - (rest.length - secANeeded) / 2));
    const slice = rest.slice(cursor, Math.min(rest.length, cursor + Math.max(1, take)));
    s.questionIds = slice.map((q) => q.id);
    cursor += s.questionIds.length;
  }
  // 剩余塞入最后一个 section
  const leftover = rest.slice(cursor);
  if (leftover.length > 0) {
    (secA[secA.length - 1] ?? secC).questionIds.push(...leftover.map((q) => q.id));
  }
  secC.questionIds.push(...pickC.map((q) => q.id));

  const allIds = sections.flatMap((s) => s.questionIds);
  const duration = parsed.data.durationMin ?? paper.examDurationMin;
  const now = new Date();

  const mockExam = await prisma.mockExam.create({
    data: {
      paperId: paper.id,
      name: `${paper.code} · ${paper.name} Mock`,
      description: `按官方考制自动组卷（${sections.map((s) => `${s.id}:${s.questionIds.length}`).join(" / ")}）`,
      durationMin: duration,
      totalMarks: sections.reduce((a, s) => a + s.questionIds.length * s.marksPerQuestion, 0),
      configJson: JSON.stringify({
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          count: s.questionIds.length,
          marksPerQuestion: s.marksPerQuestion,
          questionIds: s.questionIds,
        })),
      }),
      variantId: null,
    },
  });

  const attempt = await prisma.mockExamAttempt.create({
    data: {
      mockExamId: mockExam.id,
      userId: session?.id ?? null,
      startAt: now,
      endAt: new Date(now.getTime() + duration * 60000),
      status: "IN_PROGRESS",
      answersJson: JSON.stringify({}),
    },
  });

  return NextResponse.json({ attemptId: attempt.id, durationMin: duration, questionCount: allIds.length });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const dynamic = "force-dynamic";
