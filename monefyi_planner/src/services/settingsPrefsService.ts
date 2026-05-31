const STORAGE_KEY = 'monefyi_planner_notif_prefs';

export interface NotificationPrefs {
  email_invitation: boolean;
  email_role_change: boolean;
  inapp_join_request: boolean;
  inapp_project: boolean;
  inapp_hr: boolean;
  inapp_finance: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  email_invitation: true,
  email_role_change: true,
  inapp_join_request: true,
  inapp_project: true,
  inapp_hr: true,
  inapp_finance: true,
};

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIF_PREFS };
    return { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
