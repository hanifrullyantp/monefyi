import { supabase } from '../lib/supabase';
import {
  buildSlots,
  buildParamsTemplate,
  applyTemplate,
  normalizeInput,
  type ParamsTemplate,
} from '../lib/commandNormalize';
import { combinedSimilarity } from '../lib/textSimilarity';

export interface CommandMemory {
  id: string;
  org_id: string;
  signature: string;
  raw_sample: string | null;
  intent: string;
  params_template: ParamsTemplate;
  source: 'user' | 'ai';
  hit_count: number;
  accuracy_score: number;
  last_used_at: string | null;
}

export interface MemoryMatch {
  intent: string;
  params: Record<string, unknown>;
  signature: string;
  source: 'user' | 'ai';
  hitCount: number;
  accuracyScore: number;
  memoryId: string;
}

const FUZZY_THRESHOLD = 0.72;
const FUZZY_MEMORY_LIMIT = 80;

export interface FuzzyMemoryMatch extends MemoryMatch {
  confidence: number;
  similarity: number;
}

/** Fuzzy match against recent org memories when exact signature misses. */
export async function lookupFuzzyMemory(
  orgId: string,
  rawInput: string,
): Promise<FuzzyMemoryMatch | null> {
  if (!orgId || !rawInput.trim()) return null;

  const normalized = normalizeInput(rawInput.replace(/\n/g, ' '));

  const { data, error } = await supabase
    .from('planner_command_memory')
    .select('*')
    .eq('org_id', orgId)
    .order('hit_count', { ascending: false })
    .limit(FUZZY_MEMORY_LIMIT);

  if (error || !data?.length) return null;

  let best: { mem: CommandMemory; similarity: number } | null = null;

  for (const row of data as CommandMemory[]) {
    const sample = row.raw_sample || '';
    if (!sample) continue;
    const sim = combinedSimilarity(normalized, normalizeInput(sample.replace(/\n/g, ' ')));
    if (sim >= FUZZY_THRESHOLD && (!best || sim > best.similarity)) {
      best = { mem: row, similarity: sim };
    }
  }

  if (!best) return null;

  const slots = buildSlots(rawInput);
  const params = slots.signature
    ? applyTemplate(best.mem.params_template || {}, slots)
    : (best.mem.params_template as Record<string, unknown>);

  const accuracy = Number(best.mem.accuracy_score) || 0.75;
  const confidence = Math.min(0.92, accuracy * best.similarity * 0.85);

  return {
    intent: best.mem.intent,
    params,
    signature: best.mem.signature,
    source: best.mem.source,
    hitCount: best.mem.hit_count,
    accuracyScore: accuracy,
    memoryId: best.mem.id,
    confidence,
    similarity: best.similarity,
  };
}

/** Look up a learned correction for the given raw input within an org. */
export async function lookupMemory(
  orgId: string,
  rawInput: string,
): Promise<MemoryMatch | null> {
  if (!orgId || !rawInput.trim()) return null;

  const slots = buildSlots(rawInput);
  if (!slots.signature) return null;

  const { data, error } = await supabase
    .from('planner_command_memory')
    .select('*')
    .eq('org_id', orgId)
    .eq('signature', slots.signature)
    .order('accuracy_score', { ascending: false })
    .order('hit_count', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const mem = data as CommandMemory;
  return {
    intent: mem.intent,
    params: applyTemplate(mem.params_template || {}, slots),
    signature: mem.signature,
    source: mem.source,
    hitCount: mem.hit_count,
    accuracyScore: Number(mem.accuracy_score),
    memoryId: mem.id,
  };
}

/**
 * Store (or reinforce) a learned correction for an org.
 * Called whenever a user edits a parse or confirms an AI/low-confidence result.
 */
export async function recordCorrection(entry: {
  orgId: string;
  userId: string;
  rawInput: string;
  intent: string;
  params: Record<string, unknown>;
  source: 'user' | 'ai';
}): Promise<void> {
  const { orgId, userId, rawInput, intent, params, source } = entry;
  if (!orgId || !intent || intent === 'unknown') return;

  const slots = buildSlots(rawInput);
  if (!slots.signature) return;

  const template = buildParamsTemplate(params, slots);

  const { data: existing } = await supabase
    .from('planner_command_memory')
    .select('id, hit_count, accuracy_score')
    .eq('org_id', orgId)
    .eq('signature', slots.signature)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('planner_command_memory')
      .update({
        intent,
        params_template: template,
        raw_sample: rawInput,
        source,
        hit_count: (existing.hit_count || 0) + 1,
        accuracy_score: Math.min(1, Number(existing.accuracy_score || 0) + 0.05),
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) console.warn('recordCorrection update failed:', error.message);
    return;
  }

  const { error } = await supabase.from('planner_command_memory').insert({
    org_id: orgId,
    signature: slots.signature,
    raw_sample: rawInput,
    intent,
    params_template: template,
    source,
    created_by: userId,
    hit_count: 1,
    accuracy_score: source === 'user' ? 1.0 : 0.8,
    last_used_at: new Date().toISOString(),
  });
  if (error) console.warn('recordCorrection insert failed:', error.message);
}

/** Increment hit_count when a memory match was used as-is (positive signal). */
export async function reinforceMemory(memoryId: string, hitCount: number): Promise<void> {
  const { error } = await supabase
    .from('planner_command_memory')
    .update({
      hit_count: hitCount + 1,
      accuracy_score: 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', memoryId);
  if (error) console.warn('reinforceMemory failed:', error.message);
}

export interface MemoryExample {
  input: string;
  intent: string;
  params: ParamsTemplate;
}

/** Load top learned examples for few-shot prompting of the AI fallback. */
export async function loadMemoryExamples(
  orgId: string,
  limit = 8,
): Promise<MemoryExample[]> {
  if (!orgId) return [];

  const { data, error } = await supabase
    .from('planner_command_memory')
    .select('raw_sample, intent, params_template, hit_count')
    .eq('org_id', orgId)
    .order('hit_count', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as CommandMemory[])
    .filter(m => m.raw_sample)
    .map(m => ({
      input: m.raw_sample as string,
      intent: m.intent,
      params: m.params_template || {},
    }));
}
