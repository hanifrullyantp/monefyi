import type { DbEngineSettings } from "@/lib/engine/engineConfigDb";
import { getServiceClient } from "@/lib/engine/engineDb";
import { pushConfigured } from "@/lib/engine/pushNotify";

export type CheckStatus = "pass" | "warn" | "fail";
export interface PreflightCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  fix?: string;
}

/** Murni terhadap input: env dipakai lewat parameter agar bisa diuji. */
export function evaluatePreflight(input: {
  settings: Pick<DbEngineSettings, "overrides" | "metaTokenPresent" | "found">;
  env: Record<string, string | undefined>;
  tablesOk: boolean;
  subscriptions: number;
  pushReady: boolean;
}): PreflightCheck[] {
  const { settings, env } = input;
  const o = settings.overrides;
  const checks: PreflightCheck[] = [];

  checks.push(
    env.ENGINE_CRON_SECRET
      ? { id: "CRON_SECRET", label: "Secret scheduler", status: "pass", message: "ENGINE_CRON_SECRET terpasang." }
      : { id: "CRON_SECRET", label: "Secret scheduler", status: "fail", message: "ENGINE_CRON_SECRET belum diset, scheduler ditolak.", fix: "Set ENGINE_CRON_SECRET (string acak panjang) dan CRON_SECRET dengan nilai sama di Vercel." }
  );
  checks.push(
    input.tablesOk
      ? { id: "TABLES", label: "Tabel heartbeat", status: "pass", message: "Tabel engine_runs dan engine_heartbeat tersedia." }
      : { id: "TABLES", label: "Tabel heartbeat", status: "fail", message: "Tabel heartbeat belum ada.", fix: "Jalankan migrasi 004_expert_heartbeat_autonomy.sql di Supabase SQL Editor." }
  );
  checks.push(
    settings.found && settings.metaTokenPresent
      ? { id: "META_TOKEN", label: "Token Meta", status: "pass", message: "Token Meta tersimpan." }
      : { id: "META_TOKEN", label: "Token Meta", status: "fail", message: "Token Meta belum tersimpan.", fix: "Isi token Meta di Pengaturan Engine." }
  );
  checks.push(
    o.budgetUnitVerified
      ? { id: "BUDGET_UNIT", label: "Satuan budget", status: "pass", message: "Satuan budget IDR sudah diverifikasi." }
      : { id: "BUDGET_UNIT", label: "Satuan budget", status: "warn", message: "Belum diverifikasi. Eksekusi otomatis ditahan.", fix: "Cocokkan satu kampanye lewat /api/engine/budget-check, lalu aktifkan verifikasi." }
  );
  checks.push(
    o.autonomous === false
      ? { id: "AUTONOMOUS", label: "Mode otonom", status: "warn", message: "Dimatikan. Semua rencana menunggu persetujuan." }
      : { id: "AUTONOMOUS", label: "Mode otonom", status: "pass", message: "Aktif." }
  );
  checks.push(
    o.killSwitch
      ? { id: "KILL_SWITCH", label: "Kill switch", status: "warn", message: "Aktif. Expert hanya menganalisa.", fix: "Matikan di Pengaturan bila ingin eksekusi." }
      : { id: "KILL_SWITCH", label: "Kill switch", status: "pass", message: "Mati." }
  );
  checks.push(
    input.pushReady && input.subscriptions > 0
      ? { id: "PUSH", label: "Notifikasi HP", status: "pass", message: `${input.subscriptions} perangkat terdaftar.` }
      : { id: "PUSH", label: "Notifikasi HP", status: "warn", message: input.pushReady ? "Belum ada perangkat terdaftar." : "VAPID belum dikonfigurasi di server.", fix: input.pushReady ? "Buka dashboard dari PWA di HP lalu tekan Aktifkan notifikasi." : "Jalankan npx web-push generate-vapid-keys, set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT." }
  );
  return checks;
}

export async function runPreflight(settings: DbEngineSettings) {
  let tablesOk = false;
  let subscriptions = 0;
  try {
    const sb = getServiceClient();
    const hb = await sb.from("engine_heartbeat").select("id").limit(1);
    tablesOk = !hb.error;
    const subs = await sb.from("admin_push_subscriptions").select("id", { count: "exact", head: true });
    subscriptions = subs.count ?? 0;
  } catch {
    tablesOk = false;
  }
  const checks = evaluatePreflight({
    settings,
    env: process.env as Record<string, string | undefined>,
    tablesOk,
    subscriptions,
    pushReady: pushConfigured(),
  });
  return { checks, ready: checks.every((c) => c.status !== "fail") };
}

