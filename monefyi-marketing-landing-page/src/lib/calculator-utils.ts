export interface FinanceCheckResult {
  status: 'safe' | 'warning' | 'danger';
  surplus: number;
  sisaSetelahTagihan: number;
  budgetHarian: number;
  totalBelanja: number;
  hariSampaiGajian: number;
}

export function checkFinanceCondition(
  pemasukan: number,
  tanggalGajian: number,
  tagihanTetap: number,
  belanjaHarian: number
): FinanceCheckResult {
  const today = new Date().getDate();
  let hariSampaiGajian: number;
  if (tanggalGajian > today) {
    hariSampaiGajian = tanggalGajian - today;
  } else {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    hariSampaiGajian = daysInMonth - today + tanggalGajian;
  }

  const sisaSetelahTagihan = pemasukan - tagihanTetap;
  const budgetHarian = sisaSetelahTagihan / 30;
  const totalBelanja = belanjaHarian * hariSampaiGajian;
  const surplus = sisaSetelahTagihan - totalBelanja;

  let status: 'safe' | 'warning' | 'danger';
  if (surplus > 500000) status = 'safe';
  else if (surplus >= 0) status = 'warning';
  else status = 'danger';

  return { status, surplus, sisaSetelahTagihan, budgetHarian, totalBelanja, hariSampaiGajian };
}

export interface DebtItem {
  id: string;
  nama: string;
  sisaPokok: number;
  bungaPerBulan: number;
  cicilanMinimum: number;
}

export interface DebtFreeResult {
  monthsToFree: number;
  totalBungaDibayar: number;
  totalDibayar: number;
  debtTimeline: { id: string; nama: string; lunasBulan: number }[];
  monthlyData: MonthlyDebtData[];
}

export interface MonthlyDebtData {
  bulan: number;
  totalSisa: number;
  totalBayar: number;
  debts: { id: string; sisa: number; bayar: number }[];
}

export function calculateDebtFree(
  debts: DebtItem[],
  alokasiPerBulan: number,
  strategi: 'snowball' | 'avalanche'
): DebtFreeResult {
  if (debts.length === 0) {
    return { monthsToFree: 0, totalBungaDibayar: 0, totalDibayar: 0, debtTimeline: [], monthlyData: [] };
  }

  const sorted = [...debts].sort((a, b) => {
    if (strategi === 'snowball') return a.sisaPokok - b.sisaPokok;
    return b.bungaPerBulan - a.bungaPerBulan;
  });

  const currentDebts = sorted.map(d => ({ ...d, sisa: d.sisaPokok }));
  const debtTimeline: { id: string; nama: string; lunasBulan: number }[] = [];
  const monthlyData: MonthlyDebtData[] = [];
  let totalBungaDibayar = 0;
  let totalDibayar = 0;
  let bulan = 0;
  const maxBulan = 360;

  while (currentDebts.some(d => d.sisa > 0) && bulan < maxBulan) {
    bulan++;
    let remainingAlokasi = alokasiPerBulan;
    const monthData: MonthlyDebtData = { bulan, totalSisa: 0, totalBayar: 0, debts: [] };

    // Pay minimums first
    for (const debt of currentDebts) {
      if (debt.sisa <= 0) {
        monthData.debts.push({ id: debt.id, sisa: 0, bayar: 0 });
        continue;
      }
      const bunga = debt.sisa * (debt.bungaPerBulan / 100);
      const minPay = Math.min(debt.cicilanMinimum, debt.sisa + bunga);
      const actualPay = Math.min(remainingAlokasi, minPay);
      const bayarPokok = Math.max(0, actualPay - bunga);
      debt.sisa = Math.max(0, debt.sisa - bayarPokok);
      remainingAlokasi -= actualPay;
      totalBungaDibayar += bunga;
      totalDibayar += actualPay;
      monthData.debts.push({ id: debt.id, sisa: debt.sisa, bayar: actualPay });
      if (debt.sisa === 0 && !debtTimeline.find(t => t.id === debt.id)) {
        debtTimeline.push({ id: debt.id, nama: debt.nama, lunasBulan: bulan });
      }
    }

    // Apply extra to priority debt
    if (remainingAlokasi > 0) {
      const priorityDebt = currentDebts.find(d => d.sisa > 0);
      if (priorityDebt) {
        const extra = Math.min(remainingAlokasi, priorityDebt.sisa);
        priorityDebt.sisa = Math.max(0, priorityDebt.sisa - extra);
        totalDibayar += extra;
        const existing = monthData.debts.find(d => d.id === priorityDebt.id);
        if (existing) { existing.sisa = priorityDebt.sisa; existing.bayar += extra; }
        if (priorityDebt.sisa === 0 && !debtTimeline.find(t => t.id === priorityDebt.id)) {
          debtTimeline.push({ id: priorityDebt.id, nama: priorityDebt.nama, lunasBulan: bulan });
        }
      }
    }

    monthData.totalSisa = currentDebts.reduce((sum, d) => sum + d.sisa, 0);
    monthData.totalBayar = alokasiPerBulan - remainingAlokasi;
    monthlyData.push(monthData);

    if (currentDebts.every(d => d.sisa <= 0)) break;
  }

  return { monthsToFree: bulan, totalBungaDibayar, totalDibayar, debtTimeline, monthlyData };
}

export interface BudgetResult {
  kebutuhan: number;
  keinginan: number;
  tabungan: number;
  sedekah: number;
  hutang: number;
}

export function calculateBudget(
  totalPenghasilan: number,
  metode: '50/30/20' | '40/30/20/10' | '70/20/10' | 'custom',
  customPersen?: { kebutuhan: number; keinginan: number; tabungan: number; sedekah: number }
): BudgetResult {
  switch (metode) {
    case '50/30/20':
      return {
        kebutuhan: totalPenghasilan * 0.5,
        keinginan: totalPenghasilan * 0.3,
        tabungan: totalPenghasilan * 0.2,
        sedekah: 0,
        hutang: 0,
      };
    case '40/30/20/10':
      return {
        kebutuhan: totalPenghasilan * 0.4,
        keinginan: totalPenghasilan * 0.3,
        tabungan: totalPenghasilan * 0.2,
        sedekah: totalPenghasilan * 0.1,
        hutang: 0,
      };
    case '70/20/10':
      return {
        kebutuhan: totalPenghasilan * 0.7,
        keinginan: 0,
        tabungan: totalPenghasilan * 0.2,
        sedekah: 0,
        hutang: totalPenghasilan * 0.1,
      };
    case 'custom':
      return {
        kebutuhan: totalPenghasilan * ((customPersen?.kebutuhan ?? 50) / 100),
        keinginan: totalPenghasilan * ((customPersen?.keinginan ?? 30) / 100),
        tabungan: totalPenghasilan * ((customPersen?.tabungan ?? 20) / 100),
        sedekah: totalPenghasilan * ((customPersen?.sedekah ?? 0) / 100),
        hutang: 0,
      };
    default:
      return { kebutuhan: 0, keinginan: 0, tabungan: 0, sedekah: 0, hutang: 0 };
  }
}
