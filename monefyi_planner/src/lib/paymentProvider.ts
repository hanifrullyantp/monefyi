export type PlannerPaymentProvider = 'lynk' | 'mayar';

const PROVIDERS: PlannerPaymentProvider[] = ['lynk', 'mayar'];

function readEnv(key: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (
    env[key]?.trim() ||
    env[key.replace('VITE_', 'NEXT_PUBLIC_')]?.trim() ||
    ''
  );
}

/** Checkout gateway: Lynk (default) or Mayar. Override with VITE_PLANNER_PAYMENT_PROVIDER. */
export function resolvePaymentProvider(
  override?: string | null,
): PlannerPaymentProvider {
  const raw = (override ?? readEnv('VITE_PLANNER_PAYMENT_PROVIDER')).trim().toLowerCase();
  if (PROVIDERS.includes(raw as PlannerPaymentProvider)) {
    return raw as PlannerPaymentProvider;
  }
  return 'lynk';
}

export const MAYAR_CHECKOUT_PRODUCT_ENV: Record<
  'estimator_standard' | 'estimator_pro' | 'planner_pro',
  string
> = {
  estimator_standard: 'VITE_MAYAR_ESTIMATOR_STANDARD',
  estimator_pro: 'VITE_MAYAR_ESTIMATOR_PRO',
  planner_pro: 'VITE_MAYAR_PLANNER_PRO',
};
