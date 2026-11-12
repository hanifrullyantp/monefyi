import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { getServiceClient, logEngineAction, checkManualLiveChange, hasSucceededToday } from "@/lib/engine/engineDb";
import { resolveServerMetaCreds, readLiveBudget, restoreBudget, setObjectStatus } from "@/lib/engine/metaBudget";

/**
 * Membatalkan satu aksi otomatis dari engine_action_log.
 * - scale_campaign_budget: budget dikembalikan ke angka sebelum scale (jika belum diubah pihak lain).
 * - pause_bleeding_campaign: kampanye diaktifkan lagi (ditolak saat kill switch aktif).
 * Body: { logId: number, force?: boolean }
 */
export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const logId = Number(body.logId);
  if (!Number.isFinite(logId) || logId <= 0) {
    return NextResponse.json({ ok: false, error: "logId tidak valid." }, { status: 400 });
  }

  try {
    const sb = getServiceClient();
    const { data: log, error } = await sb
      .from("engine_action_log")
      .select("id, action_type, campaign_id, campaign_name, before_value, after_value, live_executed")
      .eq("id", logId)
      .maybeSingle();
    if (error || !log) return NextResponse.json({ ok: false, error: "Catatan aksi tidak ditemukan." }, { status: 404 });
    if (!log.live_executed) {
      return NextResponse.json({ ok: false, error: "Aksi ini tidak pernah dijalankan di Meta, tidak ada yang perlu dibatalkan." }, { status: 400 });
    }

    const idemKey = `undo:${logId}`;
    if (await hasSucceededToday(idemKey)) {
      return NextResponse.json({ ok: false, error: "Aksi ini sudah dibatalkan sebelumnya." }, { status: 409 });
    }

    const creds = await resolveServerMetaCreds();
    if (!creds) return NextResponse.json({ ok: false, error: "Token Meta belum tersedia di server." }, { status: 400 });
    const campaignId = String(log.campaign_id || "");
    if (!campaignId) return NextResponse.json({ ok: false, error: "Catatan tidak memuat ID kampanye." }, { status: 400 });

    let summary = "";
    let before: number | null = null;
    let after: number | null = null;

    if (log.action_type === "scale_campaign_budget") {
      const prev = Number(log.before_value || 0);
      const scaledTo = Number(log.after_value || 0);
      if (!(prev > 0)) return NextResponse.json({ ok: false, error: "Budget sebelum scale tidak tercatat." }, { status: 400 });
      const live = await readLiveBudget(campaignId, creds.token, creds.appSecret);
      if (!live.ok) return NextResponse.json({ ok: false, error: live.error }, { status: 400 });
      if (scaledTo > 0 && Math.abs(live.total - scaledTo) / scaledTo > 0.05 && !body.force) {
        return NextResponse.json(
          {
            ok: false,
            needsForce: true,
            error: `Budget saat ini Rp ${live.total.toLocaleString("id-ID")} berbeda dari hasil scale (Rp ${scaledTo.toLocaleString("id-ID")}). Kirim force: true jika tetap ingin mengembalikan ke Rp ${prev.toLocaleString("id-ID")}.`,
          },
          { status: 409 }
        );
      }
      const r = await restoreBudget(campaignId, prev, live, creds);
      if (!r.ok) {
        return NextResponse.json({ ok: false, error: `Sebagian perubahan gagal: ${r.failures.join(" | ")}`, changed: r.changed }, { status: 400 });
      }
      before = live.total;
      after = prev;
      summary = `Budget "${log.campaign_name}" dikembalikan dari Rp ${live.total.toLocaleString("id-ID")} ke Rp ${prev.toLocaleString("id-ID")}.`;
    } else if (log.action_type === "pause_bleeding_campaign") {
      // Mengaktifkan kembali menambah risiko belanja: tunduk pada kill switch
      const g = await checkManualLiveChange({ kind: "activate" });
      if (!g.allowed) return NextResponse.json({ ok: false, blockedByGuardrail: true, error: g.reason }, { status: 403 });
      const r = await setObjectStatus(campaignId, "ACTIVE", creds.token, creds.appSecret);
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
      summary = `Kampanye "${log.campaign_name}" diaktifkan kembali. AI tidak akan menghentikannya lagi selama 72 jam.`;
    } else {
      return NextResponse.json({ ok: false, error: `Jenis aksi "${log.action_type}" belum bisa dibatalkan otomatis.` }, { status: 400 });
    }

    await logEngineAction({
      source: "manual",
      actor: auth.email || "admin",
      actionType: `undo_${log.action_type}`,
      planId: `undo:${logId}`,
      idempotencyKey: idemKey,
      campaignId,
      campaignName: log.campaign_name || "",
      ok: true,
      liveExecuted: true,
      beforeValue: before,
      afterValue: after,
      summary,
      response: { undoOfLogId: logId },
    });
    // Tandai agar evaluasi 48 jam tidak menilai ulang aksi yang sudah dibatalkan
    await sb
      .from("engine_action_review")
      .insert({ log_id: logId, verdict: "dibatalkan_admin", rolled_back: true, details: { by: auth.email || "admin" } })
      .then(() => null, () => null);

    return NextResponse.json({ ok: true, liveExecuted: true, summary });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Pembatalan gagal." }, { status: 500 });
  }
}
