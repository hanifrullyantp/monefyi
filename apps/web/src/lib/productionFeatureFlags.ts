import {
  DEFAULT_PRODUCTION_MONEY_FLAGS,
  MoneyFeatureDisabledError,
  PRODUCTION_MONEY_FLAG_ENV_MAP,
  PRODUCTION_MONEY_FLAG_KEYS,
  PRODUCTION_MONEY_FLAG_LABELS,
  assertMoneyFeatureEnabled,
  isMoneyFeatureFlagEnabled,
  resolveProductionMoneyFlags,
  type EnvRecord,
  type ProductionMoneyFlagKey,
  type ProductionMoneyFlags,
} from '@domain/productionFeatureFlags';

function readViteEnv(): EnvRecord {
  const metaEnv = (import.meta as unknown as { env?: EnvRecord })?.env;
  return metaEnv ?? {};
}

export function getProductionMoneyFlags(envOverride?: EnvRecord): ProductionMoneyFlags {
  return resolveProductionMoneyFlags(envOverride ?? readViteEnv());
}

export function isMoneyFeatureEnabled(
  flagKey: ProductionMoneyFlagKey,
  envOverride?: EnvRecord,
): boolean {
  return isMoneyFeatureFlagEnabled(flagKey, envOverride ?? readViteEnv());
}

export function requireMoneyFeatureEnabled(
  flagKey: ProductionMoneyFlagKey,
  envOverride?: EnvRecord,
): void {
  assertMoneyFeatureEnabled(flagKey, envOverride ?? readViteEnv());
}

export {
  DEFAULT_PRODUCTION_MONEY_FLAGS,
  MoneyFeatureDisabledError,
  PRODUCTION_MONEY_FLAG_ENV_MAP,
  PRODUCTION_MONEY_FLAG_KEYS,
  PRODUCTION_MONEY_FLAG_LABELS,
  assertMoneyFeatureEnabled,
  isMoneyFeatureFlagEnabled,
  resolveProductionMoneyFlags,
  type ProductionMoneyFlagKey,
  type ProductionMoneyFlags,
};

