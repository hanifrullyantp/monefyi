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
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
