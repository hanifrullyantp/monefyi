import { structuredError, type StructuredError } from '../../packages/domain/src/errors.ts';
import { orgToday } from '../../packages/domain/src/dates.ts';
import { routeCatatBiaya } from './sop.ts';

export type Autonomy = 'L0' | 'L1' | 'L2' | 'L3';
export type ModelTier = 'rendah' | 'menengah' | 'tinggi';
export type ActionStatus = 'draft' | 'approved' | 'rejected' | 'executed';

const QUOTA: Record<string, { runs: number; tokens: number }> = {
  free: { runs: 10, tokens: 20_000 },
  starter: { runs: 30, tokens: 80_000 },
  pro: { runs: 100, tokens: 300_000 },
  pro_plus: { runs: 200, tokens: 600_000 },
  enterprise: { runs: 1000, tokens: 2_000_000 },
};

const RUN_LIMITS = { iterations: 8, tokens: 4_000, costIdr: 2_000 };

export function orgHour(timeZone = 'Asia/Jakarta', now = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(now)
    .find((part) => part.type === 'hour')?.value;
  return Number(hour ?? '0');
}

export function shouldDispatchMorning(timeZone: string, now: Date, sentDate: string | null): boolean {
  return orgHour(timeZone, now) === 7 && orgToday(timeZone, now) !== sentDate;
}

export function routeRequest(text: string, failures: number, risk: 'read' | 'prepare' | 'commit' | 'critical'): {
  sopId: string | null;
  confidence: number;
  tier: ModelTier;
  escalate: boolean;
} {
  const normalized = text.toLowerCase();
  let sopId: string | null = null;
  let confidence = 0.42;
  if (/bayar hutang|lunasi/.test(normalized)) {
    sopId = 'bayar_hutang_pihak';
    confidence = 0.86;
  } else if (routeCatatBiaya(text)) {
    sopId = 'catat_biaya';
    confidence = 0.9;
  } else if (/pinjam|transfer internal/.test(normalized)) {
    sopId = 'pinjam_internal';
    confidence = 0.84;
  } else if (/terima|pelunasan|dp klien/.test(normalized)) {
    sopId = 'terima_uang_klien';
    confidence = 0.8;
  } else if (/progres|pekerjaan selesai/.test(normalized)) {
    sopId = 'update_progres_pekerjaan';
    confidence = 0.84;
  } else if (/laporan hari/.test(normalized)) {
    sopId = 'laporan_harian_proyek';
    confidence = 0.84;
  } else if (/berisiko|proyek telat/.test(normalized)) {
    sopId = 'tinjau_proyek_berisiko';
    confidence = 0.84;
  } else if (/rekonsiliasi|cocokkan kas/.test(normalized)) {
    sopId = 'rekonsiliasi_kas';
    confidence = 0.84;
  } else if (/dari template|duplikasi pola/.test(normalized)) {
    sopId = 'buat_proyek_dari_template';
    confidence = 0.84;
  }
  const escalate = failures >= 2 || confidence < 0.6 || risk === 'critical';
  const tier: ModelTier = escalate ? 'tinggi' : confidence >= 0.8 ? 'rendah' : 'menengah';
  return { sopId, confidence, tier, escalate };
}

export function admitRun(input: {
  killSwitch: boolean;
  planType: string;
  usedRuns: number;
  usedTokens: number;
  iteration: number;
  tokens: number;
  costIdr: number;
}): { ok: true } | { ok: false; error: StructuredError } {
  if (input.killSwitch) {
    return { ok: false, error: structuredError('kill_switch', 'Agen organisasi ini dimatikan pemilik.', []) };
  }
  const quota = QUOTA[input.planType] ?? QUOTA.free;
  if (input.usedRuns >= quota.runs) {
    return { ok: false, error: structuredError('kuota_run_habis', 'Kuota run hari ini habis.', []) };
  }
  if (input.usedTokens >= quota.tokens) {
    return { ok: false, error: structuredError('kuota_token_habis', 'Kuota token hari ini habis.', []) };
  }
  if (input.iteration > RUN_LIMITS.iterations) {
    return { ok: false, error: structuredError('batas_iterasi', 'Run ini sudah mencapai batas langkah.', []) };
  }
  if (input.tokens > RUN_LIMITS.tokens) {
    return { ok: false, error: structuredError('batas_token', 'Run ini sudah mencapai batas token.', []) };
  }
  if (input.costIdr > RUN_LIMITS.costIdr) {
    return { ok: false, error: structuredError('batas_biaya', 'Run ini sudah mencapai batas biaya.', []) };
  }
  return { ok: true };
}

export function decideActionStatus(
  autonomy: Autonomy,
  risk: 'read' | 'prepare' | 'commit' | 'critical',
  amount: number | null,
  approvalLimitRupiah: number,
  gatePassed = false,
): ActionStatus {
  if (risk === 'critical' || autonomy === 'L3' || autonomy === 'L1') return 'draft';
  if (autonomy === 'L0' && risk === 'read') return 'executed';
  if (gatePassed && autonomy === 'L2' && risk !== 'read' && amount != null && amount <= approvalLimitRupiah) return 'approved';
  if (autonomy === 'L0') return 'draft';
  return 'draft';
}

export function explainAction(input: { sopId: string; sopStep: string; policyKey: string | null }): string {
  const policy = input.policyKey ? `Kebijakan ${input.policyKey}.` : 'Tanpa kebijakan khusus.';
  return `SOP ${input.sopId}, langkah ${input.sopStep}. ${policy}`;
}
