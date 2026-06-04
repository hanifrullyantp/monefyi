export interface ShiftTime {
  hour: number;
  minute: number;
}

export interface WorkHours {
  start: ShiftTime;
  end: ShiftTime;
}

const DEFAULT_WORK_HOURS: WorkHours = {
  start: { hour: 8, minute: 0 },
  end: { hour: 17, minute: 0 },
};

function parseTimeString(value: unknown): ShiftTime | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function parseShiftObject(value: unknown): ShiftTime | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const hour = Number(row.hour);
  const minute = Number(row.minute ?? 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Parse `planner_organizations.settings.work_hours` (strings or {hour, minute}). */
export function parseWorkHours(settings?: Record<string, unknown> | null): WorkHours {
  const raw = settings?.work_hours;
  if (!raw || typeof raw !== 'object') return DEFAULT_WORK_HOURS;

  const block = raw as Record<string, unknown>;
  const start = parseShiftObject(block.start) ?? parseTimeString(block.start);
  const end = parseShiftObject(block.end) ?? parseTimeString(block.end);
  if (!start || !end) return DEFAULT_WORK_HOURS;
  return { start, end };
}
