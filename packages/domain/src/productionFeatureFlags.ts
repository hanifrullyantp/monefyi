/**
 * Feature flag produksi untuk fitur sensitif uang & otonomi tinggi (Gerbang 1 Deploy).
 *
 * ATURAN KERAS:
 * - Seluruh 6 flag WAJIB ber-default `false` (MATI) di produksi pada deploy pertama:
 *   1. `money_payroll` (gaji)
 *   2. `money_disbursement` (pembayaran / pencairan)
 *   3. `money_dividend` (dividen)
 *   4. `money_bon` (kasbon / bon)
 *   5. `channel_whatsapp` (WhatsApp)
 *   6. `agent_autonomy_l2_plus` (otonomi L2+)
 * - Flag hanya bernilai `true` bila diaktifkan eksplisit (`'true'` atau `'1'`).
 */

export const PRODUCTION_MONEY_FLAG_KEYS = [
  'money_payroll',
  'money_disbursement',
  'money_dividend',
  'money_bon',
  'channel_whatsapp',
  'agent_autonomy_l2_plus',
] as const;

export type ProductionMoneyFlagKey = (typeof PRODUCTION_MONEY_FLAG_KEYS)[number];

export type ProductionMoneyFlags = Readonly<Record<ProductionMoneyFlagKey, boolean>>;

export const PRODUCTION_MONEY_FLAG_ENV_MAP: Readonly<Record<ProductionMoneyFlagKey, string>> = Object.freeze({
  money_payroll: 'VITE_ENABLE_MONEY_PAYROLL',
  money_disbursement: 'VITE_ENABLE_MONEY_DISBURSEMENT',
  money_dividend: 'VITE_ENABLE_MONEY_DIVIDEND',
  money_bon: 'VITE_ENABLE_MONEY_BON',
  channel_whatsapp: 'VITE_ENABLE_CHANNEL_WHATSAPP',
  agent_autonomy_l2_plus: 'VITE_ENABLE_AGENT_AUTONOMY_L2_PLUS',
});

export const PRODUCTION_MONEY_FLAG_LABELS: Readonly<
  Record<ProductionMoneyFlagKey, { label: string; reasonDisabledByDefault: string }>
> = Object.freeze({
  money_payroll: {
    label: 'Penggajian (Payroll)',
    reasonDisabledByDefault: 'Dimatikan pada deploy pertama hingga uji paritas gaji dengan akuntan selesai.',
  },
  money_disbursement: {
    label: 'Pencairan & Pembayaran',
    reasonDisabledByDefault: 'Dimatikan pada deploy pertama untuk mencegah klaim/eksekusi pembayaran tanpa verifikasi.',
  },
  money_dividend: {
    label: 'Pembagian Dividen',
    reasonDisabledByDefault: 'Dimatikan pada deploy pertama hingga rekonsiliasi buku besar & laba ditahan terverifikasi.',
  },
  money_bon: {
    label: 'Pengajuan & Pencairan Kasbon/Bon',
    reasonDisabledByDefault: 'Dimatikan pada deploy pertama hingga alur piutang karyawan diuji bersama tim keuangan.',
  },
  channel_whatsapp: {
    label: 'Saluran WhatsApp',
    reasonDisabledByDefault: 'Dimatikan pada deploy pertama; Telegram dan Web/PWA tetap berjalan mandiri.',
  },
  agent_autonomy_l2_plus: {
    label: 'Otonomi Agen L2+',
    reasonDisabledByDefault: 'Dimatikan pada deploy pertama; produksi berjalan pada L1 + Mode Bayangan terlebih dahulu.',
  },
});

export const DEFAULT_PRODUCTION_MONEY_FLAGS: ProductionMoneyFlags = Object.freeze({
  money_payroll: false,
  money_disbursement: false,
  money_dividend: false,
  money_bon: false,
  channel_whatsapp: false,
  agent_autonomy_l2_plus: false,
});

export class MoneyFeatureDisabledError extends Error {
  readonly code = 'feature_disabled_in_production' as const;
  readonly flagKey: ProductionMoneyFlagKey;
  readonly envVar: string;

  constructor(flagKey: ProductionMoneyFlagKey) {
    const meta = PRODUCTION_MONEY_FLAG_LABELS[flagKey];
    const envVar = PRODUCTION_MONEY_FLAG_ENV_MAP[flagKey];
    super(
      `Fitur "${meta.label}" (${flagKey}) dinonaktifkan secara default di produksi. ` +
        `Aktifkan secara eksplisit via ${envVar}=true setelah seluruh gerbang uji lolos.`,
    );
    this.name = 'MoneyFeatureDisabledError';
    this.flagKey = flagKey;
    this.envVar = envVar;
  }
}

function parseExplicitTrue(value: string | boolean | undefined | null): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

export type EnvRecord = Readonly<Record<string, string | boolean | undefined>>;

/**
 * Menyelesaikan seluruh 6 flag fitur uang secara deterministik.
 * Tanpa variabel env yang secara eksplisit `'true'` / `'1'`, seluruh flag bernilai `false`.
 */
export function resolveProductionMoneyFlags(env?: EnvRecord | null): ProductionMoneyFlags {
  if (!env) return { ...DEFAULT_PRODUCTION_MONEY_FLAGS };
  return Object.freeze({
    money_payroll: parseExplicitTrue(env[PRODUCTION_MONEY_FLAG_ENV_MAP.money_payroll]),
    money_disbursement: parseExplicitTrue(env[PRODUCTION_MONEY_FLAG_ENV_MAP.money_disbursement]),
    money_dividend: parseExplicitTrue(env[PRODUCTION_MONEY_FLAG_ENV_MAP.money_dividend]),
    money_bon: parseExplicitTrue(env[PRODUCTION_MONEY_FLAG_ENV_MAP.money_bon]),
    channel_whatsapp: parseExplicitTrue(env[PRODUCTION_MONEY_FLAG_ENV_MAP.channel_whatsapp]),
    agent_autonomy_l2_plus: parseExplicitTrue(env[PRODUCTION_MONEY_FLAG_ENV_MAP.agent_autonomy_l2_plus]),
  });
}

export function isMoneyFeatureFlagEnabled(
  flagKey: ProductionMoneyFlagKey,
  envOrFlags?: EnvRecord | ProductionMoneyFlags | null,
): boolean {
  if (!envOrFlags) return false;
  if (flagKey in envOrFlags && typeof (envOrFlags as Record<string, unknown>)[flagKey] === 'boolean') {
    return Boolean((envOrFlags as ProductionMoneyFlags)[flagKey]);
  }
  const resolved = resolveProductionMoneyFlags(envOrFlags as EnvRecord);
  return resolved[flagKey];
}

export function assertMoneyFeatureEnabled(
  flagKey: ProductionMoneyFlagKey,
  envOrFlags?: EnvRecord | ProductionMoneyFlags | null,
): void {
  if (!isMoneyFeatureFlagEnabled(flagKey, envOrFlags)) {
    throw new MoneyFeatureDisabledError(flagKey);
  }
}

