import { supabase } from '../lib/supabase';

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
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_NOTIF_PREFS };
    return { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs, userId?: string): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch {
    /* ignore */
  }

  if (!userId) return;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle();
    const existing = (profile?.settings as Record<string, unknown>) || {};
    await supabase
      .from('profiles')
      .update({
        settings: {
          ...existing,
          notification_prefs: prefs,
        },
      })
      .eq('id', userId);
  } catch (err) {
    console.warn('Failed to save notification preferences to Supabase:', err);
  }
}

export async function fetchNotificationPrefsFromSupabase(userId: string): Promise<NotificationPrefs | null> {
  if (!userId) return null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle();
    const settings = (profile?.settings as Record<string, unknown>) || {};
    if (settings.notification_prefs) {
      const prefs = { ...DEFAULT_NOTIF_PREFS, ...(settings.notification_prefs as NotificationPrefs) };
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        }
      } catch {
        /* ignore */
      }
      return prefs;
    }
  } catch (err) {
    console.warn('Failed to fetch notification preferences from Supabase:', err);
  }
  return null;
}
