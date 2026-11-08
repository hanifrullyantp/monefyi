import { NextRequest, NextResponse } from "next/server";
import {
  checkMayarHealth,
  getCachedMayarHealth,
  saveMayarConfig,
  sendMayarAlert,
  getActiveMayarApiKey,
  getActiveMayarApiUrl,
} from "@/lib/services/mayarHealthService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceCheck = searchParams.get("check") === "1";
    const testKey = searchParams.get("test_key");
    const testUrl = searchParams.get("test_url");

    if (testKey) {
      // Uji coba kunci tanpa menyimpan
      const result = await checkMayarHealth({
        customKey: testKey,
        customUrl: testUrl || undefined,
        triggerAlertOnFail: false,
      });
      return NextResponse.json(result);
    }

    if (forceCheck) {
      const result = await checkMayarHealth({
        triggerAlertOnFail: true,
      });
      return NextResponse.json(result);
    }

    // Mengembalikan status cache atau lakukan check cepat
    const cached = getCachedMayarHealth();
    if (cached.status === "unconfigured") {
      const current = await checkMayarHealth({ triggerAlertOnFail: false });
      return NextResponse.json(current);
    }

    return NextResponse.json(cached);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey, apiUrl, sendTestAlert } = body;

    // Aksi 1: Kirim Test Alert ke WhatsApp & Telegram Admin
    if (sendTestAlert) {
      const res = await sendMayarAlert({
        status: 401,
        reason: "Ini adalah pengujian manual dari tombol 'Test Kirim Alert' di Admin Dashboard.",
        context: "Pengujian integrasi jalur alert darurat Monefyi",
        forceSend: true,
      });
      return NextResponse.json({
        ok: res.sent,
        message: res.reason,
      });
    }

    // Aksi 2: Simpan Kunci Mayar Baru
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { ok: false, message: "API Key Mayar wajib diisi." },
        { status: 400 }
      );
    }

    const cleanKey = apiKey.trim();
    const cleanUrl = (apiUrl || "https://api.mayar.id").trim();

    // 1. Verifikasi langsung ke Mayar API
    const testResult = await checkMayarHealth({
      customKey: cleanKey,
      customUrl: cleanUrl,
      triggerAlertOnFail: false,
    });

    if (!testResult.ok && testResult.status === "unauthorized") {
      return NextResponse.json(
        {
          ok: false,
          status: "unauthorized",
          message:
            "Kunci ditolak oleh Mayar API (401 Unauthorized). Pastikan API Key valid dan diambil dari Dashboard Mayar resmi.",
        },
        { status: 400 }
      );
    }

    // 2. Simpan permanen ke Supabase
    const saveRes = await saveMayarConfig(cleanKey, cleanUrl);
    if (!saveRes.ok) {
      return NextResponse.json(
        { ok: false, message: saveRes.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "API Key Mayar berhasil disimpan dan terverifikasi aktif!",
      health: testResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal memproses konfigurasi Mayar" },
      { status: 500 }
    );
  }
}
