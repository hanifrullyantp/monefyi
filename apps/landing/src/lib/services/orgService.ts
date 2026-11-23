import { getSupabaseClient } from "@/lib/supabase/client";

export async function ensureOwnerOrg(
  userId: string,
  orgName = "Organisasi Saya",
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: member } = await supabase
    .from("planner_org_members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (member?.org_id) return member.org_id as string;

  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) return null;

  const { data, error } = await supabase.functions.invoke("planner-create-owner-org", {
    body: { org_name: orgName, name: orgName },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    console.error("ensureOwnerOrg:", error.message);
    return null;
  }

  const orgId = (data as { org?: { id?: string } })?.org?.id;
  return orgId ?? null;
}
