const DAY_MS = 86_400_000;

export type EvmBudgetLine = {
  quantity?: number | null;
  unit_price?: number | null;
};

export type EvmWorkItem = {
  weight?: number | null;
  progress_pct?: number | null;
  planned_start?: string | null;
  planned_end?: string | null;
};

export type ProjectEvm = {
  totalBudget: number;
  plannedProgress: number;
  actualProgress: number;
  pv: number;
  ev: number;
  ac: number;
  spi: number;
  cpi: number;
  eac: number;
  etc: number;
  sv: number;
  cv: number;
  elapsedDays: number;
  totalDays: number;
};

/**
 * EVM yang sama dengan analisa proyek yang sudah berjalan.
 * Bobot 0 tidak dihitung. Hari memakai jam yang disuntik.
 */
export function computeProjectEvm(input: {
  budgetLines: EvmBudgetLine[];
  spentAmounts: number[];
  workItems: EvmWorkItem[];
  plannedStart: string | null;
  plannedEnd: string | null;
  now: Date;
}): ProjectEvm {
  const totalBudget = input.budgetLines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unit_price),
    0,
  );
  const ac = input.spentAmounts.reduce((sum, amount) => sum + (Number(amount) || 0), 0);
  const totalWeight = input.workItems.reduce((sum, item) => sum + (Number(item.weight) || 0), 0) || 1;

  const startDate = new Date(input.plannedStart || '');
  const endDate = new Date(input.plannedEnd || '');
  const today = input.now;
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
  const elapsedDays = Math.max(0, Math.min(
    Math.ceil((today.getTime() - startDate.getTime()) / DAY_MS) + 1,
    totalDays,
  ));

  let plannedProgress = 0;
  for (const item of input.workItems) {
    const itemStart = new Date(item.planned_start || '');
    const itemEnd = new Date(item.planned_end || '');
    const duration = Math.ceil((itemEnd.getTime() - itemStart.getTime()) / DAY_MS) + 1 || 1;
    if (today >= itemStart) {
      const elapsed = Math.min(Math.ceil((today.getTime() - itemStart.getTime()) / DAY_MS) + 1, duration);
      plannedProgress += ((Number(item.weight) || 0) / totalWeight) * (elapsed / duration) * 100;
    }
  }

  const actualProgress = input.workItems.reduce(
    (sum, item) => sum + (Number(item.weight) || 0) * (Number(item.progress_pct) || 0),
    0,
  ) / totalWeight;

  const pv = totalBudget * plannedProgress / 100;
  const ev = totalBudget * actualProgress / 100;
  const spi = pv > 0 ? ev / pv : 0;
  const cpi = ac > 0 ? ev / ac : 0;
  const eac = cpi > 0 ? totalBudget / cpi : totalBudget;

  return {
    totalBudget,
    plannedProgress,
    actualProgress,
    pv,
    ev,
    ac,
    spi,
    cpi,
    eac,
    etc: eac - ac,
    sv: ev - pv,
    cv: ev - ac,
    elapsedDays,
    totalDays,
  };
}
