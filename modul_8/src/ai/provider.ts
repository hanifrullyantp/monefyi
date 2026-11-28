import type { AppSettings, BuildingModel } from "../data/types";
import { parseAiIntentPayload, routeIntent, type IntentResult } from "./router";
import { assertBuildingProposalFromAi } from "./guard";
import { z } from "zod";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiProvider {
  name: string;
  interpret(text: string): Promise<IntentResult>;
  proposeModel(text: string): Promise<Partial<BuildingModel>>;
}

/** Default lokal: deterministik, tanpa jaringan. */
export class MockProvider implements AiProvider {
  name = "Mock deterministik";
  async interpret(text: string): Promise<IntentResult> {
    return routeIntent(text);
  }
  async proposeModel(text: string): Promise<Partial<BuildingModel>> {
    const intent = routeIntent(text);
    attest(intent.slots);
    return {
      area: intent.slots.luas,
      floors: intent.slots.lantai,
      bedrooms: intent.slots.kamar_tidur,
      bathrooms: intent.slots.kamar_mandi,
      location: intent.slots.lokasi,
      roof: intent.slots.atap ? { type: intent.slots.atap, pitch: 30, overhang: 0.6 } : undefined,
      finishing: intent.slots.finishing,
    };
  }
}

function attest(payload: unknown) {
  assertBuildingProposalFromAi(payload);
}

const proposalSchema = z.object({
  area: z.number().positive().max(300).optional(),
  floors: z.number().int().min(1).max(2).optional(),
  bedrooms: z.number().int().min(0).max(10).optional(),
  bathrooms: z.number().int().min(0).max(10).optional(),
  finishing: z.enum(["standar", "menengah", "premium"]).optional(),
  location: z.string().max(80).optional(),
  roof: z.object({ type: z.enum(["pelana", "perisai", "limasan", "datar"]), pitch: z.number(), overhang: z.number() }).optional(),
});

abstract class HttpProvider implements AiProvider {
  abstract name: string;
  constructor(protected settings: AppSettings) {}
  protected abstract complete(messages: AiMessage[]): Promise<string>;

  async interpret(text: string): Promise<IntentResult> {
    const raw = await this.complete([
      { role: "system", content: "Kamu intent router RAB rumah. Balas JSON: {intent, slots:{tipe,luas,lantai,atap,nama,lokasi,kamar_tidur,kamar_mandi,finishing,query}, clarification}. Jangan pernah menyertakan rupiah, volume, atau koefisien." },
      { role: "user", content: text },
    ]);
    try {
      return parseAiIntentPayload(JSON.parse(stripJson(raw)));
    } catch (error) {
      throw new Error(`Output AI gagal validasi — perlu input manual. ${error instanceof Error ? error.message : ""}`);
    }
  }

  async proposeModel(text: string): Promise<Partial<BuildingModel>> {
    const raw = await this.complete([
      { role: "system", content: "Kamu asisten input model rumah. Balas JSON berisi area, floors, bedrooms, bathrooms, finishing, location, roof{type,pitch,overhang}. Dilarang mengirim rupiah, volume, harga, atau koefisien." },
      { role: "user", content: text },
    ]);
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(stripJson(raw));
    } catch {
      throw new Error("Output AI bukan JSON valid — perlu input manual.");
    }
    attest(parsedRaw);
    const parsed = proposalSchema.safeParse(parsedRaw);
    if (!parsed.success) throw new Error("Output model AI gagal validasi — perlu input manual.");
    return parsed.data;
  }
}

export class OpenAICompatibleProvider extends HttpProvider {
  name = "OpenAI-compatible";
  protected async complete(messages: AiMessage[]): Promise<string> {
    if (!this.settings.aiKey) throw new Error("API key belum diisi.");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.settings.aiKey}` },
      body: JSON.stringify({ model: this.settings.aiModel || "gpt-4o-mini", messages, temperature: 0.1, response_format: { type: "json_object" } }),
    });
    if (!response.ok) throw new Error(`Penyedia AI menolak permintaan (${response.status}). Perlu input manual.`);
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

export class AnthropicProvider extends HttpProvider {
  name = "Anthropic";
  protected async complete(messages: AiMessage[]): Promise<string> {
    if (!this.settings.aiKey) throw new Error("API key belum diisi.");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": this.settings.aiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: this.settings.aiModel || "claude-3-5-haiku-latest", max_tokens: 600, system: messages[0]?.content, messages: messages.slice(1), temperature: 0.1 }),
    });
    if (!response.ok) throw new Error(`Penyedia AI menolak permintaan (${response.status}). Perlu input manual.`);
    const data = (await response.json()) as { content?: { text?: string }[] };
    return data.content?.map((item) => item.text ?? "").join("") ?? "";
  }
}

function stripJson(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  return first >= 0 && last > first ? raw.slice(first, last + 1) : raw;
}

export function getProvider(settings: AppSettings): AiProvider {
  if (settings.aiProvider === "openai") return new OpenAICompatibleProvider(settings);
  if (settings.aiProvider === "anthropic") return new AnthropicProvider(settings);
  return new MockProvider();
}
