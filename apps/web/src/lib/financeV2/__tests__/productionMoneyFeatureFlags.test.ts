import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_PRODUCTION_MONEY_FLAGS,
  MoneyFeatureDisabledError,
  PRODUCTION_MONEY_FLAG_ENV_MAP,
  PRODUCTION_MONEY_FLAG_KEYS,
  assertMoneyFeatureEnabled,
  isMoneyFeatureFlagEnabled,
  resolveProductionMoneyFlags,
} from '@domain/productionFeatureFlags';
import {
  getProductionMoneyFlags,
  isMoneyFeatureEnabled,
  requireMoneyFeatureEnabled,
} from '../../productionFeatureFlags';

describe('Deploy Gate 1 — Production Money Feature Flags (Default OFF)', () => {
  it('seluruh 6 flag fitur uang & otonomi L2+ wajib bernilai false secara default di produksi', () => {
    expect(PRODUCTION_MONEY_FLAG_KEYS).toEqual([
      'money_payroll',
      'money_disbursement',
      'money_dividend',
      'money_bon',
      'channel_whatsapp',
      'agent_autonomy_l2_plus',
    ]);

    const emptyResolved = resolveProductionMoneyFlags({});
    const prodEnvResolved = resolveProductionMoneyFlags({
      NODE_ENV: 'production',
      MODE: 'production',
      VITE_APP_ENV: 'production',
    });

    for (const key of PRODUCTION_MONEY_FLAG_KEYS) {
      expect(DEFAULT_PRODUCTION_MONEY_FLAGS[key]).toBe(false);
      expect(emptyResolved[key]).toBe(false);
      expect(prodEnvResolved[key]).toBe(false);
      expect(isMoneyFeatureFlagEnabled(key, {})).toBe(false);
      expect(isMoneyFeatureEnabled(key, {})).toBe(false);
      expect(getProductionMoneyFlags({})[key]).toBe(false);
    }
  });

  it('assertMoneyFeatureEnabled & requireMoneyFeatureEnabled menolak seluruh 6 flag saat default OFF', () => {
    for (const key of PRODUCTION_MONEY_FLAG_KEYS) {
      expect(() => assertMoneyFeatureEnabled(key, {})).toThrowError(MoneyFeatureDisabledError);
      try {
        requireMoneyFeatureEnabled(key, {});
        throw new Error('seharusnya melempar MoneyFeatureDisabledError');
      } catch (err) {
        expect(err).toBeInstanceOf(MoneyFeatureDisabledError);
        const typed = err as MoneyFeatureDisabledError;
        expect(typed.code).toBe('feature_disabled_in_production');
        expect(typed.flagKey).toBe(key);
        expect(typed.envVar).toBe(PRODUCTION_MONEY_FLAG_ENV_MAP[key]);
      }
    }
  });

  it('mengaktifkan satu flag secara eksplisit tidak mengaktifkan 5 flag lainnya', () => {
    const resolved = resolveProductionMoneyFlags({
      VITE_ENABLE_MONEY_PAYROLL: 'true',
      VITE_ENABLE_MONEY_DIVIDEND: 'false',
      VITE_ENABLE_CHANNEL_WHATSAPP: 'yes', // bukan 'true'/'1' -> tetap false
    });

    expect(resolved.money_payroll).toBe(true);
    expect(resolved.money_disbursement).toBe(false);
    expect(resolved.money_dividend).toBe(false);
    expect(resolved.money_bon).toBe(false);
    expect(resolved.channel_whatsapp).toBe(false);
    expect(resolved.agent_autonomy_l2_plus).toBe(false);
    expect(() => assertMoneyFeatureEnabled('money_payroll', resolved)).not.toThrow();
    expect(() => assertMoneyFeatureEnabled('money_disbursement', resolved)).toThrow(MoneyFeatureDisabledError);
  });

  it('apps/web/.env.example mendokumentasikan seluruh 6 flag dengan nilai default false', () => {
    const envExamplePath = path.resolve(__dirname, '../../../../.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf8');
    for (const key of PRODUCTION_MONEY_FLAG_KEYS) {
      const envVar = PRODUCTION_MONEY_FLAG_ENV_MAP[key];
      expect(content).toContain(`${envVar}=false`);
    }
  });
});

