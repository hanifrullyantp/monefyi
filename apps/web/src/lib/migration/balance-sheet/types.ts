// =====================================================
// Balance Sheet — shared types
// =====================================================

export type BalanceScope = "business" | "project";

export type BalanceSide = "aktiva" | "pasiva" | "ekuitas";

export type BalanceLine = {
  key: string;
  label: string;
  side: BalanceSide;
  amount: number;
  icon?: string;
  /** Highlight when linked to an issue */
  hasError?: boolean;
};

export type BalanceFix = {
  action: string;
  route?: string;
  cta?: string;
};

export type BalanceIssue = {
  code: string;
  severity: "error" | "warning";
  field: string;
  message: string;
  expected?: number;
  actual?: number;
  delta?: number;
  fix: BalanceFix;
};

export type BalanceSheet = {
  scope: BalanceScope;
  projectId?: number | string;
  lines: BalanceLine[];
  aktiva: number;
  pasiva: number;
  ekuitas: number;
  meta?: Record<string, unknown>;
};

export type BalanceCheckResult = {
  scope: BalanceScope;
  projectId?: number | string;
  isBalanced: boolean;
  aktiva: number;
  pasiva: number;
  ekuitas: number;
  gap: number;
  lines: BalanceLine[];
  issues: BalanceIssue[];
};

export const BALANCE_TOLERANCE = 1;
