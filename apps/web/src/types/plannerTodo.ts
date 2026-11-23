export type PlannerTodoStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type PlannerTodoPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PlannerTodo {
  id: string;
  org_id: string;
  project_id: string;
  work_item_id?: string | null;
  title: string;
  description?: string | null;
  status: PlannerTodoStatus;
  priority: PlannerTodoPriority;
  assigned_member_id?: string | null;
  assigned_user_id?: string | null;
  due_date?: string | null;
  tags: string[];
  sort_order: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  /** Joined fields */
  assignee_name?: string;
  project_name?: string;
  work_item_name?: string;
}

export type PlannerTodoInput = {
  org_id: string;
  project_id: string;
  work_item_id?: string | null;
  title: string;
  description?: string | null;
  status?: PlannerTodoStatus;
  priority?: PlannerTodoPriority;
  assigned_member_id?: string | null;
  assigned_user_id?: string | null;
  due_date?: string | null;
  tags?: string[];
  sort_order?: number;
  created_by?: string | null;
};
