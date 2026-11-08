import { NextRequest, NextResponse } from "next/server";
import { checkMayarHealth } from "@/lib/services/mayarHealthService";

export const dynamic = "force-dynamic";

/**
 * Pengecekan berkala (Cron Job) kesehatan koneksi Mayar.
 * Dipanggil secara terjadwal untuk memantau status token Mayar.
 * Jika status 401 Unauthorized terdeteksi, alert otomatis dikirim ke WA/Telegram Admin.
 */
export async function GET(req: NextRequest) {
  try {
    const result = await checkMayarHealth({
      triggerAlertOnFail: true,
    });

    return NextResponse.json({
      cron: "mayar_health_check",
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Cron check error" },
      { status: 500 }
    );
  }
}

