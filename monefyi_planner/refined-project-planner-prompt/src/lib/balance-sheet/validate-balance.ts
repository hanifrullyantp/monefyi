// =====================================================
// Validate aktiva = pasiva + ekuitas
// =====================================================

import { buildBusinessSheet } from "./build-business-sheet";
import { buildProjectSheet } from "./build-project-sheet";
import { diagnoseImbalance } from "./diagnose-imbalance";
import type { APP_DATA } from "../mock-data";
import type { Project } from "../project-detail/data-adapter";
import type { BalanceCheckResult, BalanceSheet } from "./types";
import { BALANCE_TOLERANCE } from "./types";

/**
 * Validate a pre-built balance sheet.
 */
export function validateSheet(sheet: BalanceSheet): BalanceCheckResult {
  const gap = sheet.aktiva - (sheet.pasiva + sheet.ekuitas);
  const isBalanced = Math.abs(gap) <= BALANCE_TOLERANCE;
  const issues = isBalanced ? [] : diagnoseImbalance(sheet, gap);

  const lines = sheet.lines.map((line) => ({
    ...line,
    hasError: issues.some((i) => i.field === line.key),
  }));

  return {
    scope: sheet.scope,
    projectId: sheet.projectId,
    isBalanced,
    aktiva: sheet.aktiva,
    pasiva: sheet.pasiva,
    ekuitas: sheet.ekuitas,
    gap,
    lines,
    issues,
  };
}

export function validateBusinessBalance(
  business: typeof APP_DATA.business
): BalanceCheckResult {
  return validateSheet(buildBusinessSheet(business));
}

export function validateProjectBalance(project: Project): BalanceCheckResult {
  return validateSheet(buildProjectSheet(project));
}
