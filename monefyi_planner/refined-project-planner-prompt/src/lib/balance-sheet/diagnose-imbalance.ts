// =====================================================
// Diagnose root causes of balance sheet imbalance
// =====================================================

import type { BalanceIssue, BalanceSheet } from "./types";
import { BALANCE_TOLERANCE } from "./types";

function issue(
  partial: Omit<BalanceIssue, "severity"> & { severity?: BalanceIssue["severity"] }
): BalanceIssue {
  return { severity: "error", ...partial };
}

/**
 * Analyze imbalance and return actionable issues (Bahasa Indonesia).
 */
export function diagnoseImbalance(sheet: BalanceSheet, gap: number): BalanceIssue[] {
  const issues: BalanceIssue[] = [];
  const absGap = Math.abs(gap);

  if (absGap <= BALANCE_TOLERANCE) return issues;

  if (sheet.scope === "business") {
    diagnoseBusiness(sheet, gap, issues);
  } else {
    diagnoseProject(sheet, gap, issues);
  }

  if (issues.length === 0 && absGap > 1000) {
    issues.push(
      issue({
        code: "GAP_UNEXPLAINED",
        field: "total",
        message: `Selisih ${formatRp(absGap)} belum teridentifikasi — periksa transaksi terakhir`,
        delta: gap,
        fix: {
          action: "Periksa transaksi 7 hari terakhir",
          route: "finance",
          cta: "Buka Keuangan",
        },
      })
    );
  }

  return issues.sort((a, b) => Math.abs(b.delta || 0) - Math.abs(a.delta || 0));
}

function diagnoseBusiness(sheet: BalanceSheet, gap: number, issues: BalanceIssue[]): void {
  const meta = sheet.meta || {};
  const storedTotal = Number(meta.storedTotalAktiva ?? 0);
  const rowSum = sheet.aktiva;

  if (storedTotal > 0 && Math.abs(storedTotal - rowSum) > BALANCE_TOLERANCE) {
    issues.push(
      issue({
        code: "ROW_SUM_MISMATCH",
        field: "totalAktiva",
        message: `Total Aktiva tersimpan (${formatRp(storedTotal)}) tidak sama dengan jumlah baris (${formatRp(rowSum)})`,
        expected: rowSum,
        actual: storedTotal,
        delta: storedTotal - rowSum,
        fix: {
          action: "Gunakan jumlah baris sebagai total aktiva",
          route: "finance",
          cta: "Refresh data",
        },
      })
    );
  }

  const storedEkuitas = Number(meta.storedEkuitas ?? 0);
  const computedEkuitas = sheet.ekuitas;
  if (storedEkuitas > 0 && Math.abs(storedEkuitas - computedEkuitas) > BALANCE_TOLERANCE) {
    issues.push(
      issue({
        code: "EKUITAS_MISMATCH",
        field: "ekuitas",
        message: `Ekuitas tersimpan (${formatRp(storedEkuitas)}) ≠ Modal + Laba Ditahan (${formatRp(computedEkuitas)})`,
        expected: computedEkuitas,
        actual: storedEkuitas,
        delta: storedEkuitas - computedEkuitas,
        fix: {
          action: "Periksa akun Modal Disetor dan Laba Ditahan",
          route: "finance",
          cta: "Buka Kas & Bank",
        },
      })
    );
  }

  const kasLine = sheet.lines.find((l) => l.key === "kas");
  if (kasLine && kasLine.amount < 0) {
    issues.push(
      issue({
        code: "NEGATIVE_KAS",
        field: "kas",
        message: "Saldo kas negatif — ada transaksi yang belum tercatat atau salah input",
        actual: kasLine.amount,
        fix: {
          action: "Periksa transaksi kas terakhir",
          route: "finance",
          cta: "Buka Kas & Bank",
        },
      })
    );
  }

  const piutangLine = sheet.lines.find((l) => l.key === "piutang");
  const piutangFromList = Number(meta.piutangFromList ?? 0);
  if (piutangLine && Math.abs(piutangLine.amount - piutangFromList) > BALANCE_TOLERANCE) {
    issues.push(
      issue({
        code: "PIUTANG_LIST_MISMATCH",
        field: "piutang",
        message: "Piutang di daftar tidak cocok dengan saldo akun piutang",
        fix: {
          action: "Sinkronkan piutang klien dengan akun finance",
          route: "finance",
          cta: "Buka Hutang Piutang",
        },
      })
    );
  }

  const persediaan = Number(meta.persediaanFromAssets ?? 0);
  const asetTetap = Number(meta.asetTetapField ?? 0);
  if (persediaan > 0 && asetTetap > 0 && meta.inventoryFromItems) {
    issues.push(
      issue({
        code: "DOUBLE_COUNT_INVENTORY",
        field: "persediaan",
        severity: "warning",
        message: `Persediaan (${formatRp(persediaan)}) mungkin tumpang tindih dengan Aset Tetap (${formatRp(asetTetap)}) — pastikan stok tidak dihitung dua kali`,
        delta: Math.min(persediaan, asetTetap),
        fix: {
          action: "Gunakan inventory items ATAU akun stok, bukan keduanya",
          route: "finance",
          cta: "Periksa Aset",
        },
      })
    );
  }

  if (gap > 0) {
    issues.push(
      issue({
        code: "AKTIVA_EXCEEDS_PASIVA",
        field: "total",
        severity: "warning",
        message: `Aktiva lebih besar ${formatRp(gap)} — kemungkinan ekuitas atau hutang belum tercatat`,
        delta: gap,
        fix: {
          action: "Tambahkan modal, laba ditahan, atau hutang yang belum dicatat",
          route: "finance",
          cta: "Buka Neraca",
        },
      })
    );
  } else if (gap < 0) {
    issues.push(
      issue({
        code: "PASIVA_EXCEEDS_AKTIVA",
        field: "total",
        severity: "warning",
        message: `Pasiva+Ekuitas lebih besar ${formatRp(Math.abs(gap))} — kemungkinan aset belum tercatat`,
        delta: gap,
        fix: {
          action: "Periksa kas, piutang, atau aset yang belum dimasukkan",
          route: "finance",
          cta: "Buka Neraca",
        },
      })
    );
  }
}

