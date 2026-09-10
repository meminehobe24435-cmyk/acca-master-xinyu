import { describe, expect, it } from "vitest";
import { parseCsvImport, parseJsonImport, summarizeParse } from "@/lib/import/parse";

describe("CSV 导入解析", () => {
  const csv = [
    "paper,variant,chapter,topic,type,difficulty,question,option_a,option_b,answer,explanation,marks,source",
    "FR,GLO,01,Conceptual Framework,单选,3,What is the purpose of the framework?,Option A,Option B,A,详细解析,2,test source",
    "FR,GLO,01,Conceptual Framework,单选,3,第二题,Option A,Option B,,详细解析2,2,test source", // 缺答案 → ERROR
    "FR,GLO,01,Conceptual Framework,单选,2,第三题,Option A,Option B,1,详细解析3,2,test source", // 答案不存在 → ERROR
    "XX,GLO,01,X,单选,3,未知科目题,Option A,Option B,A,解析,2,test source",
  ].join("\n");

  it("正确识别状态", () => {
    const rows = parseCsvImport(csv);
    expect(rows[0].status).toBe("OK");
    expect(rows[0].data?.type).toBe("SINGLE_CHOICE");
    expect(rows[0].data?.difficulty).toBe(3);
    expect(rows[1].status).toBe("ERROR");
    expect(rows[1].message).toContain("缺少答案");
    expect(rows[2].status).toBe("ERROR");
    expect(rows[2].message).toContain("不存在于选项");
  });

  it("汇总统计", () => {
    const rows = parseCsvImport(csv);
    const s = summarizeParse(rows);
    expect(s.total).toBe(4);
    expect(s.ok).toBe(2);
    expect(s.err).toBe(2);
    expect(s.warn).toBe(0);
  });

  it("缺分值/来源时提示警告", () => {
    const rows = parseCsvImport(
      [
        "paper,type,difficulty,question,option_a,option_b,answer,explanation",
        "FR,单选,3,Q,A,B,A,e",
      ].join("\n")
    );
    expect(rows[0].status).toBe("WARN");
  });
});

describe("中文表头与题型别名", () => {
  const csv = [
    "科目,题型,难度,题干,选项A,选项B,答案,解析,分值,来源",
    "FA,多选,中等,Which two?,A1,B1,\"A B\",解析内容,2,s",
    "PM,计算,Exam,Compute NPV?,A2,B2,\"B\",解析二,2,s",
  ].join("\n");

  it("中文表头映射", () => {
    const rows = parseCsvImport(csv);
    expect(rows[0].data?.paper).toBe("FA");
    expect(rows[0].data?.type).toBe("MULTIPLE_CHOICE");
    expect(rows[0].data?.difficulty).toBe(3);
    expect(rows[1].data?.type).toBe("CALCULATION");
    expect(rows[1].data?.difficulty).toBe(5);
    expect(rows[0].status).toBe("OK");
  });
});

describe("JSON 导入", () => {
  it("数组解析", () => {
    const text = JSON.stringify([
      { paper: "MA", type: "SINGLE_CHOICE", difficulty: 2, question: "Q1", option_a: "A", option_b: "B", answer: "B", explanation: "e", marks: 1, source: "s" },
    ]);
    const rows = parseJsonImport(text);
    expect(rows[0].status).toBe("OK");
    expect(rows[0].data?.paper).toBe("MA");
  });
  it("非数组报错", () => {
    const rows = parseJsonImport('{"not":"array"}');
    expect(rows[0].status).toBe("ERROR");
  });
});

describe("查重", () => {
  it("同批次重复题干被标记", () => {
    const csv = [
      "paper,type,difficulty,question,option_a,option_b,answer,explanation,marks,source",
      "FR,单选,3,同一道题？,A,B,A,e1,1,s",
      "FR,单选,3,同一道题？,A,B,A,e2,1,s",
    ].join("\n");
    const rows = parseCsvImport(csv);
    expect(rows[1].message).toContain("重复");
    expect(rows[0].status).toBe("OK");
    expect(rows[1].status).toBe("WARN");
  });
});
