// ===== 题库导入：CSV / XLSX / JSON 解析、校验、查重 =====
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { QUESTION_TYPES } from "@/lib/constants";
import { fnv1a, normalizeText } from "@/lib/utils";

export type RowStatus = "OK" | "WARN" | "ERROR";

export interface ImportRowData {
  paper: string;
  variant: string;
  chapter: string;
  topic: string;
  knowledge_point: string;
  type: string;
  difficulty: number | null;
  question: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  answer: string;
  explanation: string;
  marks: number | null;
  source: string;
  tax_year?: string;
  jurisdiction?: string;
  standard_reference?: string;
  source_url?: string;
}

export interface ParsedRow {
  row: number; // 数据行号（含表头偏移）
  status: RowStatus;
  message: string;
  data?: ImportRowData;
}

export interface ParseResult {
  rows: ParsedRow[];
  total: number;
  ok: number;
  warn: number;
  err: number;
  duplicates: number;
}

const TYPE_ALIASES: Record<string, string> = {
  single: "SINGLE_CHOICE",
  "single_choice": "SINGLE_CHOICE",
  singlechoice: "SINGLE_CHOICE",
  mcq: "SINGLE_CHOICE",
  单选: "SINGLE_CHOICE",
  单选题: "SINGLE_CHOICE",
  multiple: "MULTIPLE_CHOICE",
  "multiple_choice": "MULTIPLE_CHOICE",
  多选: "MULTIPLE_CHOICE",
  多选题: "MULTIPLE_CHOICE",
  truefalse: "TRUE_FALSE",
  "true_false": "TRUE_FALSE",
  判断: "TRUE_FALSE",
  判断题: "TRUE_FALSE",
  fill: "FILL_NUMERIC",
  numeric: "FILL_NUMERIC",
  "fill_numeric": "FILL_NUMERIC",
  填空: "FILL_NUMERIC",
  数字填空: "FILL_NUMERIC",
  calculation: "CALCULATION",
  计算: "CALCULATION",
  计算题: "CALCULATION",
  matching: "MATCHING",
  匹配: "MATCHING",
  匹配题: "MATCHING",
  classification: "CLASSIFICATION",
  分类: "CLASSIFICATION",
  分类题: "CLASSIFICATION",
  case: "CASE_MCQ",
  case_mcq: "CASE_MCQ",
  案例: "CASE_MCQ",
  案例选择题: "CASE_MCQ",
  constructed: "CONSTRUCTED_RESPONSE",
  constructed_response: "CONSTRUCTED_RESPONSE",
  cr: "CONSTRUCTED_RESPONSE",
  主观: "CONSTRUCTED_RESPONSE",
  主观题: "CONSTRUCTED_RESPONSE",
  essay: "ESSAY",
  论述: "ESSAY",
  论述题: "ESSAY",
  entry: "ACCOUNTING_ENTRY",
  accounting_entry: "ACCOUNTING_ENTRY",
  分录: "ACCOUNTING_ENTRY",
  分录题: "ACCOUNTING_ENTRY",
  financial: "FINANCIAL_STATEMENT",
  financial_statement: "FINANCIAL_STATEMENT",
  报表: "FINANCIAL_STATEMENT",
  财务报表题: "FINANCIAL_STATEMENT",
};

const DIFF_ALIASES: Record<string, number> = {
  basic: 1,
  easy: 2,
  medium: 3,
  hard: 4,
  exam: 5,
  examlevel: 5,
  基础: 1,
  简单: 2,
  中等: 3,
  困难: 4,
  考试: 5,
};

