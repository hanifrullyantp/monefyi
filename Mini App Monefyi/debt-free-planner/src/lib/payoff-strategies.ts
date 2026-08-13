// src/lib/payoff-strategies.ts
import type {
  DebtItem,
  PayoffStrategy,
  PayoffResult,
  PayoffMonth,
  DebtPaymentDetail,
  StrategyComparison,
} from "@/types";
import { formatDate } from "./formatters";

interface DebtState {
  id: string;
  nama: string;
  sisa: number;
  bungaPerBulan: number;
  cicilanMinimum: number;
  isLunas: boolean;
}

function sortDebts(debts: DebtState[], strategy: PayoffStrategy): DebtState[] {
  const sorted = [...debts];
  if (strategy === "snowball") {
    sorted.sort((a, b) => {
      if (a.isLunas && !b.isLunas) return 1;
      if (!a.isLunas && b.isLunas) return -1;
      return a.sisa - b.sisa;
    });
  } else if (strategy === "avalanche") {
    sorted.sort((a, b) => {
      if (a.isLunas && !b.isLunas) return 1;
      if (!a.isLunas && b.isLunas) return -1;
      return b.bungaPerBulan - a.bungaPerBulan;
    });
  }
  return sorted;
}

export function calculatePayoffSchedule(
  debts: DebtItem[],
  monthlyAllocation: number,
  strategy: PayoffStrategy,
  extraPayment: number
): PayoffResult {
  if (debts.length === 0) {
    return {
      strategy,
      totalHutangAwal: 0,
      totalBungaDibayar: 0,
      totalDibayar: 0,
      tanggalLunas: formatDate(0),
      bulanUntukLunas: 0,
      jadwal: [],
      urutanPelunasan: [],
    };
  }

  const totalHutangAwal = debts.reduce((s, d) => s + d.totalHutang, 0);
  const totalMinimum = debts.reduce((s, d) => s + d.cicilanMinimum, 0);

  let effectiveAllocation = monthlyAllocation;
  if (effectiveAllocation < totalMinimum) {
    effectiveAllocation = totalMinimum;
  }

  let debtStates: DebtState[] = debts.map((d) => ({
    id: d.id,
    nama: d.nama,
    sisa: d.totalHutang,
    bungaPerBulan: d.bungaPerBulan,
    cicilanMinimum: d.cicilanMinimum,
    isLunas: false,
  }));

  const jadwal: PayoffMonth[] = [];
  let totalBungaDibayar = 0;
  let totalDibayar = 0;
  const urutanPelunasan: string[] = [];
  const MAX_MONTHS = 360;

  // Track freed up minimum payments (rollover)
  let rolledOverMinimum = 0;

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const activeDebts = debtStates.filter((d) => !d.isLunas);
    if (activeDebts.length === 0) break;

    // Re-sort active debts by strategy each month
    const sortedActive = sortDebts(activeDebts, strategy);

    // Total available payment
    const totalAvailable = effectiveAllocation + extraPayment + rolledOverMinimum;
    let remainingBudget = totalAvailable;

    // First pass: pay minimum on all debts and compute interest
    const interestMap: Map<string, number> = new Map();
    for (const debt of activeDebts) {
      const interest = debt.sisa * (debt.bungaPerBulan / 100);
      interestMap.set(debt.id, interest);
    }

    // Pay minimum on each debt
    const paidMap: Map<string, number> = new Map();
    for (const debt of sortedActive) {
      const interest = interestMap.get(debt.id) ?? 0;
      const minPay = Math.min(debt.cicilanMinimum, debt.sisa + interest);
      paidMap.set(debt.id, minPay);
      remainingBudget -= minPay;
    }

    // If budget is less than minimums (shouldn't happen with our validation), just pay what we can
    if (remainingBudget < 0) {
      remainingBudget = 0;
    }

    // Second pass: apply extra to priority debt (first non-lunas in sorted order)
    for (const debt of sortedActive) {
      if (remainingBudget <= 0) break;
      const interest = interestMap.get(debt.id) ?? 0;
      const currentPaid = paidMap.get(debt.id) ?? 0;
      const maxCanPay = debt.sisa + interest - currentPaid;
      if (maxCanPay > 0) {
        const extra = Math.min(remainingBudget, maxCanPay);
        paidMap.set(debt.id, currentPaid + extra);
        remainingBudget -= extra;
      }
    }

    // Apply payments and build detail
    const detailPerHutang: DebtPaymentDetail[] = [];
    const hutangLunasBulanIni: string[] = [];
    let bulanTotalBunga = 0;
    let bulanTotalPokok = 0;
    let bulanTotalBayar = 0;
    let bulanTotalSisa = 0;
    rolledOverMinimum = 0;

    for (const debt of debtStates) {
      if (debt.isLunas) {
        detailPerHutang.push({
          debtId: debt.id,
          debtNama: debt.nama,
          bungaBulan: 0,
          pokokBulan: 0,
          totalBayar: 0,
          sisaSetelah: 0,
          isLunas: true,
        });
        continue;
      }

      const interest = interestMap.get(debt.id) ?? 0;
      const totalPaid = paidMap.get(debt.id) ?? 0;
      const pokokPaid = Math.max(0, totalPaid - interest);
      const newSisa = Math.max(0, debt.sisa - pokokPaid);

      bulanTotalBunga += interest;
      bulanTotalPokok += pokokPaid;
      bulanTotalBayar += totalPaid;

      const isLunas = newSisa <= 0.01;

      if (isLunas && !debt.isLunas) {
        hutangLunasBulanIni.push(debt.nama);
        urutanPelunasan.push(debt.nama);
        // Rollover the minimum for next month
        rolledOverMinimum += debt.cicilanMinimum;
        debt.isLunas = true;
        debt.sisa = 0;
      } else {
        debt.sisa = newSisa;
        bulanTotalSisa += newSisa;
      }

      detailPerHutang.push({
        debtId: debt.id,
        debtNama: debt.nama,
        bungaBulan: interest,
        pokokBulan: pokokPaid,
        totalBayar: totalPaid,
        sisaSetelah: newSisa,
        isLunas,
      });
    }

    bulanTotalSisa = debtStates
      .filter((d) => !d.isLunas)
      .reduce((s, d) => s + d.sisa, 0);

    totalBungaDibayar += bulanTotalBunga;
    totalDibayar += bulanTotalBayar;

    jadwal.push({
      bulanKe: month,
      tanggal: formatDate(month),
      totalPembayaran: bulanTotalBayar,
      totalPokokDibayar: bulanTotalPokok,
      totalBungaDibayar: bulanTotalBunga,
      totalSisaHutang: bulanTotalSisa,
      detailPerHutang,
      hutangLunasBulanIni,
    });

    if (debtStates.every((d) => d.isLunas)) break;
  }

  return {
    strategy,
    totalHutangAwal,
    totalBungaDibayar,
    totalDibayar,
    tanggalLunas: formatDate(jadwal.length),
    bulanUntukLunas: jadwal.length,
    jadwal,
    urutanPelunasan,
  };
}

