import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  assertTestUser,
  applyScenarioBundle,
  resolveScenarioBundle,
  runVerificationChecks,
  generateScenarioFromConfig,
  resetTestUserData,
} from "../_shared/testLabHelpers.ts";

async function requireAdmin(supa: ReturnType<typeof createClient>, callerId: string) {
  const { data: prof } = await supa.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (String(prof?.role || "").toLowerCase() !== "admin") throw new Error("FORBIDDEN");
}

const PROXY_TABLES = new Set([
  "transactions",
  "budgets",
  "user_preferences",
  "financial_goals",
  "neraca_assets",
  "neraca_debts",
]);

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) return jsonResponse(req, { error: "Unauthorized" }, 401);

    const sb = createClient(url, service, { auth: { persistSession: false } });
    const adminId = authData.user.id;
    await requireAdmin(sb, adminId);

    const body = await req.json();
    const action = String(body.action || "").toLowerCase();

    if (action === "list_test_users") {
      const { data, error } = await sb
        .from("profiles")
        .select("id, name, test_scenario_label, created_at, is_test_user")
        .eq("is_test_user", true)
        .order("created_at", { ascending: false });
      if (error) return jsonResponse(req, { error: error.message }, 500);

      const { data: authList } = await sb.auth.admin.listUsers({ perPage: 1000 });
      const emailById = new Map((authList?.users || []).map((u: any) => [u.id, u.email]));

      const users = (data || []).map((p: any) => ({
        ...p,
        email: emailById.get(p.id) || null,
      }));

      const { data: sessions } = await sb
        .from("admin_test_sessions")
        .select("*")
        .eq("admin_user_id", adminId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());

      return jsonResponse(req, { users, activeSessions: sessions || [] });
    }

    if (action === "create_test_user") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || `Test${Date.now().toString(36)}!`);
      if (!email.includes("@")) return jsonResponse(req, { error: "email required" }, 400);

      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: String(body.name || "Test User").slice(0, 200) },
      });
      if (createErr || !created?.user) {
        return jsonResponse(req, { error: createErr?.message || "create failed" }, 500);
      }

      const uid = created.user.id;
      await sb.from("profiles").upsert({
        id: uid,
        name: String(body.name || "Test User").slice(0, 200),
        role: "user",
        status: "active",
        is_test_user: true,
        plan_type: "lifetime",
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      return jsonResponse(req, {
        user: { id: uid, email, password },
        message: "Simpan password — hanya ditampilkan sekali.",
      });
    }

    if (action === "list_scenarios") {
      const { data: presets, error: pErr } = await sb
        .from("test_scenarios")
        .select("id, name, description, kind, preset_key, default_month, config, created_at")
        .eq("kind", "preset")
        .order("name");
      if (pErr) return jsonResponse(req, { error: pErr.message }, 500);

      const { data: custom, error: cErr } = await sb
        .from("test_scenarios")
        .select("*")
        .eq("kind", "custom")
        .order("created_at", { ascending: false });
      if (cErr) return jsonResponse(req, { error: cErr.message }, 500);

      return jsonResponse(req, { presets: presets || [], custom: custom || [] });
    }

    if (action === "list_test_history") {
      const limit = Math.min(Number(body.limit) || 30, 100);
      const { data, error } = await sb
        .from("admin_test_runs")
        .select("id, test_user_id, scenario_label, preset_key, pass_count, fail_count, total_count, created_at, result_json")
        .eq("admin_user_id", adminId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return jsonResponse(req, { error: error.message }, 500);
      return jsonResponse(req, { runs: data || [] });
    }

    if (action === "generate_preview") {
      const bundle = body.config
        ? generateScenarioFromConfig(body.config)
        : await resolveScenarioBundle(sb, body);
      return jsonResponse(req, {
        preview: {
          transactionCount: bundle.transactions?.length || 0,
          defaultMonth: bundle.defaultMonth,
          presetKey: bundle.presetKey,
          monthlyIncome: bundle.userPreferences?.monthly_income,
        },
        bundle,
      });
    }

    if (action === "save_scenario") {
      const bundle = body.config ? generateScenarioFromConfig(body.config) : null;
      const { data, error } = await sb.from("test_scenarios").insert({
        name: String(body.name || "Custom scenario").slice(0, 200),
        description: body.description || "",
        kind: "custom",
        config: body.config || {},
        expected_values: bundle?.expectedValues || body.expected_values || {},
        default_month: body.default_month || bundle?.defaultMonth || "2026-08",
        created_by: adminId,
      }).select("*").single();
      if (error) return jsonResponse(req, { error: error.message }, 500);
      return jsonResponse(req, { scenario: data });
    }

    if (action === "apply_scenario") {
      const testUserId = String(body.test_user_id || "");
      if (!testUserId) return jsonResponse(req, { error: "test_user_id required" }, 400);
      await assertTestUser(sb, testUserId);

      const bundle = await resolveScenarioBundle(sb, body);
      await applyScenarioBundle(sb, testUserId, bundle);

      return jsonResponse(req, {
        ok: true,
        transactionCount: bundle.transactions?.length || 0,
        defaultMonth: bundle.defaultMonth,
        presetKey: bundle.presetKey,
      });
    }

    if (action === "run_verification") {
      const testUserId = String(body.test_user_id || "");
      if (!testUserId) return jsonResponse(req, { error: "test_user_id required" }, 400);
      await assertTestUser(sb, testUserId);

      const { data: txs } = await sb.from("transactions").select("*").eq("user_id", testUserId);
      let expected = body.expected_values || {};
      if (!Object.keys(expected).length) {
        try {
          const base = new URL("../_shared/fixtures/accuracy-test-4month/expected-values.json", import.meta.url);
          expected = JSON.parse(await Deno.readTextFile(base));
        } catch {
          expected = {};
        }
      }
      const result = runVerificationChecks(txs || [], expected);

      const { data: prof } = await sb
        .from("profiles")
        .select("test_scenario_label")
        .eq("id", testUserId)
        .maybeSingle();

      const { data: runRow, error: runErr } = await sb.from("admin_test_runs").insert({
        admin_user_id: adminId,
        test_user_id: testUserId,
        scenario_label: body.scenario_label || prof?.test_scenario_label || null,
        preset_key: body.preset_key || prof?.test_scenario_label || null,
        pass_count: result.pass,
        fail_count: result.fail,
        total_count: result.total,
        result_json: result,
      }).select("id, created_at").single();

      if (runErr) {
        return jsonResponse(req, { ...result, historyError: runErr.message });
      }

      return jsonResponse(req, { ...result, run_id: runRow?.id, run_at: runRow?.created_at });
    }

    if (action === "reset_test_user") {
      const testUserId = String(body.test_user_id || "");
      if (!testUserId) return jsonResponse(req, { error: "test_user_id required" }, 400);
      await assertTestUser(sb, testUserId);
      await resetTestUserData(sb, testUserId);
      await sb.from("profiles").update({
        test_scenario_label: null,
        updated_at: new Date().toISOString(),
      }).eq("id", testUserId);
      return jsonResponse(req, { ok: true });
    }

    if (action === "start_session") {
      const testUserId = String(body.test_user_id || "");
      if (!testUserId) return jsonResponse(req, { error: "test_user_id required" }, 400);
      await assertTestUser(sb, testUserId);

      await sb.from("admin_test_sessions").update({
        status: "ended",
        ended_at: new Date().toISOString(),
      }).eq("admin_user_id", adminId).eq("status", "active");

      const expiresAt = new Date(Date.now() + 2 * 3600000).toISOString();
      const { data: session, error } = await sb.from("admin_test_sessions").insert({
        admin_user_id: adminId,
        test_user_id: testUserId,
        scenario_id: body.scenario_id || null,
        status: "active",
        expires_at: expiresAt,
      }).select("*").single();
      if (error) return jsonResponse(req, { error: error.message }, 500);

      return jsonResponse(req, { session });
    }

    if (action === "fetch_test_data") {
      const testUserId = String(body.test_user_id || body.session?.test_user_id || "");
      if (!testUserId) return jsonResponse(req, { error: "test_user_id required" }, 400);
      await assertTestUser(sb, testUserId);

      const [txRes, budgetRes, prefRes, goalRes, assetRes, debtRes, periodRes, profRes] = await Promise.all([
        sb.from("transactions").select("*").eq("user_id", testUserId).order("date"),
        sb.from("budgets").select("*").eq("user_id", testUserId),
        sb.from("user_preferences").select("*").eq("user_id", testUserId).maybeSingle(),
        sb.from("financial_goals").select("*").eq("user_id", testUserId),
        sb.from("neraca_assets").select("*").eq("user_id", testUserId),
        sb.from("neraca_debts").select("*").eq("user_id", testUserId),
        sb.from("monthly_periods").select("*").eq("user_id", testUserId),
        sb.from("profiles").select("test_scenario_label, name").eq("id", testUserId).maybeSingle(),
      ]);

      const budgetsByMonth: Record<string, unknown> = {};
      for (const b of budgetRes.data || []) {
        budgetsByMonth[b.month] = b;
      }

      return jsonResponse(req, {
        transactions: txRes.data || [],
        budgetsByMonth,
        userPreferences: prefRes.data || {},
        goals: goalRes.data || [],
        neraca: { assets: assetRes.data || [], debts: debtRes.data || [] },
        monthlyPeriods: periodRes.data || [],
        profile: profRes.data,
        defaultMonth: body.default_month || "2026-08",
      });
    }

    if (action === "proxy_mutation") {
      const testUserId = String(body.test_user_id || "");
      const table = String(body.table || "");
      const op = String(body.op || "upsert").toLowerCase();
      if (!testUserId || !PROXY_TABLES.has(table)) {
        return jsonResponse(req, { error: "invalid test_user_id or table" }, 400);
      }
      await assertTestUser(sb, testUserId);

      const now = new Date().toISOString();
      const payload = body.payload || {};

      if (table === "transactions") {
        if (op === "delete") {
          await sb.from("transactions").delete().eq("id", payload.id).eq("user_id", testUserId);
        } else {
          const row = {
            ...payload,
            user_id: testUserId,
            period: String(payload.date || "").slice(0, 7),
            updated_at: now,
          };
          await sb.from("transactions").upsert(row, { onConflict: "id" });
        }
      } else if (table === "budgets") {
        await sb.from("budgets").upsert({
          ...payload,
          user_id: testUserId,
          updated_at: now,
        }, { onConflict: "user_id,month" });
      } else if (table === "user_preferences") {
        await sb.from("user_preferences").upsert({
          ...payload,
          user_id: testUserId,
          updated_at: now,
        }, { onConflict: "user_id" });
      } else {
        const row = { ...payload, user_id: testUserId, updated_at: now };
        await sb.from(table).upsert(row, { onConflict: "id" });
      }

      return jsonResponse(req, { ok: true });
    }

    if (action === "end_session") {
      const sessionId = body.session_id;
      await sb.from("admin_test_sessions").update({
        status: "ended",
        ended_at: new Date().toISOString(),
      }).eq("admin_user_id", adminId).eq("status", "active");
      return jsonResponse(req, { ok: true, session_id: sessionId });
    }

    if (action === "delete_test_user") {
      const testUserId = String(body.test_user_id || "");
      await assertTestUser(sb, testUserId);
      await sb.auth.admin.deleteUser(testUserId);
      return jsonResponse(req, { ok: true });
    }

    return jsonResponse(req, { error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "FORBIDDEN") return jsonResponse(req, { error: "Forbidden" }, 403);
    return jsonResponse(req, { error: msg }, 500);
  }
});
