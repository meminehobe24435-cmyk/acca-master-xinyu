"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

export function KpRadarChart({
  data,
}: {
  data: { kp: string; score: number }[];
}) {
  if (data.length < 3) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        知识点样本不足（至少 3 个）暂不生成雷达图
      </p>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(148,163,184,0.35)" />
          <PolarAngleAxis dataKey="kp" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Radar name="得分" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChapterBarChart({
  data,
}: {
  data: { chapter: string; earned: number; total: number }[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
          <XAxis dataKey="chapter" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={0} angle={-18} height={48} textAnchor="end" />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}
            formatter={(v: number) => [`${v} 分`, "得分"]}
          />
          <Bar dataKey="earned" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLineChart({
  data,
}: {
  data: { label: string; value: number; second?: number }[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}
          />
          <Bar dataKey="value" name="题数" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
