// =====================================================
// HTML for balance badge + diagnosis panel
// =====================================================

import { formatRupiah } from "../utils";
import type { BalanceCheckResult } from "./types";

/**
 * Compact badge for neraca header.
 */
export function renderBalanceBadge(check: BalanceCheckResult): string {
  if (check.isBalanced) {
    return `
    <button class="balance-badge balance-badge--ok" onclick="APP.openBalanceDiagnosis('${check.scope}'${check.projectId != null ? `, '${check.projectId}'` : ""})" title="Neraca balance">
      <i data-lucide="check-circle-2"></i> Balance
    </button>`;
  }

  const gapLabel = check.gap > 0 ? "Aktiva > Pasiva" : "Pasiva > Aktiva";
  return `
  <button class="balance-badge balance-badge--error" onclick="APP.openBalanceDiagnosis('${check.scope}'${check.projectId != null ? `, '${check.projectId}'` : ""})" title="Klik untuk diagnosa">
    <i data-lucide="alert-triangle"></i> Tidak Balance
    <span class="balance-badge-gap">${formatRupiah(Math.abs(check.gap), true)}</span>
  </button>`;
}

/**
 * Full diagnosis panel HTML (modal body).
 */
export function renderBalanceDiagnosisPanel(check: BalanceCheckResult): string {
  const title = check.scope === "business" ? "Neraca Bisnis" : "Neraca Project";
  const statusIcon = check.isBalanced ? "check-circle-2" : "alert-triangle";
  const statusColor = check.isBalanced ? "var(--success)" : "var(--danger)";
  const gapText = check.isBalanced
    ? "Aktiva = Pasiva + Ekuitas"
    : `Selisih ${formatRupiah(Math.abs(check.gap))} (${check.gap > 0 ? "Aktiva lebih besar" : "Pasiva+Ekuitas lebih besar"})`;

  const issuesHtml =
    check.issues.length === 0
      ? `<p style="color:var(--gray-500);font-size:13px;">Tidak ada masalah teridentifikasi.</p>`
      : check.issues
          .map(
            (issue, idx) => `
      <div class="balance-issue ${issue.severity === "warning" ? "balance-issue--warn" : ""}">
        <div class="balance-issue-num">${idx + 1}</div>
        <div class="balance-issue-body">
          <div class="balance-issue-title">${issue.message}</div>
          ${issue.delta != null ? `<div class="balance-issue-delta">Selisih: ${formatRupiah(Math.abs(issue.delta), true)}</div>` : ""}
          <button class="btn btn-sm btn-outline" style="margin-top:8px;"
            onclick="APP.navigate('${issue.fix.route || ""}');APP.closeModal();">
            ${issue.fix.cta || issue.fix.action}
          </button>
        </div>
      </div>`
          )
          .join("");

  const linesHtml = check.lines
    .map(
      (line) => `
    <div class="neraca-row ${line.hasError ? "neraca-row--error" : ""}">
      <span class="neraca-row-label">${line.label}</span>
      <span class="neraca-row-value">${formatRupiah(line.amount, true)}${line.hasError ? " ⚠️" : ""}</span>
    </div>`
    )
    .join("");

  return `
  <div class="balance-diagnosis">
    <div class="balance-diagnosis-header" style="color:${statusColor}">
      <i data-lucide="${statusIcon}"></i>
      <div>
        <div style="font-weight:800;font-size:16px;">${title}</div>
        <div style="font-size:13px;opacity:0.85;">${gapText}</div>
      </div>
    </div>
    <div class="balance-diagnosis-totals grid-3" style="gap:8px;margin:16px 0;">
      <div class="stat-card" style="padding:12px;">
        <div style="font-size:11px;color:var(--gray-500);">Aktiva</div>
        <div style="font-weight:800;">${formatRupiah(check.aktiva, true)}</div>
      </div>
      <div class="stat-card" style="padding:12px;">
        <div style="font-size:11px;color:var(--gray-500);">Pasiva</div>
        <div style="font-weight:800;">${formatRupiah(check.pasiva, true)}</div>
      </div>
      <div class="stat-card" style="padding:12px;">
        <div style="font-size:11px;color:var(--gray-500);">Ekuitas</div>
        <div style="font-weight:800;">${formatRupiah(check.ekuitas, true)}</div>
      </div>
    </div>
    ${
      check.issues.length > 0
        ? `
    <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--gray-700);">
      <i data-lucide="search"></i> Masalah ditemukan (${check.issues.length})
    </div>
    <div class="balance-issues">${issuesHtml}</div>`
        : ""
    }
    <div style="font-weight:700;font-size:13px;margin:16px 0 8px;color:var(--gray-700);">Rincian baris</div>
    <div class="balance-lines">${linesHtml}</div>
  </div>`;
}
