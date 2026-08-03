import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

interface AiRequest {
  message?: string;
  context?: string;
}

async function callGemini(message: string, contextJson: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const systemPrompt = `Kamu adalah asisten PMS hotel "STAY" untuk staff front desk dan manager di Indonesia.
Jawab singkat (max 3 kalimat), ramah, dalam Bahasa Indonesia.
Gunakan data konteks JSON berikut — jangan mengarang angka di luar data:
${contextJson}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nPertanyaan staff: ${message}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return String(text).trim();
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(url, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authErr } = await userClient.auth.getUser();
      if (authErr || !authData?.user) {
        return errorResponse(req, "Unauthorized", 401);
      }
    }

    const body = (await req.json()) as AiRequest;
    const message = body.message?.trim();
    if (!message) {
      return errorResponse(req, "message required", 400);
    }

    const contextJson = body.context || "{}";
    let reply: string;

    try {
      reply = await callGemini(message, contextJson);
    } catch (geminiErr) {
      console.error("Gemini fallback:", geminiErr);
      reply = "Maaf, AI sementara tidak tersedia. Coba tanya: kamar kosong, pendapatan hari ini, atau checkout.";
    }

    return jsonResponse(req, { reply, provider: "gemini" });
  } catch (err) {
    return errorResponse(req, String(err), 500);
  }
});
