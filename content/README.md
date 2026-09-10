# ACCA Master 种子内容规范 (Seed Content Spec)

本目录下的 JSON 文件将被 `scripts/seed.ts` 导入数据库。
**全部数据必须为原创**：不得复制 ACCA 官方真题、Kaplan/BPP/Becker 等任何受版权保护资料。可以引用标准名称（IFRS 15、IAS 16、ISA 500 等）与公开的考试结构信息，但题目文本、解析、知识点内容必须自行原创撰写。来源类型统一为 `original_ai_generated`，来源名 `ACCA Master 原创演示题`。

## 文件布局

```
content/syllabus/<PAPER>.json   // 每科目一个：科目信息 + 知识树（章节/Topic/知识点）
content/questions/<PAPER>.json  // 每科目一个：题目数组
```

## 一、syllabus 文件格式

```json
{
  "code": "FR",
  "name": "Financial Reporting",
  "nameCn": "财务报告",
  "level": "APPLIED_SKILLS",
  "category": null,
  "order": 7,
  "accent": "#6366f1",
  "description": "一至两句话科目简介",
  "examDurationMin": 180,
  "examConfig": {
    "sections": [
      { "id": "A", "name": "Section A - Objective Test Questions", "scope": "客观题", "count": 15, "marksPerQuestion": 2, "sectionMarks": 30 },
      { "id": "B", "name": "Section B - OT Case Questions", "scope": "案例选择", "count": 15, "marksPerQuestion": 2, "sectionMarks": 30 },
      { "id": "C", "name": "Section C - Constructed Response", "scope": "主观题", "count": 2, "marksPerQuestion": 20, "sectionMarks": 40 }
    ]
  },
  "variants": [
    { "code": "GLO", "label": "Global", "region": "Global" },
    { "code": "UK", "label": "United Kingdom", "region": "UK" }
  ],
  "chapters": [
    {
      "code": "01",
      "title": "The Conceptual Framework of Financial Reporting",
      "description": "章节简介（一句话）",
      "topics": [
        {
          "title": "Purpose and status of the framework",
          "points": [
            {
              "code": "CF.1",
              "title": "Purpose and status of the Conceptual Framework",
              "summary": "一句话理解（≤ 80 字，中文）",
              "contentMd": "# 核心概念\n\n...完整的 Markdown 学习笔记...",
              "standardReference": "IFRS Conceptual Framework",
              "examFrequency": "HIGH"
            }
          ]
        }
      ]
    }
  ]
}
```

### 要求
- `chapters` 覆盖该科目官方 syllabus 的主要 section（章节化整理，编号 01, 02, …）。
- 每章 3~4 个 Topics；每个 Topic 3~6 个 Knowledge Points（`points`）。
- 每个知识点必须给 `summary`（一句话理解）和 `contentMd`：
  - `contentMd` 为 Markdown，至少包含小标题：`## 核心概念`、`## 常见考法`、`## 易错点`、`## 例子`、`## 考试提醒`；
  - 允许使用 LaTeX（`$$...$$` 或 `$...$`）与 Markdown 表格；
  - 中文为主，专业术语保留英文（如 Revenue、Leases、Fair value）。
- `standardReference`：引用标准编号（如 IFRS 15、IAS 16、ISA 500、UK Companies Act 2006）。
- 税务科目（TX/ATX）知识点内容必须注明税年，如 2025/26，使用官方公开税率表（UK: 个人所得税基础税率 20%、高税率 40%、附加税率 45%、个人免税额 £12,570；企业所得税主税率 25%（利润 ≤£50,000 为 19%）；增值税标准税率 20%；资本利得税 18%/24%，年度免税额 £3,000）。
- 法律科目（LW）知识点必须注明 jurisdiction（如 England & Wales）。

## 二、questions 文件格式

```json
[
  {
    "paper": "FR",
    "variant": "GLO",
    "chapterCode": "06",
    "topicTitle": "Revenue recognition",
    "kpTitle": "IFRS 15 - Five-step model",
    "type": "SINGLE_CHOICE",
    "difficulty": 3,
    "textMd": "题干（Markdown，可用 $...$ 公式、表格）",
    "options": [
      { "key": "A", "text": "…", "isCorrect": true, "feedbackMd": "正确：要说明为什么对" },
      { "key": "B", "text": "…", "isCorrect": false, "feedbackMd": "错误：解释为什么错" }
    ],
    "answerJson": "[\"A\"]",
    "explanationMd": "## 正确答案\n\nA\n\n## 为什么\n\n…\n\n## 计算过程\n\n…（计算题必填）\n\n## 对应知识点\n\nIFRS 15 五步法\n\n## 其他选项分析\n\nB 错在…\n\n## 易错提醒\n\n…\n\n## 考试技巧\n\n…",
    "marks": 2,
    "estimatedTimeSec": 120,
    "taxYear": null,
    "standardReference": "IFRS 15",
    "sourceType": "original_ai_generated",
    "sourceName": "ACCA Master 原创演示题",
    "copyrightStatus": "original"
  }
]
```

