import { NextResponse } from "next/server";

/** Legacy admin login API — dinonaktifkan. Gunakan login Supabase unified di beranda. */
export async function POST() {
  return NextResponse.json(
    { error: "Login admin terpisah sudah tidak digunakan. Gunakan Login di halaman utama." },
    { status: 410 },
  );
}
