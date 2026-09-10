import Link from "next/link";
import { Brain, Keyboard, LifeBuoy, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FishIcon, SparkIcon } from "@/components/brand/fish";

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div className="soft-aurora relative overflow-hidden rounded-2xl border bg-card/70 p-5 shadow-sm">
        <div className="relative flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SparkIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">帮助 & 快捷键 ⭐🐟</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              打开网址就能直接学，不需要登录、不需要注册。这一页是给自己留的小抄。
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 快捷键 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-primary" /> 键盘快捷键（PC 刷题模式）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { keys: ["1", "2", "3", "4"], desc: "选择答案（按选项字母顺序）" },
                { keys: ["Enter"], desc: "提交答案；已提交时进入下一题" },
                { keys: ["N"], desc: "下一题" },
                { keys: ["P"], desc: "上一题" },
                { keys: ["F"], desc: "收藏 / 取消收藏当前题目" },
              ].map((row) => (
                <div key={row.desc} className="flex items-center gap-3">
                  <span className="flex gap-1">
                    {row.keys.map((k) => (
                      <kbd key={k} className="rounded-md border bg-secondary px-2 py-1 font-mono text-xs font-semibold">
                        {k}
                      </kbd>
                    ))}
                  </span>
                  <span className="text-sm text-muted-foreground">{row.desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
              输入框聚焦时快捷键自动失效，不会打断你写笔记或公式。
            </p>
          </CardContent>
        </Card>

        {/* 常见问题 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-primary" /> 常见问题
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Q：需要注册或登录吗？</p>
              <p className="mt-1">不需要。打开网址直接进入学习空间，答题记录、错题本、收藏与掌握度都会自动保存。</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q：换手机或者换浏览器，数据还在吗？</p>
              <p className="mt-1">在。数据保存在部署平台的数据库中（不是浏览器缓存），同一个网址访问就是同一份学习数据。</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q：AI Tutor 显示「未配置」？</p>
              <p className="mt-1">
                AI 讲解需要在服务器环境变量里配置 API Key（AI_PROVIDER + 对应 Key）。没有配置时核心功能完全可用，
                只是 AI 区域会提示未配置，不影响刷题、错题与统计。
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q：错题为什么要按 1 / 3 / 7 / 14 / 30 天复习？</p>
              <p className="mt-1">
                这是间隔重复策略：在快要忘记的时候复习，记得最牢。连续做对会自动跳到下一阶段，做错也没关系，回到第一阶段重新来。
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q：模拟考试是官方真题吗？</p>
              <p className="mt-1">
                不是。题目都是原创练习材料，模拟考试的 Section 结构与时长按官方考制设置，但不等同于真实考试难度与内容。
                真实备考请以当前 ACCA 官方 syllabus 与考试规则为准。
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q：管理后台在哪？</p>
              <p className="mt-1">
                访问 <code className="rounded bg-secondary px-1.5 py-0.5">/admin</code>，需要输入管理员口令（服务器环境变量
                ADMIN_PASSWORD）。口令不会出现在前端代码里。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ⭐🐟 设计说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> 这个空间的设计想法
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p className="flex items-start gap-2">
            <FishIcon className="mt-0.5 h-4 w-5 shrink-0 text-primary" />
            答对时会有随机的夸奖（连着答对还会有加成），答错时不会出现「错误」「又错了」这类字眼 ——
            错题只是提前发现的漏洞，会安静地进错题本，过几天再提醒你回来看。
          </p>
          <p className="flex items-start gap-2">
            <SparkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
            首页问候会随早上 / 下午 / 晚上变化，鼓励语从一个一百多句的池子里随机取，不会每天都一样。
            <span className="whitespace-nowrap">学习数据为 0 时也不会硬夸，只会说「第一题一直在这里等你」。</span>
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            专业内容保持严谨：题目、答案、准则引用、计算公式、Mock 规则都不做任何可爱化处理；
            涉及准则与税率的地方都保留了「以官方 syllabus 为准」的提示。
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        还有别的问题？先随便点开一页试试，或者回到{" "}
        <Link href="/dashboard" className="text-primary hover:underline">
          学习中心
        </Link>
        。
      </p>
    </div>
  );
}
