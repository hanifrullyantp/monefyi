import type { LaborRateType, LaborSlot, LaborSlotDraft, LaborRapAggregate } from '../types/labor';

const DEFAULT_HOURS_PER_DAY = 8;
const DEFAULT_OVERTIME_MULTIPLIER = 1.5;

export function workingDaysInMonth(ref = new Date()): number {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  let count = 0;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  for (let day = 1; day <= days; day++) {
    const wd = new Date(Date.UTC(y, m, day)).getUTCDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count || 22;
}

export function rateTypeToUnit(rateType: LaborRateType): string {
  if (rateType === 'hourly') return 'jam';
  if (rateType === 'monthly') return 'bulan';
  return 'hari';
}

export function hourlyEquivalent(rateType: LaborRateType, unitRate: number, hoursPerDay = DEFAULT_HOURS_PER_DAY): number {
  if (rateType === 'hourly') return unitRate;
  if (rateType === 'daily') return unitRate / hoursPerDay;
  return unitRate / (workingDaysInMonth() * hoursPerDay);
}

export function slotCost(
  slot: Pick<LaborSlot | LaborSlotDraft, 'rate_type' | 'day_fraction' | 'regular_hours' | 'overtime_hours' | 'unit_rate'>,
  refDate = new Date(),
  hoursPerDay = DEFAULT_HOURS_PER_DAY,
  overtimeMultiplier = DEFAULT_OVERTIME_MULTIPLIER,
): number {
  const rate = Number(slot.unit_rate) || 0;
  const fraction = Number(slot.day_fraction) || 0;
  const regular = Number(slot.regular_hours) || 0;
  const overtime = Number(slot.overtime_hours) || 0;

  if (slot.rate_type === 'hourly') {
    const hourly = rate;
    return regular * hourly + overtime * hourly * overtimeMultiplier;
  }
  if (slot.rate_type === 'monthly') {
    const perDay = rate / workingDaysInMonth(refDate);
    return perDay * fraction;
  }
  const daily = rate;
  const otHourly = hourlyEquivalent('daily', daily, hoursPerDay);
  return fraction * daily + overtime * otHourly * overtimeMultiplier;
}

export function aggregateSlotsToRap(
  slots: Array<Pick<LaborSlot, 'slot_kind' | 'rate_type' | 'day_fraction' | 'regular_hours' | 'overtime_hours' | 'unit_rate'>>,
  kind: 'planned' | 'actual',
  rateType: LaborRateType,
  refDate = new Date(),
): LaborRapAggregate {
  const filtered = slots.filter(s => s.slot_kind === kind);
  let totalCost = 0;
  let totalDays = 0;
  let totalOvertimeHours = 0;
  let quantity = 0;

  for (const s of filtered) {
    totalCost += slotCost({ ...s, rate_type: rateType, unit_rate: s.unit_rate || filtered[0]?.unit_rate || 0 }, refDate);
    totalDays += Number(s.day_fraction) || 0;
    totalOvertimeHours += Number(s.overtime_hours) || 0;

    if (rateType === 'hourly') {
      quantity += (Number(s.regular_hours) || 0) + (Number(s.overtime_hours) || 0);
    } else {
      quantity += Number(s.day_fraction) || 0;
    }
  }

  const unitPrice = filtered[0]?.unit_rate ?? 0;
  if (rateType === 'monthly' && quantity > 0) {
    return {
      quantity: Math.round(quantity * 100) / 100,
      unitPrice: Math.round((unitPrice / workingDaysInMonth(refDate)) * 100) / 100,
      totalCost: Math.round(totalCost),
      totalDays: Math.round(totalDays * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      unit: rateTypeToUnit(rateType),
    };
  }

  return {
    quantity: Math.round(quantity * 100) / 100,
    unitPrice: Math.round(unitPrice),
    totalCost: Math.round(totalCost),
    totalDays: Math.round(totalDays * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    unit: rateTypeToUnit(rateType),
  };
}
