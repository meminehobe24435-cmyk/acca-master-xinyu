// ===== 业务常量与标签（数据库存字符串枚举，UI 展示在此维护） =====

export const QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_NUMERIC",
  "CALCULATION",
  "MATCHING",
  "CLASSIFICATION",
  "CASE_MCQ",
  "CONSTRUCTED_RESPONSE",
  "ESSAY",
  "ACCOUNTING_ENTRY",
  "FINANCIAL_STATEMENT",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "单选",
  MULTIPLE_CHOICE: "多选",
  TRUE_FALSE: "判断",
  FILL_NUMERIC: "数字填空",
  CALCULATION: "计算题",
  MATCHING: "匹配题",
  CLASSIFICATION: "分类题",
  CASE_MCQ: "案例选择",
  CONSTRUCTED_RESPONSE: "主观题",
  ESSAY: "论述题",
  ACCOUNTING_ENTRY: "分录题",
  FINANCIAL_STATEMENT: "报表题",
};

export const QUESTION_TYPE_EN: Record<string, string> = {
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  FILL_NUMERIC: "Fill Numeric",
  CALCULATION: "Calculation",
  MATCHING: "Matching",
  CLASSIFICATION: "Drag Classification",
  CASE_MCQ: "Case MCQ",
  CONSTRUCTED_RESPONSE: "Constructed Response",
  ESSAY: "Essay",
  ACCOUNTING_ENTRY: "Accounting Entry",
  FINANCIAL_STATEMENT: "Financial Statement",
};

export const CHOICE_LIKE_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "CASE_MCQ"];
export const SUBJECTIVE_TYPES = [
  "CONSTRUCTED_RESPONSE",
  "ESSAY",
  "ACCOUNTING_ENTRY",
  "FINANCIAL_STATEMENT",
];
export const NUMERIC_TYPES = ["FILL_NUMERIC", "CALCULATION"];

