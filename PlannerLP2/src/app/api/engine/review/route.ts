import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth } from "@/lib/auth/adminGuard";
import {
  getServiceClient,
  logEngineAction,
  wibDate,
  acquireRunLock,
  releaseRunLock,
} from "@/lib/engine/engineDb";
import { DEFAULT_WINNING_ENGINE_CONFIG } from "@/lib/engine/winningEngine";
import { judgeOutcome, OutcomeSnapshot } from "@/lib/engine/reviewVerdict";
import {
  resolveServerMetaCreds,
  readLiveBudget,
  restoreBudget,
  readCampaignWindowMetrics,
} from "@/lib/engine/metaBudget";
import { dispatchEngineNotification } from "@/lib/services/telegramBotService";
import { recordEngineLearning } from "@/lib/engine/learnings";

const REVIEW_AFTER_HOURS = 48;
const GIVE_UP_AFTER_HOURS = 120;

/**
 * Evaluasi hasil aksi scale setelah 48 jam. Dipanggil cron (header x-engine-secret), misalnya tiap 6 jam.
 * Jika hasilnya memburuk dengan bukti cukup dan budget belum diubah pihak lain, budget dikembalikan
 * ke angka sebelum scale. Mengurangi budget bersifat menurunkan risiko, jadi tetap berjalan saat kill switch aktif.
 */
