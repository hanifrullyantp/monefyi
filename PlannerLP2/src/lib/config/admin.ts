/** Admin emails — sinkron dengan LANDING_ADMIN_EMAILS di edge function. */
export const ADMIN_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_LANDING_ADMIN_EMAILS ||
  "admin@asfin.app,hanif.rullyant@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean) || clean.includes("admin@asfin.app") || clean.includes("hanif.rullyant@gmail.com");
}

export function isTestAdminLead(lead: {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  tags?: string[] | null;
  notes?: string | null;
} | null | undefined): boolean {
  if (!lead) return false;
  const email = (lead.email || "").trim().toLowerCase();
  if (email && (isAdminEmail(email) || email.endsWith("@test.com") || email.includes("test@"))) {
    return true;
  }
  const name = (lead.name || "").trim().toLowerCase();
  if (
    name === "admin" ||
    name === "super admin" ||
    name === "hanif rullyant" ||
    name === "test admin" ||
    name === "testing" ||
    name.startsWith("test ") ||
    name.endsWith(" test")
  ) {
    return true;
  }
  if (Array.isArray(lead.tags) && lead.tags.some((t) => typeof t === "string" && (t.toLowerCase() === "test" || t.toLowerCase() === "admin_test"))) {
    return true;
  }
  return false;
}

