/**
 * monefyi-voice-transcribe
 * Transcribe short voice clips (Indonesian) via Groq Whisper or OpenAI Whisper.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

const MAX_BYTES = 3 * 1024 * 1024; // 3MB

async function authenticate(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const supabaseUrl = pickEnv("SUPABASE_URL");
  const anon = pickEnv("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anon) return null;
  const sb = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} language
 */
async function transcribeWithGroq(blob: Blob, filename: string, language: string) {
  const key = pickEnv("GROQ_API_KEY");
  if (!key) return null;

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-large-v3");
  form.append("language", language === "en" ? "en" : "id");
  form.append("response_format", "json");
  form.append("temperature", "0");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`groq_whisper ${res.status}: ${txt.slice(0, 240)}`);
  }
  const data = await res.json();
  return {
    transcript: String(data?.text || "").trim(),
    engine: "groq_whisper",
  };
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} language
 */
async function transcribeWithOpenAI(blob: Blob, filename: string, language: string) {
  const key = pickEnv("OPENAI_API_KEY");
  if (!key) return null;

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-1");
  form.append("language", language === "en" ? "en" : "id");
  form.append("response_format", "json");
  form.append("temperature", "0");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`openai_whisper ${res.status}: ${txt.slice(0, 240)}`);
  }
  const data = await res.json();
  return {
    transcript: String(data?.text || "").trim(),
    engine: "openai_whisper",
  };
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  try {
    const user = await authenticate(req);
    if (!user) return errorResponse(req, "Unauthorized", 401);

    const contentType = req.headers.get("content-type") || "";
    let audioBlob: Blob | null = null;
    let language = "id";
    let filename = "voice.webm";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio") || form.get("file");
      if (file instanceof File || file instanceof Blob) {
        audioBlob = file;
        if (file instanceof File && file.name) filename = file.name;
      }
      const lang = form.get("language");
      if (typeof lang === "string" && lang.trim()) language = lang.trim().slice(0, 8);
    } else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const b64 = String(body?.audioBase64 || body?.audio || "").trim();
      if (!b64) return errorResponse(req, "audio required", 400);
      const mime = String(body?.mimeType || "audio/webm").trim();
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      audioBlob = new Blob([bin], { type: mime });
      filename = mime.includes("mp4") ? "voice.m4a" : mime.includes("ogg") ? "voice.ogg" : "voice.webm";
      if (body?.language) language = String(body.language).slice(0, 8);
    } else {
      // Raw audio body
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return errorResponse(req, "empty body", 400);
      audioBlob = new Blob([buf], { type: contentType || "audio/webm" });
    }

    if (!audioBlob || audioBlob.size < 64) {
      return errorResponse(req, "audio too small", 400);
    }
    if (audioBlob.size > MAX_BYTES) {
      return errorResponse(req, "audio too large (max 3MB)", 413);
    }

    let result = null;
    let lastErr = "";
    try {
      result = await transcribeWithGroq(audioBlob, filename, language);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      console.warn("[voice-transcribe] groq failed", lastErr);
    }
    if (!result?.transcript) {
      try {
        result = await transcribeWithOpenAI(audioBlob, filename, language);
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        console.warn("[voice-transcribe] openai failed", lastErr);
      }
    }

    if (!result) {
      return errorResponse(
        req,
        lastErr || "No STT provider configured (set GROQ_API_KEY or OPENAI_API_KEY)",
        503,
      );
    }

    return jsonResponse(req, {
      success: true,
      transcript: result.transcript,
      engine: result.engine,
      language,
      user_id: user.id,
    });
  } catch (e) {
    console.error("[voice-transcribe]", e);
    return errorResponse(req, e instanceof Error ? e.message : "Internal error", 500);
  }
});
