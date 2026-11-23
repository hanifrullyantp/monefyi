import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import type { PlannerTodo, PlannerTodoInput, PlannerTodoStatus } from '../types/plannerTodo';

const MEMBER_PROFILE = 'planner_org_members!assigned_member_id(profiles!user_id(name))';

function mapRow(row: Record<string, unknown>): PlannerTodo {
  const member = row.assigned_member as { profiles?: { name?: string } } | null;
  const project = row.project as { name?: string } | null;
  const workItem = row.work_item as { name?: string } | null;
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    project_id: String(row.project_id),
    work_item_id: row.work_item_id != null ? String(row.work_item_id) : null,
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    status: row.status as PlannerTodo['status'],
    priority: row.priority as PlannerTodo['priority'],
    assigned_member_id: row.assigned_member_id != null ? String(row.assigned_member_id) : null,
    assigned_user_id: row.assigned_user_id != null ? String(row.assigned_user_id) : null,
    due_date: row.due_date != null ? String(row.due_date).slice(0, 10) : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    sort_order: Number(row.sort_order) || 0,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
    assignee_name: member?.profiles?.name,
    project_name: project?.name,
    work_item_name: workItem?.name,
  };
}

const SELECT_FIELDS = `
  *,
  assigned_member:${MEMBER_PROFILE},
  project:planner_projects(name),
  work_item:planner_work_items(name)
`;

export async function loadTodosForOrg(orgId: string): Promise<PlannerTodo[]> {
  const { data, error } = await supabase
    .from('planner_todos')
    .select(SELECT_FIELDS)
    .eq('org_id', orgId)
    .neq('status', 'cancelled')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  assertNoDbError(error);
  return (data || []).map(r => mapRow(r as Record<string, unknown>));
}

export async function loadTodosForWorkItem(workItemId: string): Promise<PlannerTodo[]> {
  const { data, error } = await supabase
    .from('planner_todos')
    .select(SELECT_FIELDS)
    .eq('work_item_id', workItemId)
    .neq('status', 'cancelled')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  assertNoDbError(error);
  return (data || []).map(r => mapRow(r as Record<string, unknown>));
}

export async function loadTodosForUser(orgId: string, userId: string): Promise<PlannerTodo[]> {
  const { data, error } = await supabase
    .from('planner_todos')
    .select(SELECT_FIELDS)
    .eq('org_id', orgId)
    .eq('assigned_user_id', userId)
    .neq('status', 'cancelled')
    .order('status', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false });
  assertNoDbError(error);
  return (data || []).map(r => mapRow(r as Record<string, unknown>));
}

export async function createTodo(input: PlannerTodoInput): Promise<PlannerTodo> {
  const { data, error } = await supabase
    .from('planner_todos')
    .insert({
      ...input,
      status: input.status || 'pending',
      priority: input.priority || 'medium',
      tags: input.tags || [],
      sort_order: input.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    })
    .select(SELECT_FIELDS)
    .single();
  assertNoDbError(error);
  return mapRow(data as Record<string, unknown>);
}

export async function updateTodo(
  id: string,
  patch: Partial<PlannerTodoInput & { status: PlannerTodoStatus }>,
): Promise<PlannerTodo> {
  const { data, error } = await supabase
    .from('planner_todos')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();
  assertNoDbError(error);
  return mapRow(data as Record<string, unknown>);
}

export async function toggleTodoDone(id: string, done: boolean): Promise<PlannerTodo> {
  return updateTodo(id, { status: done ? 'done' : 'pending' });
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from('planner_todos').delete().eq('id', id);
  assertNoDbError(error);
}