export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req, { allowCron: true });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  if (!(await acquireRunLock("review"))) {
    return NextResponse.json({ ok: false, error: "Evaluasi lain sedang berjalan." }, { status: 423 });
  }
  try {
    const creds = await resolveServerMetaCreds();
    if (!creds) {
      return NextResponse.json({ ok: false, error: "Token Meta belum tersedia di server." }, { status: 400 });
    }

    const sb = getServiceClient();
    const { data: cfg } = await sb
      .from("winning_engine_config")
      .select("target_cpa, telegram_bot_token, telegram_chat_id")
      .eq("id", "default")
      .maybeSingle();
    const targetCpa = Number(cfg?.target_cpa || DEFAULT_WINNING_ENGINE_CONFIG.targetCpa);
    const notifications = {
      telegramEnabled: Boolean(cfg?.telegram_bot_token && cfg?.telegram_chat_id),
      telegramBotToken: String(cfg?.telegram_bot_token || ""),
      telegramChatId: String(cfg?.telegram_chat_id || ""),
    };

    const now = Date.now();
    const { data: logs, error: logErr } = await sb
      .from("engine_action_log")
      .select("id, created_at, campaign_id, campaign_name, before_value, after_value, response")
      .eq("action_type", "scale_campaign_budget")
      .eq("live_executed", true)
      .lte("created_at", new Date(now - REVIEW_AFTER_HOURS * 3600000).toISOString())
      .gte("created_at", new Date(now - 14 * 86400000).toISOString())
      .order("created_at", { ascending: true })
      .limit(40);
    if (logErr) return NextResponse.json({ ok: false, error: logErr.message }, { status: 500 });

    const all = logs || [];
    const { data: reviewed } = all.length
      ? await sb.from("engine_action_review").select("log_id").in("log_id", all.map((l: any) => l.id))
      : { data: [] as any[] };
    const reviewedIds = new Set((reviewed || []).map((r: any) => Number(r.log_id)));
    const pending = all.filter((l: any) => !reviewedIds.has(Number(l.id)));

    const results: any[] = [];
    for (const log of pending) {
      const campaignId = String(log.campaign_id || "");
      const ageH = (now - Date.parse(log.created_at)) / 3600000;
      if (!campaignId) continue;

      // Jika campaign ini di-scale lagi sesudahnya, batasi jendela sampai scale berikutnya
      const next = all.find(
        (o: any) => String(o.campaign_id) === campaignId && Date.parse(o.created_at) > Date.parse(log.created_at)
      );
      const since = wibDate(Date.parse(log.created_at));
      const until = wibDate(next ? Date.parse(next.created_at) : now);

      const metrics = await readCampaignWindowMetrics(campaignId, since, until, creds);
      if (!metrics.ok) {
        results.push({ logId: log.id, campaignId, skipped: true, reason: metrics.error });
        continue;
      }

      const ev = log.response?.evidence;
      const before: OutcomeSnapshot | null = ev
        ? { spend: Number(ev.spend || 0), purchases: Number(ev.purchases || 0), cpa: Number(ev.cpa || 0) }
        : null;
      const judged = judgeOutcome({ before, after: { spend: metrics.spend, purchases: metrics.purchases }, targetCpa });

      if (judged.verdict === "data_belum_cukup" && ageH < GIVE_UP_AFTER_HOURS) {
        results.push({ logId: log.id, campaignId, verdict: judged.verdict, reason: judged.reason, willRetry: true });
        continue;
      }

      let rolledBack = false;
      let rollbackNote = "";
      if (judged.verdict === "memburuk") {
        const prevBudget = Number(log.before_value || 0);
        const scaledTo = Number(log.after_value || 0);
        const live = await readLiveBudget(campaignId, creds.token, creds.appSecret);
        if (!(prevBudget > 0) || !(scaledTo > 0)) {
          rollbackNote = "Rollback dilewati: nilai budget sebelum/sesudah tidak tercatat.";
        } else if (!live.ok) {
          rollbackNote = `Rollback dilewati: ${live.error}`;
        } else if (Math.abs(live.total - scaledTo) / scaledTo > 0.05) {
          rollbackNote = `Rollback dilewati: budget saat ini Rp ${live.total.toLocaleString("id-ID")} sudah berbeda dari hasil scale (Rp ${scaledTo.toLocaleString("id-ID")}), kemungkinan diubah manual.`;
        } else {
          const r = await restoreBudget(campaignId, prevBudget, live, creds);
          rolledBack = r.ok;
          rollbackNote = r.ok
            ? `Budget dikembalikan dari Rp ${live.total.toLocaleString("id-ID")} ke Rp ${prevBudget.toLocaleString("id-ID")}.`
            : `Rollback gagal sebagian: ${r.failures.join(" | ")}`;
          await logEngineAction({
            source: "cron",
            actor: "engine-review",
            actionType: "rollback_scale",
            planId: `rollback:${log.id}`,
            idempotencyKey: r.ok ? `rollback:${log.id}` : null,
            campaignId,
            campaignName: log.campaign_name || "",
            ok: r.ok,
            liveExecuted: r.changed.length > 0,
            beforeValue: live.total,
            afterValue: prevBudget,
            summary: `Rollback otomatis. ${judged.reason} ${rollbackNote}`,
            response: { changed: r.changed, failures: r.failures, reviewOfLogId: log.id },
          });
          if (r.ok) {
            await dispatchEngineNotification(
              `[MONEFYI WINNING ENGINE - ROLLBACK]\nKampanye "${log.campaign_name}": ${judged.reason}\n${rollbackNote}`,
              notifications as any
            ).catch(() => null);
          }
        }
      }

      const verdictFinal = judged.verdict === "data_belum_cukup" ? "tidak_cukup_data" : judged.verdict;
      await sb.from("engine_action_review").insert({
        log_id: log.id,
        verdict: verdictFinal,
        rolled_back: rolledBack,
        details: {
          campaignId,
          window: { since, until },
          before,
          after: { spend: metrics.spend, purchases: metrics.purchases, cpa: judged.afterCpa },
          targetCpa,
          reason: judged.reason,
          rollbackNote,
        },
      });
      if (verdictFinal === "membaik" || verdictFinal === "memburuk") {
        await recordEngineLearning({
          pillar: "ads_testing",
          category: verdictFinal === "membaik" ? "scale_success" : "scale_rollback",
          finding: `Scale budget "${log.campaign_name || campaignId}" (${verdictFinal}): ${judged.reason}`,
          evidenceMetric: `CPA pasca-scale: Rp ${Math.round(judged.afterCpa ?? 0).toLocaleString("id-ID")} | ${metrics.purchases} beli`,
          confidence: verdictFinal === "membaik" ? 85 : 90,
        }).catch(() => false);
      }
      results.push({ logId: log.id, campaignId, verdict: verdictFinal, reason: judged.reason, rolledBack, rollbackNote });
    }

    return NextResponse.json({ ok: true, reviewed: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Evaluasi gagal." }, { status: 500 });
  } finally {
    await releaseRunLock("review");
  }
}

/** Vercel Cron memanggil dengan GET. */
export async function GET(req: NextRequest) {
  return POST(req);
}