const HEADER_ALIASES: Record<string, string> = {
  paper: "paper",
  科目: "paper",
  variant: "variant",
  地区: "variant",
  版本: "variant",
  chapter: "chapter",
  章节: "chapter",
  topic: "topic",
  topic_title: "topic",
  主题: "topic",
  knowledge_point: "knowledge_point",
  knowledgepoint: "knowledge_point",
  kp: "knowledge_point",
  知识点: "knowledge_point",
  type: "type",
  题型: "type",
  qtype: "type",
  difficulty: "difficulty",
  难度: "difficulty",
  question: "question",
  题干: "question",
  question_text: "question",
  text: "question",
  option_a: "option_a",
  a: "option_a",
  options_a: "option_a",
  选项a: "option_a",
  选项b: "option_b",
  选项c: "option_c",
  选项d: "option_d",
  选项e: "option_e",
  option_b: "option_b",
  b: "option_b",
  option_c: "option_c",
  c: "option_c",
  option_d: "option_d",
  d: "option_d",
  option_e: "option_e",
  e: "option_e",
  answer: "answer",
  答案: "answer",
  correct: "answer",
  explanation: "explanation",
  解析: "explanation",
  explain: "explanation",
  marks: "marks",
  分值: "marks",
  score: "marks",
  source: "source",
  来源: "source",
  source_name: "source",
  tax_year: "tax_year",
  税年: "tax_year",
  jurisdiction: "jurisdiction",
  司法辖区: "jurisdiction",
  standard_reference: "standard_reference",
  准则: "standard_reference",
  standard: "standard_reference",
  source_url: "source_url",
  来源链接: "source_url",
};

function normalizeHeader(h: string): string {
  const key = String(h ?? "").trim().toLowerCase().replace(/[\s_\-]/g, "_");
  return HEADER_ALIASES[key] ?? key;
}

function normalizeType(v: string | undefined | null): string | null {
  const key = String(v ?? "").trim().toLowerCase().replace(/[\s_\-]/g, "");
  const mapped = TYPE_ALIASES[key];
  return mapped && QUESTION_TYPES.includes(mapped as never) ? mapped : null;
}

function normalizeDifficulty(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isNaN(n) && n >= 1 && n <= 5) return Math.round(n);
  const key = String(v).trim().toLowerCase().replace(/[\s_\-]/g, "");
  return DIFF_ALIASES[key] ?? null;
}

/** 解析导入稿（Buffer → 文本行） */
export async function parseImportText(text: string, fileName: string): Promise<ParsedRow[]> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return parseJsonImport(text);
  if (ext === "csv" || ext === "txt") return parseCsvImport(text);
  return []; // xlsx 走 parseImportBuffer
}

export function parseCsvImport(text: string): ParsedRow[] {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  return validateRows(result.data.map((raw) => mapHeaders(raw)));
}

export function parseJsonImport(text: string): ParsedRow[] {
  const data = JSON.parse(text) as Record<string, unknown>[];
  if (!Array.isArray(data)) {
    return [{ row: 0, status: "ERROR", message: "JSON 顶层必须是数组" }];
  }
  const rows = data.map((item, i) => {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) {
      normalized[normalizeHeader(k)] = v === null || v === undefined ? "" : String(v);
    }
    return normalized;
  });
  return validateRows(rows, 1);
}

export async function parseImportBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedRow[]> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx" || ext === "xls") {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return [{ row: 0, status: "ERROR", message: "Excel 文件为空" }];
    const array = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const rows = array.map((raw) => {
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        const key = normalizeHeader(String(k));
        normalized[key] = v === null || v === undefined ? "" : String(v);
      }
      return normalized;
    });
    return validateRows(rows, 2);
  }
  return parseImportText(new TextDecoder().decode(buffer), fileName);
}

function mapHeaders(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[normalizeHeader(k)] = v;
  }
  return out;
}

