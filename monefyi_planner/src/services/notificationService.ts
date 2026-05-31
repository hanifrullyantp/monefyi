import { toNotification, type DbNotification } from '../lib/adapters';
import { supabase } from '../lib/supabase';
import type { Notification } from '../store/appStore';

export async function loadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('planner_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return ((data || []) as DbNotification[]).map(toNotification);
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('planner_notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('planner_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}

export function subscribeNotifications(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'planner_notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeProjects(orgId: string, onChange: () => void) {
  const channel = supabase
    .channel(`projects-${orgId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'planner_projects',
        filter: `org_id=eq.${orgId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
