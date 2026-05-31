import { resolveSupabaseEnv } from './env';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseEnv();

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  fnParseCommand: 'planner-parse-command',
  fnAnalyze: 'planner-analyze',
  fnCreateOwnerOrg: 'planner-create-owner-org',
  fnValidateInvitation: 'planner-validate-invitation',
  fnCreateInvitation: 'planner-create-invitation',
  fnAcceptInvitation: 'planner-accept-invitation',
  fnSendInvitationEmail: 'planner-send-invitation-email',
  fnRevokeInvitation: 'planner-revoke-invitation',
  fnApproveJoinRequest: 'planner-approve-join-request',
  fnRejectJoinRequest: 'planner-reject-join-request',
  fnChangeMemberRole: 'planner-change-member-role',
  fnRemoveMember: 'planner-remove-member',
  fnTransferOwnership: 'planner-transfer-ownership',
  fnSearchCompanies: 'planner-search-companies',
  fnTryDomainJoin: 'planner-try-domain-join',
  appEnv:
    (import.meta.env.VITE_APP_ENV as string) ||
    (import.meta.env.VERCEL_ENV as string) ||
    (import.meta.env.MODE as string) ||
    'development',
  devDemoAuth: import.meta.env.VITE_DEV_DEMO_AUTH === 'true',
  skipEmailVerify: import.meta.env.VITE_SKIP_EMAIL_VERIFY === 'true',
  adminEmails: ['admin@asfin.app', 'hanif.rullyant@gmail.com'],
};

export function assertSupabaseConfig(): void {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      'Supabase belum dikonfigurasi. Set salah satu pasangan env: ' +
        'VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (lokal), atau ' +
        'NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_URL + SUPABASE_ANON_KEY (Vercel + Supabase integration).',
    );
  }
}

export { resolveSupabaseEnv };
