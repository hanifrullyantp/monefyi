import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "froyek.com";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const redirectTo = `${origin}/reset-password`;

  const token =
    req.nextUrl.searchParams.get("token") ||
    req.nextUrl.searchParams.get("token_hash");

  if (!token) {
    return NextResponse.redirect(`${redirectTo}?error=token_missing`);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://zzwqfmdyncxbolestkqp.supabase.co";

  // Teruskan verifikasi ke Supabase Auth secara backend-to-backend
  const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`);
  req.nextUrl.searchParams.forEach((val, key) => {
    verifyUrl.searchParams.set(key, val);
  });
  if (!verifyUrl.searchParams.has("redirect_to")) {
    verifyUrl.searchParams.set("redirect_to", redirectTo);
  }

  try {
    const res = await fetch(verifyUrl.toString(), {
      redirect: "manual",
    });

    // Supabase mengembalikan HTTP 302/303 redirect ke Location (berisi hash token atau error)
    const location = res.headers.get("location");
    if (location) {
      // Pastikan domain redirect selalu memakai domain froyek.com / origin saat ini
      const safeLocation = location.replace(/^https?:\/\/[^\/]+/, origin);
      return NextResponse.redirect(safeLocation);
    }

    // Jika Supabase mengembalikan 200 OK dengan HTML/JSON atau tanpa redirect
    return NextResponse.redirect(redirectTo);
  } catch (err: any) {
    console.error("[auth-verify] Server verify failed:", err);
    return NextResponse.redirect(`${redirectTo}?error=verify_network_error`);
  }
}