export function validateRows(rows: Record<string, string>[], headerOffset = 1): ParsedRow[] {
  const dupMap = new Map<string, number>();
  const out: ParsedRow[] = [];

  rows.forEach((raw, idx) => {
    const rowNum = idx + headerOffset; // 表头占一行
    const issues: string[] = [];
    const warnings: string[] = [];

    const paper = String(raw.paper ?? "").trim().toUpperCase();
    const question = String(raw.question ?? "").trim();
    const type = normalizeType(raw.type);
    const difficulty = normalizeDifficulty(raw.difficulty);
    const marks = raw.marks ? Number(raw.marks) : null;
    const answer = String(raw.answer ?? "").trim();
    const explanation = String(raw.explanation ?? "").trim();
    const optionKeys = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const;
    const optionsRaw = optionKeys
      .map((k) => ({ key: k.slice(-1).toUpperCase(), text: String(raw[k] ?? "").trim() }))
      .filter((o) => o.text.length > 0);

    if (!paper) issues.push("缺少科目 paper");
    if (!question) issues.push("缺少题干 question");
    if (!type) issues.push(`题型无法识别: "${raw.type}"（支持: 单选/多选/判断/填空/计算/匹配/分类/案例/主观/论述/分录/报表）`);
    if (!answer) issues.push("缺少答案 answer");

    // 选择题选项校验
    const isChoice = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "CASE_MCQ"].includes(type ?? "");
    if (isChoice && optionsRaw.length < 2) issues.push("选择题至少需要 2 个选项");

    const answerKeys = isChoice
      ? answer.toUpperCase().split(/[\s,;|]+/).filter(Boolean).map((k) => k.replace(/[^A-Z]/g, ""))
      : [];

    if (isChoice) {
      const optionKeysAvailable = optionsRaw.map((o) => o.key);
      for (const k of answerKeys) {
        if (!optionKeysAvailable.includes(k)) issues.push(`答案 "${k}" 不存在于选项（只有 ${optionKeysAvailable.join("/")}）`);
      }
      if (type === "SINGLE_CHOICE" && answerKeys.length !== 1) issues.push("单选题答案必须唯一");
      if (type === "TRUE_FALSE") {
        const valid = answerKeys.every((k) => k === "TRUE" || k === "FALSE");
        if (!valid) issues.push("判断题答案只能是 TRUE 或 FALSE");
      }
    }

    if (!difficulty) {
      warnings.push("难度未识别，默认为 3（中等）");
    }
    if (!marks) warnings.push("分值未填写，默认为 1");
    if (!explanation) warnings.push("缺少解析-建议补充后发布");
    if (!raw.source) warnings.push("来源未填写");

    // 查重
    const hash = fnv1a(normalizeText(`${paper}|${question}`));
    const dupCount = dupMap.get(hash) ?? 0;
    if (dupCount > 0) warnings.push(`与 ${dupCount} 行前的第 ${rowNum - dupCount} 行重复（规范化题干相同）`);
    dupMap.set(hash, dupCount + 1);

    const status: RowStatus = issues.length > 0 ? "ERROR" : warnings.length > 0 ? "WARN" : "OK";
    out.push({
      row: rowNum,
      status,
      message: [...issues, ...warnings].join("；"),
      data: {
        paper,
        variant: String(raw.variant ?? "").trim().toUpperCase() || "GLO",
        chapter: String(raw.chapter ?? "").trim(),
        topic: String(raw.topic ?? "").trim(),
        knowledge_point: String(raw.knowledge_point ?? "").trim(),
        type: type ?? "SINGLE_CHOICE",
        difficulty,
        question,
        option_a: optionsRaw.find((o) => o.key === "A")?.text,
        option_b: optionsRaw.find((o) => o.key === "B")?.text,
        option_c: optionsRaw.find((o) => o.key === "C")?.text,
        option_d: optionsRaw.find((o) => o.key === "D")?.text,
        option_e: optionsRaw.find((o) => o.key === "E")?.text,
        answer,
        explanation,
        marks,
        source: String(raw.source ?? "").trim() || "用户导入",
        tax_year: String(raw.tax_year ?? "").trim() || undefined,
        jurisdiction: String(raw.jurisdiction ?? "").trim() || undefined,
        standard_reference: String(raw.standard_reference ?? "").trim() || undefined,
        source_url: String(raw.source_url ?? "").trim() || undefined,
      },
    });
  });

  return out;
}

export function summarizeParse(rows: ParsedRow[]): Omit<ParseResult, "rows"> {
  return {
    total: rows.length,
    ok: rows.filter((r) => r.status === "OK").length,
    warn: rows.filter((r) => r.status === "WARN").length,
    err: rows.filter((r) => r.status === "ERROR").length,
    duplicates: rows.filter((r) => r.message.includes("重复")).length,
  };
}
