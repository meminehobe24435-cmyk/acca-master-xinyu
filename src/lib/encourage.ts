import { ENCOURAGEMENT_POOL, type EncouragementKey } from "@/data/encouragements";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export function timeOfDay(d: Date = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "night";
}

/** 从语池随机取一句；同一次会话内尽量避免与上一次重复 */
export function pick(key: EncouragementKey, avoidLast = 2): string {
  const list = ENCOURAGEMENT_POOL[key] as readonly string[];
  if (!list || list.length === 0) return "";
  if (typeof window === "undefined" || list.length <= avoidLast) {
    return list[Math.floor(Math.random() * list.length)];
  }
  const storageKey = `acca_enc_${key}`;
  let recent: string[] = [];
  try {
    recent = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]") as string[];
  } catch {
    recent = [];
  }
  const candidates = list.filter((s) => !recent.includes(s));
  const text = (candidates.length > 0 ? candidates : list)[
    Math.floor(Math.random() * (candidates.length > 0 ? candidates.length : list.length))
  ];
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([text, ...recent].slice(0, avoidLast)));
  } catch {
    /* ignore */
  }
  return text;
}

/** 时段问候语 */
export function greetingFor(d: Date = new Date()): { title: string; line: string } {
  const t = timeOfDay(d);
  const key = (t === "morning"
    ? "morning"
    : t === "afternoon"
      ? "afternoon"
      : t === "evening"
        ? "evening"
        : "night") as EncouragementKey;
  return { title: pick(key), line: pick("start") };
}

/** 答对后的夸奖（含连对加成） */
export function praiseForCorrect(streak: number): { text: string; streakText?: string } {
  const text = pick("correct");
  if (streak > 0 && streak % 10 === 0) return { text, streakText: pick("streak10") };
  if (streak > 0 && streak % 5 === 0) return { text, streakText: pick("streak5") };
  if (streak > 0 && streak % 3 === 0) return { text, streakText: pick("streak3") };
  return { text };
}

/** 答错后的温柔反馈 */
export function gentleForWrong(): string {
  return pick("wrong");
}

/** Mock 结果反馈（按分数分层，不做羞辱） */
export function mockFeedback(score: number): { label: string; text: string } {
  if (score >= 65) return { label: "发挥稳定", text: pick("mockHigh") };
  if (score >= 45) return { label: "基础扎实，方向清晰", text: pick("mockMid") };
  return { label: "这次是探路", text: pick("mockLow") };
}

export interface DailyStatsForPraise {
  attemptsToday: number;
  accuracyToday: number;
  streakDays: number;
  goalToday: number;
  weeklyAccuracyDelta?: number | null;
}

/**
 * 依据真实学习数据生成今日夸奖。
 * 数据为 0 时绝不说“完成好多”，只温柔提示可以开始。
 */
export function dailyPraise(stats: DailyStatsForPraise): { headline: string; detail: string } {
  const { attemptsToday, accuracyToday, streakDays, goalToday, weeklyAccuracyDelta } = stats;

  if (attemptsToday === 0) {
    // 数据为 0 时不做虚假夸奖；主语只出现一次，避免两句话语义重复
    return {
      headline: pick("zeroData"),
      detail:
        streakDays >= 3
          ? `已经连续学习 ${streakDays} 天啦，今天也续上就很好 ⭐`
          : "翻开上次停下的那一页，做一道就好。",
    };
  }

  const parts: string[] = [];
  parts.push(`已经认真完成 ${attemptsToday} 道啦。`);
  if (goalToday > 0 && attemptsToday >= goalToday) {
    parts.push(pick("dailyGoal"));
  } else if (goalToday > 0) {
    parts.push(`离今天的目标还有 ${Math.max(0, goalToday - attemptsToday)} 题，不着急。`);
  }

  if (weeklyAccuracyDelta !== null && weeklyAccuracyDelta !== undefined && weeklyAccuracyDelta >= 3) {
    parts.push(`这周的正确率又悄悄涨了 ${weeklyAccuracyDelta} 个百分点 ✨ 努力这种东西，有时候真的会偷偷留下证据。`);
  } else if (accuracyToday >= 80) {
    parts.push(`今天正确率 ${accuracyToday}%，说明这些题是真的会了 ⭐`);
  } else if (accuracyToday > 0 && accuracyToday < 60) {
    parts.push("今天错的几题刚好暴露了几个薄弱点，把它们收好，下次就会顺很多 🐟");
  }

  if (streakDays >= 7) {
    parts.push(`已经连续学习 ${streakDays} 天啦 ⭐ 七个普通的日子连起来，就变成了一件很了不起的事。`);
  } else if (streakDays >= 3) {
    parts.push(`连续 ${streakDays} 天了，习惯正在长出来 🌱`);
  }

  return {
    headline: parts[0] ?? pick("sessionComplete"),
    detail: parts.slice(1).join(" ") || pick("brand"),
  };
}

/** 学习时长触发休息提醒（不用于考试模式） */
export function restReminder(focusedMinutes: number): string | null {
  if (focusedMinutes < 45) return null;
  // 每 45 分钟提醒一次
  if (focusedMinutes % 45 > 4) return null;
  return pick("rest");
}
