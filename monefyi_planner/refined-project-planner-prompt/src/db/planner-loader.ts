import { getSupabaseAdmin } from "./supabase-admin";
import { APP_DATA } from "@/lib/mock-data";
import {
  assemblePlannerPayload,
  type PlannerCostRow,
  type PlannerFinanceAccountRow,
  type PlannerIncomeRow,
  type PlannerOrgRow,
  type PlannerProjectRow,
  type PlannerRapRow,
  type PlannerWorkRow,
} from "@/lib/planner-mapper";

function getPlannerOrgId(): string {
  return (
    process.env.PLANNER_ORG_ID ||
    "072144fe-05e4-45c4-9138-61a62cdb18f8"
  );
}

/**
 * Load real Monefyi planner data for the configured organization.
 */
export async function loadPlannerPayload() {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error("Supabase not configured");
  }

  const orgId = getPlannerOrgId();

  const { data: org, error: orgErr } = await client
    .from("planner_organizations")
    .select("id, name, settings")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) throw orgErr;
  if (!org) throw new Error(`Organization not found: ${orgId}`);

  const { data: projects, error: projErr } = await client
    .from("planner_projects")
    .select(
      "id, org_id, name, client_name, planned_start, planned_end, status, progress_pct, total_budget, total_spent, total_received, settings"
    )
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (projErr) throw projErr;

  const projectIds = (projects || []).map((p) => p.id);
  if (!projectIds.length) {
    return assemblePlannerPayload({
      org: org as PlannerOrgRow,
      projects: [],
      rapItems: [],
      costs: [],
      incomes: [],
      workItems: [],
      accounts: [],
      mockFallback: APP_DATA,
    });
  }

  const [rapRes, costRes, incomeRes, workRes, accountRes] = await Promise.all([
    client.from("planner_rap_items").select("*").in("project_id", projectIds),
    client.from("planner_cost_realizations").select("*").in("project_id", projectIds),
    client
      .from("planner_project_incomes")
      .select("*")
      .in("project_id", projectIds)
      .eq("status", "received"),
    client.from("planner_work_items").select("*").in("project_id", projectIds),
    client
      .from("planner_finance_accounts")
      .select("id, name, type, category, current_balance")
      .eq("org_id", orgId),
  ]);

  for (const res of [rapRes, costRes, incomeRes, workRes, accountRes]) {
    if (res.error) throw res.error;
  }

  return assemblePlannerPayload({
    org: org as PlannerOrgRow,
    projects: (projects || []) as PlannerProjectRow[],
    rapItems: (rapRes.data || []) as PlannerRapRow[],
    costs: (costRes.data || []) as PlannerCostRow[],
    incomes: (incomeRes.data || []) as PlannerIncomeRow[],
    workItems: (workRes.data || []) as PlannerWorkRow[],
    accounts: (accountRes.data || []) as PlannerFinanceAccountRow[],
    mockFallback: APP_DATA,
  });
}
