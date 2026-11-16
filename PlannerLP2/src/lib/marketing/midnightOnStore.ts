import { checkManualLiveChange, getServiceClient, hasSucceededToday, logEngineAction } from "@/lib/engine/engineDb";
import { buildGraphUrl } from "@/lib/meta/graph";
import { resolveServerMetaCreds } from "@/lib/engine/metaBudget";
import { nextMidnightWib, parseMidnightOn, type MidnightOnSchedule } from "@/lib/marketing/midnightOn";

const PARAM_KEY = "midnightOn";
const RETRY_WINDOW_MS = 6 * 60 * 60 * 1000;

async function readParams(): Promise<Record<string, unknown>> {
  const { data, error } = await getServiceClient()
    .from("winning_engine_config")
    .select("advanced_params")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const params = data?.advanced_params;
  if (params && typeof params === "object" && !Array.isArray(params)) {
    return { ...(params as Record<string, unknown>) };
  }
  return {};
}

async function writeParams(params: Record<string, unknown>): Promise<void> {
  const { error } = await getServiceClient()
    .from("winning_engine_config")
    .update({ advanced_params: params, updated_at: new Date().toISOString() })
    .eq("id", "default");
  if (error) throw new Error(error.message);
}

export async function loadMidnightOn(): Promise<MidnightOnSchedule | null> {
  const params = await readParams();
  const schedule = parseMidnightOn(params[PARAM_KEY]);
  if (!schedule || schedule.status !== "pending") return null;
  return schedule;
}

export async function saveMidnightOn(campaigns: { id: string; name: string }[]): Promise<MidnightOnSchedule> {
  const unique = new Map<string, string>();
  for (const campaign of campaigns) {
    const id = String(campaign.id || "").trim();
    if (!id) continue;
    unique.set(id, String(campaign.name || id).slice(0, 180));
    if (unique.size >= 50) break;
  }
  if (unique.size === 0) {
    throw new Error("Tidak ada kampanye yang bisa dijadwalkan.");
  }
  const schedule: MidnightOnSchedule = {
    runAt: nextMidnightWib().toISOString(),
    campaignIds: [...unique.keys()],
    names: Object.fromEntries(unique),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  const params = await readParams();
  params[PARAM_KEY] = schedule;
  await writeParams(params);
  return schedule;
}

export async function cancelMidnightOn(): Promise<void> {
  const params = await readParams();
  delete params[PARAM_KEY];
  await writeParams(params);
}

async function activateCampaign(id: string, token: string, appSecret?: string): Promise<string | null> {
  const url = buildGraphUrl(`https://graph.facebook.com/v20.0/${id}`, token, appSecret);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    return data.error?.message || "Meta menolak perubahan status.";
  }
  return null;
}

/** Menyalakan jadwal yang sudah jatuh tempo. Dipanggil penjadwal yang sudah ada. */
export async function executeDueMidnightOn(now: Date = new Date()): Promise<{ activated: number; pending: number; error?: string }> {
  const params = await readParams();
  const schedule = parseMidnightOn(params[PARAM_KEY]);
  if (!schedule || schedule.status !== "pending") return { activated: 0, pending: 0 };
  if (now.getTime() < Date.parse(schedule.runAt)) {
    return { activated: 0, pending: schedule.campaignIds.length };
  }

  const guard = await checkManualLiveChange({ kind: "activate" });
  if (!guard.allowed) {
    schedule.lastError = guard.reason || "Aktivasi ditahan guardrail.";
    if (now.getTime() > Date.parse(schedule.runAt) + RETRY_WINDOW_MS) {
      delete params[PARAM_KEY];
    } else {
      params[PARAM_KEY] = schedule;
    }
    await writeParams(params);
    return { activated: 0, pending: schedule.campaignIds.length, error: schedule.lastError };
  }

  const creds = await resolveServerMetaCreds();
  if (!creds) {
    schedule.lastError = "Token Meta belum terpasang di server.";
    params[PARAM_KEY] = schedule;
    await writeParams(params);
    return { activated: 0, pending: schedule.campaignIds.length, error: schedule.lastError };
  }

  const failed: string[] = [];
  const errors: string[] = [];
  let activated = 0;
  for (const id of schedule.campaignIds) {
    const idempotencyKey = `midnight-on:${id}:${schedule.runAt}`;
    if (await hasSucceededToday(idempotencyKey)) {
      activated += 1;
      continue;
    }
    const error = await activateCampaign(id, creds.token, creds.appSecret);
    const name = schedule.names[id] || id;
    if (error) {
      failed.push(id);
      errors.push(`${name}: ${error}`);
    } else {
      activated += 1;
    }
    await logEngineAction({
      source: "cron",
      actor: "admin",
      actionType: "midnight_on",
      planId: idempotencyKey,
      idempotencyKey,
      campaignId: id,
      campaignName: name,
      ok: !error,
      liveExecuted: !error,
      summary: error
        ? `Gagal menyalakan "${name}" pada jadwal jam 12 malam. ${error}`
        : `Kampanye "${name}" dinyalakan sesuai jadwal jam 12 malam.`,
    });
  }

  if (failed.length === 0 || now.getTime() > Date.parse(schedule.runAt) + RETRY_WINDOW_MS) {
    delete params[PARAM_KEY];
  } else {
    params[PARAM_KEY] = {
      ...schedule,
      campaignIds: failed,
      lastError: errors.slice(0, 3).join(" "),
    };
  }
  await writeParams(params);
  return {
    activated,
    pending: failed.length && now.getTime() <= Date.parse(schedule.runAt) + RETRY_WINDOW_MS ? failed.length : 0,
    error: errors[0],
  };
}
