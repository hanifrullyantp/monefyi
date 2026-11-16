import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";

async function lookupTxt(name: string): Promise<string[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const answers = (json.Answer || []) as { data?: string }[];
  return answers.map(a => (a.data || "").replace(/^"|"$/g, "").replace(/"/g, ""));
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const domainId = String(body.domain_id || "");
    if (!domainId) return jsonResponse({ error: "domain_id required" }, 400);

    const { data: domain, error: domErr } = await sb
      .from("planner_org_custom_domains")
      .select("*, planner_organizations(plan_type)")
      .eq("id", domainId)
      .maybeSingle();

    if (domErr || !domain) return jsonResponse({ error: "Domain tidak ditemukan" }, 404);

    const orgPlan = (domain.planner_organizations as { plan_type?: string } | null)?.plan_type;
    if (orgPlan !== "pro_plus") {
      return jsonResponse({ error: "Custom domain hanya untuk paket Pro+" }, 403);
    }

    const { data: member } = await sb
      .from("planner_org_members")
      .select("role")
      .eq("org_id", domain.org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member || !["owner", "admin"].includes(String(member.role))) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const host = String(domain.hostname).toLowerCase();
    const expected = String(domain.verification_token);
    // Support both _froyek-verify and legacy _monefyi-verify TXT records so existing tenants keep working.
    const verifyNames = [`_froyek-verify.${host}`, `_monefyi-verify.${host}`];
    const recordSets = await Promise.all(verifyNames.map((name) => lookupTxt(name)));
    const matchedRecord = expected
      ? verifyNames.find((_, idx) => recordSets[idx].some((r) => r.includes(expected))) ?? null
      : null;
    const ok = matchedRecord !== null;

    const patch = ok
      ? { status: "verified", verified_at: new Date().toISOString(), ssl_status: "pending", updated_at: new Date().toISOString() }
      : { status: "failed", updated_at: new Date().toISOString() };

    const { data: updated, error: upErr } = await sb
      .from("planner_org_custom_domains")
      .update(patch)
      .eq("id", domainId)
      .select()
      .single();

    if (upErr) return jsonResponse({ error: upErr.message }, 500);
    return jsonResponse({
      domain: updated,
      verified: ok,
      checked_records: verifyNames,
      matched_record: matchedRecord,
      message: ok
        ? `Domain ${host} berhasil diverifikasi.`
        : `TXT record verifikasi belum ditemukan pada _froyek-verify.${host} atau _monefyi-verify.${host}.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    return jsonResponse({ error: msg }, 500);
  }
});