### 题型与 answerJson 约定（**必须严格遵守**）

| type | 说明 | answerJson 格式 | options 是否必须 |
|---|---|---|---|
| `SINGLE_CHOICE` | 单选 | `["B"]`（唯一正确 key） | 是，4~5 个 |
| `MULTIPLE_CHOICE` | 多选 | `["A","C"]`（≥2 个正确 key） | 是，4~5 个 |
| `TRUE_FALSE` | 判断 | `["TRUE"]` 或 `["FALSE"]` | 是，两个选项 TRUE/FALSE |
| `FILL_NUMERIC` | 数字填空 | `{"value":"12500","tolerance":0.5,"unit":"$'000"}` | 否 |
| `CALCULATION` | 计算题（近似数字填空） | 同 FILL_NUMERIC（tolerance 建议 1~2%） | 否 |
| `CASE_MCQ` | 案例单选（题干含案例材料 + 一个单选问题） | `["B"]` | 是 |
| `MATCHING` | 匹配题 | `{"left":["X","Y","Z"],"right":["1","2","3"],"pairs":{"X":"1","Y":"2","Z":"3"}}` | 否（左右项在题干与 answerJson 中） |
| `CLASSIFICATION` | 分类题 | `{"groups":[{"group":"Operating","items":["A","C"]},{"group":"Financing","items":["B"]}]}` | 否（待分类项写在题干） |
| `CONSTRUCTED_RESPONSE` | 主观题 | `{"modelAnswer":"…markdown…","rubric":[{"point":"关键点","marks":1}],"keywords":["word1","word2"]}` | 否 |
| `ESSAY` | 论述题 | 同 CONSTRUCTED_RESPONSE | 否 |
| `ACCOUNTING_ENTRY` | 分录题 | 同 CONSTRUCTED_RESPONSE（modelAnswer 为分录） | 否 |
| `FINANCIAL_STATEMENT` | 财务报表题 | 同 CONSTRUCTED_RESPONSE（modelAnswer 为报表格式） | 否 |

### 选择题一致性规则（**硬性**）
- `options[].isCorrect` 与 `answerJson` 必须完全一致；单选题仅 1 个 isCorrect。
- 选项 key 必须为 A、B、C、D（可 E），无重复。
- 错误选项的 `feedbackMd` 必须写清楚错误原因，不能为空。

### 难度
1 = 基础概念记忆；2 = 简单应用；3 = 中等（常规考试难度）；4 = 困难（综合）；5 = Exam Level（压轴风格）。

### 解析（explanationMd）要求
必须包含小标题：`## 正确答案`、`## 为什么`、`## 计算过程`（计算/财管题必填）、`## 对应知识点`、`## 其他选项分析`（选择题必填）、`## 易错提醒`、`## 考试技巧`。总长度 ≥ 300 字。

### 内容纪律（红线）
- 原创撰写，不得抄袭任何商业题库或官方真题原文。
- 会计/审计/税法数字题：先自己验证计算，再写答案；答案必须唯一、计算可复核（解析中给出计算过程）。
- 不确定的待遇（如某准则是否适用）宁可不出题，不得编造。
- TX/ATX 题目必须填 `taxYear`（如 `"2025/26"`）并在题干注明税率来源；LW 题必须填 `jurisdiction`；FR/SBR 题填 `standardReference`。
- 每题必须绑到 syllabus 文件里真实存在的 chapterCode/topicTitle/kpTitle（若某章不存在 Topic 级内容，可用章节名作为 topicTitle）。

## 三、Agent 文件分配

只写你被分配到的科目的文件，文件路径严格为 `content/syllabus/<CODE>.json` 与 `content/questions/<CODE>.json`（最终一致性交给 seed 脚本校验）。完成后报告：每个文件的行数、题型分布、每个科目题目数量与难度分布。

## 四、质量自检（提交前必须逐项检查）

1. `node -e "JSON.parse(require('fs').readFileSync('content/syllabus/XXXX.json','utf8'))"` 通过（或等价方式校验 JSON 合法）。
2. 选择题答案 key 存在于 options、isCorrect 数量正确。
3. 所有计算题在解析中给出可复核计算过程，且答案数值与计算一致。
4. 无任何 < 80 字的解析；无空字符串字段。
5. 每题都有 standardReference 或 taxYear 或 jurisdiction 之一。
