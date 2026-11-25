import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PIXEL_IDS = ["1530674178146899", "1037107426097758"];

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/meta/pixels
 * Mengembalikan daftar Meta Pixel ID publik yang aktif (tanpa token/rahasia)
 * agar seluruh Pixel dari akun Meta yang terdaftar otomatis terpasang di landing page.
 */
export async function GET() {
  const pixelSet = new Set<string>(DEFAULT_PIXEL_IDS);
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("winning_engine_config")
      .select("meta_pixel_id, advanced_params")
      .eq("id", "default")
      .maybeSingle();

    if (data?.meta_pixel_id) {
      const id = String(data.meta_pixel_id).replace(/[^0-9]/g, "");
      if (id) pixelSet.add(id);
    }

    const adv =
      data?.advanced_params && typeof data.advanced_params === "object" && !Array.isArray(data.advanced_params)
        ? (data.advanced_params as Record<string, unknown>)
        : {};
    if (Array.isArray(adv.metaAccounts)) {
      for (const acc of adv.metaAccounts) {
        const rawId = (acc as Record<string, unknown>)?.pixelId;
        const id = String(rawId || "").replace(/[^0-9]/g, "");
        if (id) pixelSet.add(id);
      }
    }
  } catch {
    // Tetap kembalikan default pixels jika DB belum terjangkau
  }

  return NextResponse.json(
    { ok: true, pixelIds: Array.from(pixelSet) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

