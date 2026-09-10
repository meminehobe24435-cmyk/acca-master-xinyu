/* eslint-disable no-console */
// ===== Seed 脚本：导入 content/ 下的知识树与题库，创建演示账号与成就 =====
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { hashPassword } from "../src/lib/auth";
import { ACHIEVEMENT_DEFS } from "../src/lib/constants";
import { fnv1a, normalizeText } from "../src/lib/utils";

const prisma = new PrismaClient();

interface KpPoint { code?: string; title: string; summary?: string; contentMd?: string; standardReference?: string; examFrequency?: string; }
interface TopicDef { title: string; description?: string; points: KpPoint[]; }
interface ChapterDef { code: string; title: string; description?: string; topics: TopicDef[]; }
interface SybFile {
  code: string; name: string; nameCn?: string; level: string; category?: string | null;
  order: number; accent?: string; description?: string; examDurationMin: number;
  examConfig?: { sections: { id: string; name: string; scope?: string; count: number; marksPerQuestion: number; sectionMarks: number }[] };
  variants: { code: string; label: string; region?: string; note?: string }[];
  chapters: ChapterDef[];
}

interface QuestionFile {
  paper: string; variant?: string; chapterCode?: string; topicTitle?: string; kpTitle?: string;
  type: string; difficulty: number; textMd: string; options?: { key: string; text: string; isCorrect: boolean; feedbackMd?: string }[];
  answerJson: string; explanationMd: string; marks?: number; estimatedTimeSec?: number;
  taxYear?: string | null; jurisdiction?: string | null; standardReference?: string | null;
  sourceType?: string; sourceName?: string; copyrightStatus?: string; sourceUrl?: string;
}

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
}

async function seedSyllabus() {
  const sv = await prisma.syllabusVersion.upsert({
    where: { code: "ACCA-Q-2026" },
    update: {},
    create: {
      code: "ACCA-Q-2026",
      name: "ACCA Qualification 2026 (章节化整理)",
      effectiveFrom: new Date("2025-09-01"),
      sourceUrl: "https://www.accaglobal.com/",
      note: "章节按官方 syllabus 主题整理，请以 ACCA 官网 syllabus 与考试规则为准。",
    },
  });

  let paperCount = 0;
  let chapterCount = 0;
  let topicCount = 0;
  let kpCount = 0;

  for (const file of listFiles(path.join(__dirname, "../content/syllabus"))) {
    const syb = readJson<SybFile>(file);
    if (!syb.code) continue;

    const paper = await prisma.paper.upsert({
      where: { code: syb.code },
      update: {
        name: syb.name,
        nameCn: syb.nameCn ?? null,
        level: syb.level,
        category: syb.category ?? null,
        order: syb.order,
        accent: syb.accent ?? null,
        description: syb.description ?? null,
        examDurationMin: syb.examDurationMin ?? 180,
        examConfigJson: syb.examConfig ? JSON.stringify(syb.examConfig) : null,
      },
      create: {
        code: syb.code,
        name: syb.name,
        nameCn: syb.nameCn ?? null,
        level: syb.level,
        category: syb.category ?? null,
        order: syb.order,
        accent: syb.accent ?? null,
        description: syb.description ?? null,
        examDurationMin: syb.examDurationMin ?? 180,
        examConfigJson: syb.examConfig ? JSON.stringify(syb.examConfig) : null,
      },
    });
    paperCount++;

    // variants
    for (const v of syb.variants ?? []) {
      await prisma.paperVariant.upsert({
        where: { paperId_code: { paperId: paper.id, code: v.code.toUpperCase() } },
        update: { label: v.label, region: v.region ?? null, note: v.note ?? null },
        create: { paperId: paper.id, code: v.code.toUpperCase(), label: v.label, region: v.region ?? null, note: v.note ?? null },
      });
    }

    // chapters → topics → knowledge points
    for (const ch of syb.chapters ?? []) {
      const chapter = await prisma.chapter.upsert({
        where: { paperId_code: { paperId: paper.id, code: ch.code } },
        update: { title: ch.title, description: ch.description ?? null, order: Number(ch.code) },
        create: { paperId: paper.id, code: ch.code, title: ch.title, description: ch.description ?? null, order: Number(ch.code) },
      });
      chapterCount++;

      for (const [ti, tp] of (ch.topics ?? []).entries()) {
        const topic = await prisma.topic.upsert({
          where: { chapterId_title: { chapterId: chapter.id, title: tp.title } },
          update: { order: ti + 1, description: tp.description ?? null },
          create: { chapterId: chapter.id, title: tp.title, order: ti + 1, description: tp.description ?? null },
        });
        topicCount++;

        for (const [pi, pt] of (tp.points ?? []).entries()) {
          await prisma.knowledgePoint.upsert({
            where: { topicId_title: { topicId: topic.id, title: pt.title } },
            update: {
              summary: pt.summary ?? null,
              contentMd: pt.contentMd ?? null,
              standardReference: pt.standardReference ?? null,
              examFrequency: pt.examFrequency ?? null,
              order: pi + 1,
              code: pt.code ?? null,
            },
            create: {
              topicId: topic.id,
              title: pt.title,
              summary: pt.summary ?? null,
              contentMd: pt.contentMd ?? null,
              standardReference: pt.standardReference ?? null,
              examFrequency: pt.examFrequency ?? null,
              order: pi + 1,
              code: pt.code ?? null,
            },
          });
          kpCount++;
        }
      }
    }
  }

  console.log(`Syllabus: ${paperCount} papers, ${chapterCount} chapters, ${topicCount} topics, ${kpCount} knowledge points`);
  return sv;
}

