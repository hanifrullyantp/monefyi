import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { planFlowAction, screenFlowBody, type FlowRun } from "../../../../agent-core/src/flow.ts";
import { SOP_CATALOG } from "../../../../agent-core/src/sopData.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const CORS = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ code: "metode_salah", message_id: "metode_salah", fix_hint: "Pakai POST.", valid_options: [] }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ code: "tanpa_sesi", message_id: "tanpa_sesi", fix_hint: "Masuk dulu.", valid_options: [] }, 401);
    }
    const body = await req.json();
    const screened = screenFlowBody(body);
    if (!screened.ok) return json(screened.error, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json({ code: "sesi_tidak_sah", message_id: "sesi_tidak_sah", fix_hint: "Masuk ulang.", valid_options: [] }, 401);
    }

    const { data: members, error: memberErr } = await userClient
      .from("planner_org_members")
      .select("org_id, role")
      .eq("user_id", authData.user.id)
      .eq("status", "active");
    if (memberErr) {
      return json({ code: "keanggotaan_gagal", message_id: "keanggotaan_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
    }
    if (!members || members.length !== 1) {
      return json({
        code: "pilih_organisasi_di_aplikasi",
        message_id: "pilih_organisasi_di_aplikasi",
        fix_hint: "Akun ini punya nol atau banyak organisasi. Ikatan organisasi di server belum ada.",
        valid_options: [],
      }, 409);
    }
    const orgId = String(members[0].org_id);
    const role = String(members[0].role);
    const action = String(body.action || "");
    const now = Date.now();

    if (action === "start") {
      const planned = planFlowAction(SOP_CATALOG, {
        type: "start",
        sopId: String(body.sop_id || ""),
        id: crypto.randomUUID(),
        now,
        role,
        parameters: body.parameters && typeof body.parameters === "object" ? body.parameters : undefined,
      });
      if (!planned.ok || !planned.run) return json(planned.ok ? { code: "run_kosong" } : planned.error, 400);
      const { error } = await userClient.from("planner_flow_runs").insert({
        id: planned.run.id,
        org_id: orgId,
        user_id: authData.user.id,
        sop_id: planned.run.sopId,
        sop_version: planned.run.sopVersion,
        status: planned.run.status,
        current_step: planned.run.currentStep,
        state: planned.run,
        expires_at: new Date(planned.run.expiresAt).toISOString(),
        updated_at: new Date(now).toISOString(),
      });
      if (error) {
        return json({ code: "run_gagal_simpan", message_id: "run_gagal_simpan", fix_hint: "Coba lagi.", valid_options: [] }, 500);
      }
      return json(planned.view);
    }

    const runId = String(body.run_id || "");
    const { data: row, error: loadErr } = await userClient
      .from("planner_flow_runs")
      .select("state")
      .eq("id", runId)
      .maybeSingle();
    if (loadErr || !row?.state) {
      return json({ code: "run_tidak_ketemu", message_id: "run_tidak_ketemu", fix_hint: "Mulai SOP dari awal.", valid_options: [] }, 404);
    }
    const stored = row.state as FlowRun;
    const planned = action === "attempt"
      ? planFlowAction(SOP_CATALOG, { type: "attempt", run: stored, tool: String(body.tool || ""), role, now })
      : planFlowAction(SOP_CATALOG, { type: "view", run: stored, now });
    if (!planned.ok || !planned.run) return json(planned.ok ? { code: "run_kosong" } : planned.error, 400);
    if (planned.run.status !== stored.status) {
      await userClient.from("planner_flow_runs").update({
        status: planned.run.status,
        current_step: planned.run.currentStep,
        state: planned.run,
        updated_at: new Date(now).toISOString(),
      }).eq("id", stored.id);
    }
    if (action === "attempt") return json({ ...planned.view, eksekusi: "belum" });
    return json(planned.view);
  } catch (error) {
    console.error("planner-flow gagal:", error);
    return json({ code: "alur_gagal", message_id: "alur_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
  }
});
