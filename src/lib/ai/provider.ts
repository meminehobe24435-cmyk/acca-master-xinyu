// ===== AI Provider 抽象层 =====
// 支持 OpenAI / DeepSeek / Anthropic / Gemini / OpenRouter。
// 未配置 Key 时 getAIProvider() 返回 null，前端显示 "AI 功能未配置"。

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  id: string;
  name: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export type ProviderId = "openai" | "deepseek" | "anthropic" | "gemini" | "openrouter";

class OpenAICompatibleProvider implements AIProvider {
  constructor(
    public id: ProviderId,
    private baseUrl: string,
    private apiKey: string,
    private model: string
  ) {}

  get name() {
    return this.id;
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts?.temperature ?? 0.6,
        max_tokens: opts?.maxTokens ?? 1500,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI provider ${this.id} error ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

class AnthropicProvider implements AIProvider {
  id = "anthropic" as const;
  constructor(
    private apiKey: string,
    private model: string
  ) {}
  get name() {
    return "anthropic";
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const rest = messages.filter((m) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        system,
        messages: rest,
        temperature: opts?.temperature ?? 0.6,
        max_tokens: opts?.maxTokens ?? 1500,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI provider anthropic error ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.map((c) => c.text ?? "").join("") ?? "";
  }
}

export function getAIProvider(): AIProvider | null {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase().trim();

  if (!provider || provider === "none") return null;

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAICompatibleProvider(
      "openai",
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL || "gpt-4o-mini"
    );
  }
  if (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) {
    return new OpenAICompatibleProvider(
      "deepseek",
      process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEPSEEK_MODEL || "deepseek-chat"
    );
  }
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"
    );
  }
  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return new OpenAICompatibleProvider(
      "gemini",
      process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_MODEL || "gemini-2.0-flash"
    );
  }
  if (provider === "openrouter" && process.env.OPENROUTER_API_KEY) {
    return new OpenAICompatibleProvider(
      "openrouter",
      process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      process.env.OPENROUTER_API_KEY,
      process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet"
    );
  }
  return null;
}

export async function aiChat(messages: ChatMessage[], opts?: ChatOptions): Promise<string> {
  const provider = getAIProvider();
  if (!provider) throw new Error("AI_NOT_CONFIGURED");
  return provider.chat(messages, opts);
}