async function seedQuestions(svId: string) {
  let qCount = 0;
  let optCount = 0;
  const usedHashes = new Set<string>();

  for (const file of listFiles(path.join(__dirname, "../content/questions"))) {
    const questions = readJson<QuestionFile[]>(file);
    for (const q of questions) {
      const paper = await prisma.paper.findUnique({ where: { code: q.paper } });
      if (!paper) {
        console.warn(`Skip question: paper ${q.paper} not found`);
        continue;
      }
      const variant = q.variant
        ? await prisma.paperVariant.findUnique({ where: { paperId_code: { paperId: paper.id, code: q.variant.toUpperCase() } } })
        : null;
      const chapter = q.chapterCode
        ? await prisma.chapter.findUnique({ where: { paperId_code: { paperId: paper.id, code: String(q.chapterCode).padStart(2, "0") } } })
        : null;
      let topic = null;
      let kp = null;
      if (chapter && q.topicTitle) {
        topic = await prisma.topic.findUnique({ where: { chapterId_title: { chapterId: chapter.id, title: q.topicTitle } } });
      }
      if (topic && q.kpTitle) {
        kp = await prisma.knowledgePoint.findUnique({ where: { topicId_title: { topicId: topic.id, title: q.kpTitle } } });
      }

      const hash = fnv1a(normalizeText(`${q.paper}|${q.textMd}`));
      const baseHash = `seed-${hash}`;
      // 避免重复 seed 报 unique 冲突：先查
      const existing = await prisma.question.findUnique({ where: { questionHash: baseHash } });
      if (existing) {
        usedHashes.add(baseHash);
        continue;
      }

      // same content but different hash prefix → skip
      if (usedHashes.has(baseHash)) continue;

      const question = await prisma.question.create({
        data: {
          paperId: paper.id,
          variantId: variant?.id ?? null,
          chapterId: chapter?.id ?? null,
          topicId: topic?.id ?? null,
          knowledgePointId: kp?.id ?? null,
          type: q.type,
          difficulty: q.difficulty ?? 3,
          status: "published",
          reviewStatus: "human_reviewed",
          textMd: q.textMd,
          answerJson: q.answerJson,
          explanationMd: q.explanationMd,
          marks: q.marks ?? 1,
          estimatedTimeSec: q.estimatedTimeSec ?? 120,
          sourceType: q.sourceType ?? "original_ai_generated",
          sourceName: q.sourceName ?? "ACCA Master 原创演示题",
          sourceUrl: q.sourceUrl ?? null,
          copyrightStatus: q.copyrightStatus ?? "original",
          syllabusVersionId: svId,
          taxYear: q.taxYear ?? null,
          jurisdiction: q.jurisdiction ?? null,
          standardReference: q.standardReference ?? null,
          questionHash: baseHash,
          generationModel: "seed-content-v1",
          generationDate: new Date(),
          verified: true,
          verifiedAt: new Date(),
        },
      });
      qCount++;

      const options = q.options ?? [];
      for (const [oi, o] of options.entries()) {
        await prisma.questionOption.create({
          data: {
            questionId: question.id,
            key: o.key.toUpperCase(),
            text: o.text,
            isCorrect: o.isCorrect,
            feedbackMd: o.feedbackMd ?? null,
            sortOrder: oi,
          },
        });
        optCount++;
      }
      usedHashes.add(baseHash);
    }
  }

  console.log(`Questions: ${qCount} created, ${optCount} options`);
}

