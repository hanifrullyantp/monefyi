import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { getServiceClient } from "@/lib/engine/engineDb";
import { UNDOABLE_ACTIONS } from "@/lib/engine/engineStatus";

/**
 * GET /api/engine/activity?limit=40
 * Riwayat aksi engine untuk timeline di UI: aksi, hasil review 48 jam, dan status undo.
 * Hanya baca. Tidak mengubah apa pun di Meta.
 */
export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const requested = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 100) : 40;

  try {
    const sb = getServiceClient();
    const { data: logs, error } = await sb
      .from("engine_action_log")
      .select("id, created_at, action_type, campaign_name, ok, live_executed, summary")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const logIds = (logs || []).map((l: any) => Number(l.id));
    const { data: reviews } = await sb
      .from("engine_action_review")
      .select("log_id, verdict, rolled_back")
      .in("log_id", logIds.length ? logIds : [0]);

    // Undo tersimpan sebagai baris log baru dengan response.undoOfLogId
    const { data: undoRows } = await sb
      .from("engine_action_log")
      .select("response")
      .like("action_type", "undo_%")
      .order("created_at", { ascending: false })
      .limit(500);

    const reviewByLog = new Map<number, { verdict: string; rolled_back: boolean }>();
    for (const r of reviews || []) reviewByLog.set(Number((r as any).log_id), r as any);

    const undone = new Set<number>();
    for (const u of undoRows || []) {
      const of = Number((u as any).response?.undoOfLogId);
      if (Number.isFinite(of)) undone.add(of);
    }

    const items = (logs || []).map((l: any) => {
      const id = Number(l.id);
      const rev = reviewByLog.get(id);
      const isUndone = undone.has(id) || Boolean(rev?.rolled_back);
      return {
        id,
        at: l.created_at,
        actionType: l.action_type,
        campaignName: l.campaign_name || "",
        liveExecuted: Boolean(l.live_executed),
        ok: Boolean(l.ok),
        summary: l.summary || "",
        review: rev?.verdict ?? null,
        rolledBack: Boolean(rev?.rolled_back),
        undone: isUndone,
        undoable: Boolean(l.live_executed) && UNDOABLE_ACTIONS.has(l.action_type) && !isUndone && !String(l.action_type).startsWith("undo_"),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Gagal memuat riwayat aksi." }, { status: 500 });
  }
}
