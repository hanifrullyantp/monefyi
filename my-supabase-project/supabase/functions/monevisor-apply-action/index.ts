/**
 * Edge function: apply structured Monevisor actions (one-tap).
 * Works with Monefyi budgets schema: { user_id, month, income, categories: { rows: [...] } }
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

function monthFromPayload(payload: Record<string, unknown>): string {
  const m = String(payload?.month || payload?.budgetMonth || "").slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(m)) return m;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getRows(categories: unknown): any[] {
  if (!categories || typeof categories !== "object") return [];
  const c = categories as { rows?: any[] };
  return Array.isArray(c.rows) ? c.rows.map((r) => ({ ...r })) : [];
}

async function loadBudgetMonth(supabase: any, userId: string, month: string) {
  const { data, error } = await supabase
    .from("budgets")
    .select("user_id,month,income,categories,updated_at")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  if (error) throw error;
  return data || { user_id: userId, month, income: 0, categories: { rows: [] } };
}

async function saveBudgetMonth(
  supabase: any,
  userId: string,
  month: string,
  income: number,
  rows: any[],
) {
  const categories = { rows };
  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: userId,
      month,
      income: Number(income || 0),
      categories,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" },
  );
  if (error) throw error;
  return { month, income, categories };
}

function findRow(rows: any[], idOrName: string) {
  const key = String(idOrName || "");
  return rows.find((r) => r.id === key || r.name === key || r.category === key);
}

async function executeReallocate(supabase: any, userId: string, payload: any) {
  const month = monthFromPayload(payload);
  const amount = Math.round(Number(payload.amount || 0));
  if (amount <= 0) throw new Error("Invalid reallocate amount");

  const budget = await loadBudgetMonth(supabase, userId, month);
  const rows = getRows(budget.categories);
  const from = findRow(rows, payload.from_budget_id || payload.from || payload.from_category);
  const to = findRow(rows, payload.to_budget_id || payload.to || payload.to_category);
  if (!from || !to) throw new Error("Budget row not found for reallocate");

  from.amount = Math.max(0, Number(from.amount || 0) - amount);
  to.amount = Number(to.amount || 0) + amount;

  const saved = await saveBudgetMonth(supabase, userId, month, budget.income, rows);
  return { from: from.name || from.category, to: to.name || to.category, amount, saved };
}

async function executeBudgetChange(supabase: any, userId: string, payload: any) {
  const month = monthFromPayload(payload);
  const newAmount = Math.round(Number(payload.new_amount ?? payload.amount ?? 0));
  const budget = await loadBudgetMonth(supabase, userId, month);
  const rows = getRows(budget.categories);
  const row = findRow(rows, payload.budget_id || payload.category || payload.name);
  if (!row) throw new Error("Budget row not found");
  row.amount = Math.max(0, newAmount);
  const saved = await saveBudgetMonth(supabase, userId, month, budget.income, rows);
  return { budget_id: row.id, category: row.name || row.category, new_amount: newAmount, saved };
}

async function executeCreateBudget(supabase: any, userId: string, payload: any) {
  const month = monthFromPayload(payload);
  const budget = await loadBudgetMonth(supabase, userId, month);
  const rows = getRows(budget.categories);
  const name = String(payload.category || payload.name || "Baru").trim();
  const amount = Math.round(Number(payload.amount || payload.new_amount || 0));
  const id = payload.id || `bud_${crypto.randomUUID()}`;
  rows.push({
    id,
    name,
    amount,
    priority: payload.priority || "penting",
    items: payload.items || [],
  });
  const saved = await saveBudgetMonth(supabase, userId, month, budget.income, rows);
  return { id, name, amount, saved };
}

async function executeSetGoal(supabase: any, userId: string, payload: any) {
  const { month: _m, ...prefs } = payload || {};
  const { data, error } = await supabase
    .from("monevisor_prefs")
    .upsert({
      user_id: userId,
      ...prefs,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  try {
    const SUPABASE_URL = pickEnv("SUPABASE_URL");
    const SUPABASE_ANON_KEY = pickEnv("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") || "";
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authHeader) {
      return errorResponse(req, "Unauthorized", 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return errorResponse(req, "Unauthorized", 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const action_type = String(body?.action_type || body?.type || "").trim();
    const payload = body?.payload || {};
    const source = String(body?.source || "insight");
    const message_id = body?.message_id || null;

    if (!action_type) return errorResponse(req, "action_type is required", 400);

    const { data: actionRecord, error: logErr } = await supabase
      .from("monevisor_actions")
      .insert({
        user_id: user.id,
        action_type,
        action_payload: payload,
        source,
        message_id,
        applied: false,
      })
      .select()
      .single();
    if (logErr) throw logErr;

    let result: unknown;
    switch (action_type) {
      case "reallocate":
        result = await executeReallocate(supabase, user.id, payload);
        break;
      case "increase_budget":
      case "decrease_budget":
        result = await executeBudgetChange(supabase, user.id, payload);
        break;
      case "create_budget":
        result = await executeCreateBudget(supabase, user.id, payload);
        break;
      case "set_goal":
        result = await executeSetGoal(supabase, user.id, payload);
        break;
      case "ask_deeper":
      case "view_category":
        result = { deferred: true, action_type, payload };
        break;
      default:
        throw new Error(`Unknown action: ${action_type}`);
    }

    if (action_type !== "ask_deeper" && action_type !== "view_category") {
      await supabase
        .from("monevisor_actions")
        .update({ applied: true, applied_at: new Date().toISOString() })
        .eq("id", actionRecord.id);
    }

    return jsonResponse(req, {
      success: true,
      action_id: actionRecord.id,
      result,
    });
  } catch (e) {
    console.error("monevisor-apply-action:", e);
    return errorResponse(req, String((e as Error)?.message || e));
  }
});