async function seedUsers() {
  // ⭐🐟 单用户模式：默认学习者（无需登录）
  const defaultUser = await prisma.user.upsert({
    where: { email: "xinyu@acca-master.local" },
    update: { displayName: "歆瑜" },
    create: {
      email: "xinyu@acca-master.local",
      username: "xinyu",
      displayName: "歆瑜",
      passwordHash: await hashPassword(`local-${Math.random().toString(36).slice(2)}-no-login`),
      role: "USER",
      avatarHue: 265,
      dailyGoal: 30,
    },
  });
  console.log("Default learner ready: 歆瑜 (single-user mode, no login required)");

  // 可选测试账号（仅当 SEED_DEMO=1 时创建，用于本地开发）
  if (process.env.SEED_DEMO === "1") {
    const demo = await prisma.user.upsert({
      where: { email: "demo@example.com" },
      update: {},
      create: {
        email: "demo@example.com",
        username: "demo",
        displayName: "Demo Student",
        passwordHash: await hashPassword("demo1234"),
        role: "USER",
        dailyGoal: 30,
      },
    });
    console.log("Demo user created (development only): demo@example.com");
    return { demo, admin: null, defaultUser };
  }

  return { demo: defaultUser, admin: null, defaultUser };
}

async function seedAchievements() {
  for (const a of ACHIEVEMENT_DEFS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: { name: a.name, description: a.description, icon: a.icon, threshold: a.threshold, order: a.order },
      create: { code: a.code, name: a.name, description: a.description, icon: a.icon, threshold: a.threshold, order: a.order },
    });
  }
  console.log(`Achievements: ${ACHIEVEMENT_DEFS.length}`);
}

