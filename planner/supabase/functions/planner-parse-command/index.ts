import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: CORS });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const sb = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const { input, context } = await req.json();
    if (!input) return new Response(JSON.stringify({ error: "No input" }), { status: 400, headers: CORS });

    if (!geminiKey) {
      return new Response(JSON.stringify({
        intent: "unknown",
        params: {},
        confidence: 0,
        message: "AI parser not configured (no GEMINI_API_KEY)",
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const systemPrompt = `Kamu adalah parser perintah untuk aplikasi manajemen proyek konstruksi "Monefyi Planner".
Bahasa utama pengguna: Bahasa Indonesia informal.

Konteks saat ini:
- Proyek aktif: ${JSON.stringify(context?.projects || [])}
- Item pekerjaan aktif: ${JSON.stringify(context?.work_items || [])}
- Proyek yang sedang dibuka: ${context?.current_project || "tidak ada"}

Tugas: Parse input pengguna menjadi JSON dengan format:
{
  "intent": "record_cost|update_progress|check_budget|check_progress|open_project|add_worker_log|open_report|ask_recommendation|add_rap_item|add_work_item|general_query",
  "params": { ... sesuai intent ... },
  "confidence": 0.0-1.0,
  "explanation": "penjelasan singkat"
}

Contoh intent & params:
- record_cost: { item, qty, unitPrice, total, projectName }
- update_progress: { workItem, progress }
- check_budget: { projectName }
- check_progress: { projectName }
- open_project: { projectName }
- add_worker_log: { workers }
- open_report: {}
- ask_recommendation: { projectName }

Respond ONLY with valid JSON, no markdown.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\nInput pengguna: " + input }] },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
      }),
    });

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { intent: "unknown", params: {}, confidence: 0 };
    } catch {
      parsed = { intent: "unknown", params: {}, confidence: 0, raw_ai_response: text };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
