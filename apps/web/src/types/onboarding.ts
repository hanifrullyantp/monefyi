export type MemberRole = 'owner' | 'manager' | 'worker';
export type MemberStatus = 'active' | 'pending' | 'suspended' | 'removed';
export type InvitationType = 'link' | 'email' | 'code';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'daily';

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  position?: string;
  department?: string;
  phone?: string;
  bio?: string;
  employee_id?: string;
  address?: string;
  employment_type?: EmploymentType;
  bank_name?: string;
  bank_account?: string;
  bank_holder?: string;
  joined_at?: string;
  last_active_at?: string;
  profile?: { name?: string; avatar_url?: string };
  email?: string;
}

export interface MemberProfilePatch {
  position?: string;
  department?: string;
  phone?: string;
  bio?: string;
  employee_id?: string;
  address?: string;
  employment_type?: EmploymentType;
  bank_name?: string;
  bank_account?: string;
  bank_holder?: string;
}

export interface InvitationPreview {
  valid: boolean;
  invitation_id?: string;
  org_id?: string;
  org_name?: string;
  org_logo?: string;
  brand_color?: string;
  role?: MemberRole;
  email?: string;
  inviter_name?: string;
  personal_message?: string;
  error?: string;
}

export interface InvitationRecord {
  id: string;
  org_id: string;
  token: string;
  code?: string;
  email?: string;
  role: MemberRole;
  type: InvitationType;
  max_uses: number;
  used_count: number;
  expires_at?: string;
  revoked_at?: string;
  created_at: string;
  join_url?: string;
}

export interface JoinRequest {
  id: string;
  org_id: string;
  user_id: string;
  requested_role: MemberRole;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profile?: { name?: string };
  email?: string;
}

export interface AuditLogEntry {
  id: string;
  org_id?: string;
  user_id?: string;
  action: string;
  target_user_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CompanySearchResult {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  team_size?: string;
  logo_url?: string;
  brand_color?: string;
}