/** 为 demo 用户生成过去两周的真实感学习记录（确定性的伪随机，便于演示 Dashboard/Analytics） */
async function seedDemoActivity(demo: { id: string }) {
  const existing = await prisma.questionAttempt.count({ where: { userId: demo.id } });
  if (existing > 0) return;

  const questions = await prisma.question.findMany({
    where: { status: "published", paper: { code: { in: ["FR", "MA", "PM", "BT", "FM"] } } },
    select: { id: true, knowledgePointId: true, difficulty: true, paper: { select: { code: true, id: true } } },
  });
  if (questions.length < 20) return;

  // mulberry32 确定性伪随机
  let seed = 42;
  const rand = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const now = new Date();
  const attempts: {
    userId: string; questionId: string; mode: string; isCorrect: boolean; score: number;
    timeSpentSec: number; attemptDate: Date;
  }[] = [];

  const kpAttempts = new Map<string, { correct: number; total: number; lastCorrect: boolean; lastAt: Date }>();

  for (let day = 13; day >= 0; day--) {
    const count = day === 0 ? 42 : Math.floor(18 + rand() * 18); // 今天 42 题
    for (let i = 0; i < count; i++) {
      const q = questions[Math.floor(rand() * questions.length)];
      if (!q) continue;
      // 按知识点正确率（薄弱点错更多）
      const kpStat = q.knowledgePointId ? kpAttempts.get(q.knowledgePointId) : undefined;
      const baseAcc = kpStat ? kpStat.correct / kpStat.total : 0.78;
      const correct = rand() < Math.min(0.95, Math.max(0.3, baseAcc + (rand() - 0.5) * 0.2));
      const dt = new Date(now.getTime() - day * 24 * 3600 * 1000);
      dt.setHours(9 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0);
      attempts.push({
        userId: demo.id,
        questionId: q.id,
        mode: day === 0 ? "SMART" : "PRACTICE",
        isCorrect: correct,
        score: correct ? 2 : 0,
        timeSpentSec: Math.floor(60 + rand() * 150),
        attemptDate: dt,
      });
      if (q.knowledgePointId) {
        const cur = kpAttempts.get(q.knowledgePointId) ?? { correct: 0, total: 0, lastCorrect: true, lastAt: dt };
        cur.correct += correct ? 1 : 0;
        cur.total += 1;
        cur.lastCorrect = correct;
        cur.lastAt = dt;
        kpAttempts.set(q.knowledgePointId, cur);
      }
    }
  }

  await prisma.questionAttempt.createMany({ data: attempts });
  const total = attempts.length;
  const corrects = attempts.filter((a) => a.isCorrect).length;

  // mastery scores
  const masteryData = [...kpAttempts.entries()].map(([kpId, s]) => {
    const acc = s.correct / s.total;
    const score = Math.round(Math.min(100, Math.max(5, acc * 100 - (s.total > 8 && acc < 0.5 ? 10 : 0))));
    return {
      userId: demo.id,
      knowledgePointId: kpId,
      score,
      attempts: s.total,
      correct: s.correct,
      lastCorrect: s.lastCorrect,
      lastAttemptAt: s.lastAt,
    };
  });
  await prisma.masteryScore.createMany({ data: masteryData });

  // 错题（取最近做错的 12 题）
  const wrongAttempts = attempts.filter((a) => !a.isCorrect).slice(-12);
  for (const wa of wrongAttempts) {
    await prisma.wrongQuestion.upsert({
      where: { userId_questionId: { userId: demo.id, questionId: wa.questionId } },
      update: {},
      create: {
        userId: demo.id,
        questionId: wa.questionId,
        firstWrongAt: wa.attemptDate,
        lastWrongAt: wa.attemptDate,
        wrongCount: 1,
        stage: Math.floor(rand() * 3),
        nextReviewAt: new Date(Date.now() + [0, 1, 3, 7][Math.floor(rand() * 4)] * 24 * 3600 * 1000),
        errorCategory: ["CONCEPT", "CALCULATION", "CARELESS", "MISREAD", "FORGOT"][Math.floor(rand() * 5)],
        mastered: false,
      },
    });
  }

  // 学习会话 & 连续学习天数（14 天）
  for (let day = 13; day >= 0; day--) {
    const dayAttempts = attempts.filter((a) => sameDay(a.attemptDate, new Date(now.getTime() - day * 24 * 3600 * 1000)));
    if (dayAttempts.length === 0) continue;
    const start = new Date(now.getTime() - day * 24 * 3600 * 1000);
    start.setHours(9, 0, 0, 0);
    const duration = dayAttempts.reduce((acc, a) => acc + a.timeSpentSec, 0);
    await prisma.studySession.create({
      data: {
        userId: demo.id,
        startAt: start,
        endAt: new Date(start.getTime() + duration * 1000),
        durationSec: duration,
        questionsAttempted: dayAttempts.length,
        correctCount: dayAttempts.filter((a) => a.isCorrect).length,
        mode: day === 0 ? "SMART" : "PRACTICE",
      },
    });
  }

  await prisma.user.update({
    where: { id: demo.id },
    data: {
      streakCount: 14,
      lastStudyDate: new Date(),
      totalStudyMinutes: Math.floor(attempts.reduce((a, x) => a + x.timeSpentSec, 0) / 60),
    },
  });

  console.log(`Demo activity: ${total} attempts (${corrects} correct, ${Math.round((corrects / total) * 100)}%), ${masteryData.length} mastery scores`);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

async function main() {
  console.log("Seeding syllabus...");
  const sv = await seedSyllabus();
  console.log("Seeding questions...");
  await seedQuestions(sv.id);
  console.log("Seeding users & achievements...");
  const { demo, defaultUser } = await seedUsers();
  await seedAchievements();

  // 演示学习数据默认不生成（歆瑜的学习记录应该是真实产生的）
  if (process.env.SEED_DEMO_ACTIVITY === "1" && demo && demo.id !== defaultUser.id) {
    console.log("Seeding demo activity (SEED_DEMO_ACTIVITY=1)...");
    await seedDemoActivity(demo);
  }

  const qTotal = await prisma.question.count();
  const kpTotal = await prisma.knowledgePoint.count();
  console.log(`\nDone. questions=${qTotal}, knowledgePoints=${kpTotal}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
