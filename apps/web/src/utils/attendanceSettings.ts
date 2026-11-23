/** Org attendance & payroll settings stored in planner_organizations.settings.attendance */

export interface WorkSite {
  name?: string;
  lat: number;
  lng: number;
  radius_m: number;
}

export interface AllowedWifi {
  ssid: string;
  label?: string;
}

export interface AttendanceSettings {
  hours_per_day: number;
  work_site?: WorkSite | null;
  allowed_wifi: AllowedWifi[];
  wifi_ping_url?: string | null;
  auto_wifi_checkin: boolean;
  geofence_enabled: boolean;
  warn_offsite: boolean;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  hours_per_day: 8,
  work_site: null,
  allowed_wifi: [],
  wifi_ping_url: null,
  auto_wifi_checkin: false,
  geofence_enabled: false,
  warn_offsite: true,
};

export function parseAttendanceSettings(settings?: Record<string, unknown> | null): AttendanceSettings {
  const raw = settings?.attendance;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ATTENDANCE_SETTINGS };

  const a = raw as Record<string, unknown>;
  const hours = Number(a.hours_per_day);
  let workSite: WorkSite | null = null;
  if (a.work_site && typeof a.work_site === 'object') {
    const ws = a.work_site as Record<string, unknown>;
    const lat = Number(ws.lat);
    const lng = Number(ws.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      workSite = {
        name: typeof ws.name === 'string' ? ws.name : undefined,
        lat,
        lng,
        radius_m: Number(ws.radius_m) > 0 ? Number(ws.radius_m) : 200,
      };
    }
  }

  const wifiList = Array.isArray(a.allowed_wifi)
    ? a.allowed_wifi
        .map(w => {
          if (!w || typeof w !== 'object') return null;
          const row = w as Record<string, unknown>;
          const ssid = String(row.ssid || '').trim();
          if (!ssid) return null;
          return { ssid, label: typeof row.label === 'string' ? row.label : undefined };
        })
        .filter(Boolean) as AllowedWifi[]
    : [];

  return {
    hours_per_day: Number.isFinite(hours) && hours > 0 ? hours : 8,
    work_site: workSite,
    allowed_wifi: wifiList,
    wifi_ping_url: typeof a.wifi_ping_url === 'string' ? a.wifi_ping_url.trim() || null : null,
    auto_wifi_checkin: a.auto_wifi_checkin === true,
    geofence_enabled: a.geofence_enabled === true,
    warn_offsite: a.warn_offsite !== false,
  };
}

export function attendanceSettingsToJson(settings: AttendanceSettings): Record<string, unknown> {
  return {
    attendance: {
      hours_per_day: settings.hours_per_day,
      work_site: settings.work_site,
      allowed_wifi: settings.allowed_wifi,
      wifi_ping_url: settings.wifi_ping_url,
      auto_wifi_checkin: settings.auto_wifi_checkin,
      geofence_enabled: settings.geofence_enabled,
      warn_offsite: settings.warn_offsite,
    },
  };
}