export function calculateMinimumOnlyScenario(debts: DebtItem[]): PayoffResult {
  const totalMinimum = debts.reduce((s, d) => s + d.cicilanMinimum, 0);
  return calculatePayoffSchedule(debts, totalMinimum, "avalanche", 0);
}

export function compareStrategies(
  debts: DebtItem[],
  monthlyAllocation: number,
  extraPayment: number
): StrategyComparison {
  const snowball = calculatePayoffSchedule(debts, monthlyAllocation, "snowball", extraPayment);
  const avalanche = calculatePayoffSchedule(debts, monthlyAllocation, "avalanche", extraPayment);
  const minimumOnly = calculateMinimumOnlyScenario(debts);

  snowball.hematBunga = Math.max(0, minimumOnly.totalBungaDibayar - snowball.totalBungaDibayar);
  snowball.hematBulan = Math.max(0, minimumOnly.bulanUntukLunas - snowball.bulanUntukLunas);

  avalanche.hematBunga = Math.max(0, minimumOnly.totalBungaDibayar - avalanche.totalBungaDibayar);
  avalanche.hematBulan = Math.max(0, minimumOnly.bulanUntukLunas - avalanche.bulanUntukLunas);

  const hasSmallDebt = debts.some((d) => d.totalHutang < 3_000_000);
  const manyDebts = debts.length >= 3;
  const interestDiff = snowball.totalBungaDibayar - avalanche.totalBungaDibayar;

  let rekomendasi: "snowball" | "avalanche" | "custom" = "avalanche";
  let alasanRekomendasi = "";

  if (hasSmallDebt && manyDebts) {
    rekomendasi = "snowball";
    alasanRekomendasi =
      "Anda memiliki hutang kecil yang bisa dilunasi cepat. Metode Snowball memberikan quick win dan membangun momentum semangat.";
  } else if (interestDiff > 500_000) {
    rekomendasi = "avalanche";
    alasanRekomendasi = `Metode Avalanche menghemat bunga Rp ${Math.round(interestDiff).toLocaleString("id-ID")} lebih banyak dari Snowball. Pilihan paling efisien secara finansial.`;
  } else {
    rekomendasi = "avalanche";
    alasanRekomendasi =
      "Metode Avalanche adalah pilihan matematis terbaik untuk menghemat bunga dan mempercepat pelunasan.";
  }

  return {
    snowball,
    avalanche,
    minimumOnly,
    rekomendasi,
    alasanRekomendasi,
  };
}