export const DIFFICULTY_META: Record<number, { label: string; en: string; className: string }> = {
  1: { label: "基础", en: "Basic", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  2: { label: "简单", en: "Easy", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  3: { label: "中等", en: "Medium", className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  4: { label: "困难", en: "Hard", className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  5: { label: "Exam", en: "Exam Level", className: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

export const PAPER_LEVELS: Record<string, { label: string; en: string }> = {
  APPLIED_KNOWLEDGE: { label: "应用知识", en: "Applied Knowledge" },
  APPLIED_SKILLS: { label: "应用技能", en: "Applied Skills" },
  STRATEGIC_PROFESSIONAL: { label: "战略专业", en: "Strategic Professional" },
};

export const PAPER_CATEGORIES: Record<string, { label: string; en: string }> = {
  ESSENTIALS: { label: "核心", en: "Essentials" },
  OPTIONS: { label: "选修", en: "Options" },
};

export const QUESTION_STATUS: Record<string, { label: string; en: string; className: string }> = {
  draft: { label: "草稿", en: "Draft", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  ai_reviewed: { label: "AI 已审", en: "AI Reviewed", className: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  human_reviewed: { label: "人工已审", en: "Human Reviewed", className: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
  published: { label: "已发布", en: "Published", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  archived: { label: "已归档", en: "Archived", className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

export const SOURCE_TYPES: Record<string, { label: string; en: string }> = {
  original_ai_generated: { label: "AI 原创生成", en: "AI-generated practice question" },
  public_sample: { label: "官方公开材料", en: "Public sample" },
  user_imported: { label: "用户导入", en: "User imported" },
  licensed: { label: "授权许可", en: "Licensed" },
  manual_created: { label: "人工创建", en: "Manual created" },
};

export const COPYRIGHT_STATUS: Record<string, string> = {
  original: "原创",
  public_domain: "公共领域",
  cc: "CC 许可",
  licensed: "授权使用",
  user_owned: "用户自有",
  other: "其他",
};

export const ERROR_CATEGORIES: Record<string, { label: string; en: string }> = {
  CONCEPT: { label: "概念不清", en: "Concept unclear" },
  FORMULA: { label: "公式记错", en: "Wrong formula" },
  CALCULATION: { label: "计算错误", en: "Calculation error" },
  MISREAD: { label: "审题错误", en: "Misread question" },
  FORGOT: { label: "知识遗忘", en: "Forgotten" },
  STANDARD: { label: "准则/法条混淆", en: "Standard mixed up" },
  CARELESS: { label: "粗心", en: "Careless" },
  OTHER: { label: "其他", en: "Other" },
};

export const MASTERY_LEVELS: { min: number; max: number; label: string; en: string; color: string }[] = [
  { min: 0, max: 39, label: "薄弱", en: "Weak", color: "text-rose-600 dark:text-rose-400" },
  { min: 40, max: 59, label: "待加强", en: "Developing", color: "text-amber-600 dark:text-amber-400" },
  { min: 60, max: 79, label: "掌握", en: "Proficient", color: "text-blue-600 dark:text-blue-400" },
  { min: 80, max: 100, label: "熟练", en: "Mastered", color: "text-emerald-600 dark:text-emerald-400" },
];

export function masteryLevel(score: number) {
  return MASTERY_LEVELS.find((l) => score >= l.min && score <= l.max) ?? MASTERY_LEVELS[0];
}

export const SRS_STAGES = [0, 1, 3, 7, 14, 30]; // 天数：刚错 → 1天 → 3 → 7 → 14 → 30

export const MODE_LABELS: Record<string, string> = {
  PRACTICE: "练习",
  SMART: "智能刷题",
  CHAPTER: "章节刷题",
  KNOWLEDGE: "知识点刷题",
  RANDOM: "随机刷题",
  MISTAKES: "错题重刷",
  FAVORITES: "收藏题",
  MOCK: "模拟考试",
  TEST: "测验",
  GUEST: "游客体验",
};

export const PRACTICE_MODES = [
  { id: "smart", label: "智能刷题", en: "Smart Practice", desc: "优先推送高频、薄弱与近期错题", icon: "Sparkles" },
  { id: "chapter", label: "章节刷题", en: "By Chapter", desc: "按科目章节顺序练习", icon: "BookOpen" },
  { id: "knowledge", label: "知识点刷题", en: "By Topic", desc: "按知识点精准练习", icon: "Target" },
  { id: "random", label: "随机刷题", en: "Random", desc: "全库随机抽题", icon: "Shuffle" },
  { id: "mistakes", label: "错题重刷", en: "Mistake Review", desc: "间隔重复复习错题", icon: "RotateCcw" },
  { id: "favorites", label: "收藏题", en: "Favorites", desc: "练习收藏题目", icon: "Star" },
  { id: "exam", label: "模拟考试", en: "Mock Exam", desc: "按官方考制全真模拟", icon: "Timer" },
] as const;

export const REPORT_REASONS: Record<string, string> = {
  WRONG_ANSWER: "答案可能错误",
  BAD_QUESTION: "题干有误",
  UNCLEAR_EXPLANATION: "解析不清楚",
  OUTDATED: "内容过期",
  OTHER: "其他",
};

export const EXAM_FREQUENCY: Record<string, string> = {
  HIGH: "高频",
  MEDIUM: "中频",
  LOW: "低频",
};

/** 内置成就定义（seed 中写入数据库） */
export const ACHIEVEMENT_DEFS = [
  { code: "first_question", name: "初来乍到", description: "完成第一道题", icon: "Play", threshold: 1, order: 1 },
  { code: "questions_100", name: "百题斩", description: "累计完成 100 题", icon: "ListChecks", threshold: 100, order: 2 },
  { code: "questions_500", name: "五百题", description: "累计完成 500 题", icon: "ListChecks", threshold: 500, order: 3 },
  { code: "questions_1000", name: "千题大关", description: "累计完成 1,000 题", icon: "Medal", threshold: 1000, order: 4 },
  { code: "streak_3", name: "三日之约", description: "连续学习 3 天", icon: "Flame", threshold: 3, order: 5 },
  { code: "streak_7", name: "七日坚守", description: "连续学习 7 天", icon: "Flame", threshold: 7, order: 6 },
  { code: "streak_30", name: "月度坚持", description: "连续学习 30 天", icon: "Award", threshold: 30, order: 7 },
  { code: "accuracy_90_50", name: "精准射手", description: "完成 50 题且正确率 ≥ 90%", icon: "Crosshair", threshold: 50, order: 8 },
  { code: "mastery_10", name: "十点精通", description: "10 个知识点达到熟练", icon: "GraduationCap", threshold: 10, order: 9 },
  { code: "mastery_50", name: "五十点精通", description: "50 个知识点达到熟练", icon: "Trophy", threshold: 50, order: 10 },
  { code: "first_mock", name: "首战模拟", description: "完成第一次模拟考试", icon: "Timer", threshold: 1, order: 11 },
  { code: "mock_70", name: "模拟高分", description: "模拟考试 ≥ 70 分", icon: "Trophy", threshold: 70, order: 12 },
] as const;
