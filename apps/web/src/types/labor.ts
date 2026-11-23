export type LaborRateType = 'daily' | 'hourly' | 'monthly';
export type LaborSlotKind = 'planned' | 'actual';

export interface LaborSlot {
  id: string;
  org_id: string;
  project_id: string;
  rap_item_id?: string | null;
  member_id?: string | null;
  work_date: string;
  slot_kind: LaborSlotKind;
  rate_type: LaborRateType;
  day_fraction: number;
  regular_hours: number;
  overtime_hours: number;
  unit_rate: number;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type LaborSlotInput = Omit<LaborSlot, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export interface LaborSlotDraft {
  work_date: string;
  day_fraction: number;
  regular_hours: number;
  overtime_hours: number;
  notes?: string;
}

export interface LaborRapAggregate {
  quantity: number;
  unitPrice: number;
  totalCost: number;
  totalDays: number;
  totalOvertimeHours: number;
  unit: string;
}
