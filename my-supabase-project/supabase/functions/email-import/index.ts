/**
 * email-import — Resend inbound webhook → parse bank email → pending import.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  BUNDLED_TEMPLATES,
  compileDbTemplate,
  parseEmail,
  stripHtml,
  type BankTemplate,
  type ParsedTx,
} from "./templates.ts";

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function normalizeAddress(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((v) => normalizeAddress(v)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return String(o.address || o.email || o.value || "");
  }
  return String(value);
}

function firstRecipient(to: unknown): string {
  if (Array.isArray(to)) return normalizeAddress(to[0]);
  return normalizeAddress(to);
}

async function hashString(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function verifyWebhook(req: Request): boolean {
  const secret = pickEnv("EMAIL_IMPORT_WEBHOOK_SECRET");
  if (!secret) return true;
  const header =
    req.headers.get("x-email-import-secret") ||
    req.headers.get("x-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return header === secret;
}

async function loadTemplates(supabase: ReturnType<typeof createClient>): Promise<BankTemplate[]> {
  try {
    const { data, error } = await supabase
      .from("email_import_templates")
      .select("id, bank, config")
      .eq("is_active", true);
    if (error || !data?.length) return BUNDLED_TEMPLATES;
    const compiled = data
      .map((row) => compileDbTemplate(row as { id: string; bank: string; config: Record<string, unknown> }))
      .filter((t): t is BankTemplate => !!t);
    return compiled.length ? [...compiled, ...BUNDLED_TEMPLATES.filter((t) => t.id === "generic_bank")] : BUNDLED_TEMPLATES;
  } catch {
    return BUNDLED_TEMPLATES;
  }
}

async function autoConfirmImport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  importRecord: Record<string, unknown>,
) {
  try {
    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: importRecord.parsed_type,
        amount: importRecord.parsed_amount,
        merchant: importRecord.parsed_merchant,
        category: importRecord.parsed_category,
        account: importRecord.parsed_account,
        date: importRecord.parsed_date,
        notes: `${importRecord.parsed_notes || ""} (auto-import)`.trim(),
      })
      .select("id")
      .single();

    if (error || !tx) {
      console.warn("[email-import] Auto-confirm tx insert failed:", error);
      return;
    }

    await supabase
      .from("email_imports")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        transaction_id: tx.id,
      })
      .eq("id", importRecord.id);
  } catch (e) {
    console.error("[email-import] Auto-confirm failed:", e);
  }
}

serve(async (req: Request) => {
  const cors = handleCorsPreflightRequest(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  if (!verifyWebhook(req)) {
    return errorResponse(req, "Unauthorized webhook", 401);
  }

  try {
    const supabaseUrl = pickEnv("SUPABASE_URL");
    const serviceKey = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return errorResponse(req, "Server misconfigured", 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const payload = await req.json();

    // Support nested Resend shapes: { data: {...} } or flat
    const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    const from = normalizeAddress(data.from || data.From || data.sender);
    const toRaw = data.to || data.To || data.recipient || data.recipients;
    const to = firstRecipient(toRaw);
    const subject = String(data.subject || data.Subject || "");
    const text = String(data.text || data.Text || data.plain || "");
    const html = String(data.html || data.Html || "");

    console.log("[email-import] from:", from, "to:", to, "subject:", subject);

    // Prefer support.monefyi.com; accept legacy import.monefyi.com during transition
    const recipientMatch = to.match(
      /tx-([a-f0-9]+)@(?:support|import)\.monefyi\.com/i,
    );
    if (!recipientMatch) {
      return errorResponse(req, "Invalid recipient address", 400);
    }

    const shortUserId = recipientMatch[1].toLowerCase();

    const { data: config, error: configErr } = await supabase
      .from("email_import_config")
      .select("user_id, is_active, auto_confirm, import_address")
      .ilike("import_address", `tx-${shortUserId}%`)
      .maybeSingle();

    if (configErr || !config) {
      return errorResponse(req, "Import address not found", 404);
    }

    if (!config.is_active) {
      return jsonResponse(req, { status: "disabled", message: "Import is disabled for this user" });
    }

    const userId = config.user_id as string;
    const body = text || stripHtml(html) || "";
    const baseHash = await hashString(`${from}|${subject}|${body.slice(0, 200)}`);

    const { data: existing } = await supabase
      .from("email_imports")
      .select("id")
      .eq("email_hash", baseHash)
      .maybeSingle();

    if (existing) {
      return jsonResponse(req, { status: "duplicate", message: "Email already processed" });
    }

    const templates = await loadTemplates(supabase);
    const parsedList = parseEmail(from, subject, body, templates, 5);

    if (!parsedList.length) {
      await supabase.from("email_imports").insert({
        user_id: userId,
        email_from: from,
        email_subject: subject,
        email_hash: baseHash,
        status: "error",
        raw_snippet: body.slice(0, 500),
        parse_confidence: 0,
        parse_method: "none",
      });
      return jsonResponse(req, { status: "parse_failed", message: "Could not parse transaction" });
    }

    const importIds: string[] = [];
    const parsedOut: ParsedTx[] = [];

    for (let i = 0; i < parsedList.length; i++) {
      const parseResult = parsedList[i];
      const emailHash = i === 0 ? baseHash : `${baseHash}_${i}`;

      const { data: existingIdx } = await supabase
        .from("email_imports")
        .select("id")
        .eq("email_hash", emailHash)
        .maybeSingle();
      if (existingIdx) continue;

      const row = {
        user_id: userId,
        email_from: from,
        email_subject: subject,
        email_hash: emailHash,
        bank_id: parseResult.bankId,
        parsed_type: parseResult.type,
        parsed_amount: parseResult.amount,
        parsed_merchant: parseResult.merchant || null,
        parsed_date: parseResult.date || new Date().toISOString().split("T")[0],
        parsed_account: parseResult.account || null,
        parsed_category: parseResult.category || "Other",
        parsed_notes: `Import dari email ${parseResult.bankId || "Unknown"}`,
        parse_confidence: parseResult.confidence,
        parse_method: parseResult.method || "template",
        template_id: parseResult.templateId,
        status: config.auto_confirm ? "confirmed" : "pending",
        raw_snippet: body.slice(0, 500),
      };

      const { data: importRecord, error: insertErr } = await supabase
        .from("email_imports")
        .insert(row)
        .select()
        .single();

      if (insertErr) {
        console.error("[email-import] Insert error:", insertErr);
        continue;
      }

      if (config.auto_confirm && importRecord) {
        await autoConfirmImport(supabase, userId, importRecord);
      }

      if (importRecord?.id) importIds.push(importRecord.id);
      parsedOut.push(parseResult);
    }

    if (!importIds.length) {
      return errorResponse(req, "Failed to save import", 500);
    }

    return jsonResponse(req, {
      status: "success",
      import_ids: importIds,
      count: importIds.length,
      parsed: parsedOut.map((p) => ({
        type: p.type,
        amount: p.amount,
        merchant: p.merchant,
        account: p.account,
        confidence: p.confidence,
      })),
    });
  } catch (e) {
    console.error("[email-import] Error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Internal error", 500);
  }
});
