import { toCommandLog, type DbCommandLog } from '../lib/adapters';
import { config } from '../lib/config';
import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';

export async function loadCommandLogs(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('planner_command_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data || []) as DbCommandLog[]).map(toCommandLog);
}

export async function logCommand(entry: {
  userId: string;
  orgId?: string;
  inputType: 'voice' | 'text';
  rawInput: string;
  parsedIntent?: string;
  parsedParams?: Record<string, unknown>;
  confidence?: number;
  executionStatus: 'executed' | 'failed' | 'pending' | 'needs_review';
  errorMessage?: string;
  executionResult?: Record<string, unknown>;
  wasCorrected?: boolean;
  correctionData?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('planner_command_logs').insert({
    user_id: entry.userId,
    org_id: entry.orgId,
    input_type: entry.inputType,
    raw_input: entry.rawInput,
    parsed_intent: entry.parsedIntent,
    parsed_params: entry.parsedParams,
    confidence: entry.confidence,
    execution_status: entry.executionStatus,
    error_message: entry.errorMessage,
    execution_result: entry.executionResult ?? null,
    was_corrected: entry.wasCorrected ?? false,
    correction_data: entry.correctionData ?? null,
  });
  assertNoDbError(error);
}

/** Most recently logged project for an org (from command logs with project in params). */
export async function getRecentProjectId(orgId: string): Promise<string | null> {
  if (!orgId) return null;
  const { data, error } = await supabase
    .from('planner_command_logs')
    .select('parsed_params')
    .eq('org_id', orgId)
    .eq('execution_status', 'executed')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data?.length) return null;

  for (const row of data) {
    const params = row.parsed_params as Record<string, unknown> | null;
    if (!params) continue;
    const groups = params.groups as Array<{ projectId?: string }> | undefined;
    if (groups?.[0]?.projectId) return groups[0].projectId;
    const projectName = params.projectName as string | undefined;
    if (projectName) {
      const { data: proj } = await supabase
        .from('planner_projects')
        .select('id')
        .eq('org_id', orgId)
        .ilike('name', projectName)
        .limit(1)
        .maybeSingle();
      if (proj?.id) return proj.id as string;
    }
  }
  return null;
}

export async function invokeAiParse(
  input: string,
  context: Record<string, unknown>,
) {
  return supabase.functions.invoke(config.fnParseCommand, { body: { input, context } });
}
