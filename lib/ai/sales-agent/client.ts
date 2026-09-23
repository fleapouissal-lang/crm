import { GoogleGenAI, type Content, type Part } from "@google/genai";

export type SalesAgentMediaPart =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: string; data: string }
  | { type: "pdf"; data: string };

function geminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    null
  );
}

export function getSalesAgentModel(): string {
  return (
    process.env.SALES_AGENT_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.5-flash"
  );
}

export function isSalesAgentConfigured(): boolean {
  return Boolean(geminiApiKey());
}

/** When true, AI WhatsApp only goes to explicit test leads (no mass outreach). */
export function isSalesOutboundPaused(): boolean {
  const raw = (process.env.SALES_AGENT_PAUSE_OUTREACH || "true").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function salesAgentTestLeadIds(): Set<string> {
  return new Set(
    String(process.env.SALES_AGENT_TEST_LEAD_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function salesAgentTestPhones(): Set<string> {
  return new Set(
    String(process.env.SALES_AGENT_TEST_PHONES || "212680961521,0680961521")
      .split(",")
      .map((s) => s.replace(/\D/g, ""))
      .filter((s) => s.length >= 9)
  );
}

/** @deprecated use isSalesAgentConfigured — kept for call-site compatibility during migration */
export function isAnthropicConfigured(): boolean {
  return isSalesAgentConfigured();
}

export function createGeminiClient(): GoogleGenAI {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

function toParts(input: string | SalesAgentMediaPart[]): Part[] {
  if (typeof input === "string") {
    return [{ text: input }];
  }
  const parts: Part[] = [];
  for (const part of input) {
    if (part.type === "text") {
      parts.push({ text: part.text });
    } else if (part.type === "image") {
      parts.push({
        inlineData: {
          mimeType: part.mimeType || "image/jpeg",
          data: part.data,
        },
      });
    } else if (part.type === "pdf") {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: part.data,
        },
      });
    }
  }
  return parts.length ? parts : [{ text: "" }];
}

function extractText(response: {
  text?: string | null;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}): string {
  const direct = String(response.text || "").trim();
  if (direct) return direct;
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text || "")
    .join("")
    .trim();
}

/** Single-turn text (optional system + multimodal user). */
export async function generateSalesAgentText(options: {
  system?: string;
  user: string | SalesAgentMediaPart[];
  maxTokens?: number;
}): Promise<string> {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: getSalesAgentModel(),
    contents: [{ role: "user", parts: toParts(options.user) }],
    config: {
      ...(options.system ? { systemInstruction: options.system } : {}),
      maxOutputTokens: options.maxTokens ?? 1024,
      // Keep WhatsApp replies short & deterministic (avoid thinking eating the budget)
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return extractText(response);
}

/** Multi-turn chat (prospect history → assistant). */
export async function generateSalesAgentChat(options: {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}): Promise<string> {
  const ai = createGeminiClient();
  const contents: Content[] = options.messages
    .filter((m) => m.content?.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  if (!contents.length) {
    contents.push({ role: "user", parts: [{ text: "." }] });
  }
  // Gemini requires first content to be user; if history starts with assistant, prepend.
  if (contents[0]?.role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "(début de conversation)" }] });
  }
  const response = await ai.models.generateContent({
    model: getSalesAgentModel(),
    contents,
    config: {
      ...(options.system ? { systemInstruction: options.system } : {}),
      maxOutputTokens: options.maxTokens ?? 1536,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return extractText(response);
}
