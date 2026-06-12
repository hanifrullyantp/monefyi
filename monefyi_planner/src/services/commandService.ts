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

export async function invokeAiParse(
  input: string,
  context: Record<string, unknown>,
) {
  return supabase.functions.invoke(config.fnParseCommand, { body: { input, context } });
}