function diagnoseProject(sheet: BalanceSheet, gap: number, issues: BalanceIssue[]): void {
  const meta = sheet.meta || {};
  const saldo = Number(meta.saldo ?? 0);
  const received = Number(meta.received ?? 0);
  const spent = Number(meta.spent ?? 0);
  const expectedSaldo = Number(meta.expectedSaldo ?? received - spent);
  const hutang = Number(meta.hutang ?? 0);
  const hutangListSum = Number(meta.hutangListSum ?? 0);
  const piutang = Number(meta.piutang ?? 0);
  const expectedPiutang = Number(meta.expectedPiutang ?? 0);
  const piutangListSum = Number(meta.piutangListSum ?? 0);
  const projectId = sheet.projectId;

  if (Math.abs(saldo - expectedSaldo) > BALANCE_TOLERANCE) {
    issues.push(
      issue({
        code: "SALDO_MISMATCH",
        field: "saldo",
        message: `Saldo kas (${formatRp(saldo)}) tidak cocok dengan Pemasukan − Realisasi (${formatRp(expectedSaldo)})`,
        expected: expectedSaldo,
        actual: saldo,
        delta: saldo - expectedSaldo,
        fix: {
          action: "Perbarui saldo dari total diterima − total dibelanjakan",
          route: projectId ? `project/${projectId}/keuangan` : "projects",
          cta: "Buka Keuangan Project",
        },
      })
    );
  }

  if (Math.abs(piutang - expectedPiutang) > BALANCE_TOLERANCE && expectedPiutang > 0) {
    issues.push(
      issue({
        code: "PIUTANG_MISMATCH",
        field: "piutang",
        message: `Piutang klien (${formatRp(piutang)}) tidak sesuai Kontrak − Diterima (${formatRp(expectedPiutang)})`,
        expected: expectedPiutang,
        actual: piutang,
        delta: piutang - expectedPiutang,
        fix: {
          action: "Periksa termin dan pembayaran klien",
          route: projectId ? `project/${projectId}/keuangan` : "projects",
          cta: "Periksa Pembayaran",
        },
      })
    );
  }

  if (hutang === 0 && spent > received) {
    issues.push(
      issue({
        code: "HUTANG_MISSING",
        field: "hutang",
        message: `Realisasi (${formatRp(spent)}) melebihi dana masuk (${formatRp(received)}) — hutang vendor belum dicatat`,
        expected: spent - received,
        actual: 0,
        delta: spent - received,
        fix: {
          action: "Catat hutang vendor untuk biaya yang belum dibayar",
          route: projectId ? `project/${projectId}/keuangan` : "projects",
          cta: "Tambah Hutang",
        },
      })
    );
  }

  if (hutang > 0 && Math.abs(hutang - hutangListSum) > BALANCE_TOLERANCE && hutangListSum > 0) {
    issues.push(
      issue({
        code: "HUTANG_LIST_GAP",
        field: "hutang",
        message: `Total hutang (${formatRp(hutang)}) tidak sama dengan daftar hutang (${formatRp(hutangListSum)})`,
        expected: hutangListSum,
        actual: hutang,
        delta: hutang - hutangListSum,
        fix: {
          action: "Selaraskan item hutang dengan total budget.hutang",
          route: projectId ? `project/${projectId}/keuangan` : "projects",
          cta: "Edit Hutang",
        },
      })
    );
  }

  if (piutangListSum > 0 && Math.abs(piutang - piutangListSum) > BALANCE_TOLERANCE) {
    issues.push(
      issue({
        code: "PIUTANG_LIST_GAP",
        field: "piutang",
        message: `Piutang (${formatRp(piutang)}) tidak sama dengan daftar piutang (${formatRp(piutangListSum)})`,
        expected: piutangListSum,
        actual: piutang,
        delta: piutang - piutangListSum,
        fix: {
          action: "Selaraskan item piutang dengan total budget.piutang",
          route: projectId ? `project/${projectId}/keuangan` : "projects",
          cta: "Edit Piutang",
        },
      })
    );
  }

  const identityLeft = saldo + piutang + hutang;
  const identityRight = received;
  if (Math.abs(identityLeft - identityRight) > BALANCE_TOLERANCE) {
    issues.push(
      issue({
        code: "FUND_IDENTITY_BREAK",
        field: "total",
        message: `Saldo + Piutang + Hutang (${formatRp(identityLeft)}) ≠ Dana Masuk (${formatRp(identityRight)})`,
        expected: identityRight,
        actual: identityLeft,
        delta: identityLeft - identityRight,
        fix: {
          action: "Pastikan: Dana Masuk = Saldo + Biaya − Hutang, atau catat selisih sebagai hutang/piutang",
          route: projectId ? `project/${projectId}/keuangan` : "projects",
          cta: "Perbaiki Posisi",
        },
      })
    );
  }
}

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
