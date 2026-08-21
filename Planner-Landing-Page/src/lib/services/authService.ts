import { getSupabaseClient } from "@/lib/supabase/client";

function authRedirectUrl(path: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_PLANNER_APP_URL?.replace(/\/app\/?$/, "") ||
        "https://planner.monefyi.com";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Supabase belum dikonfigurasi.") };
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}

export async function signUpWithPassword(
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Supabase belum dikonfigurasi.") };
  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: metadata,
      emailRedirectTo: authRedirectUrl("/login"),
    },
  });
}

export async function signOutGlobal() {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: null };
  return supabase.auth.signOut({ scope: "global" });
}

export async function resetPasswordForEmail(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Supabase belum dikonfigurasi.") };
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirectUrl("/login"),
  });
}

export async function resendSignupVerification(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Supabase belum dikonfigurasi.") };
  return supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: authRedirectUrl("/login") },
  });
}

export async function getSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
