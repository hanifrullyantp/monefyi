import { finalizeParams } from './commandNormalize';
import { parseCommand, aiParseCommand, type PipelineContext } from './commandParser';
import { parseCostText } from './costParser';
import { preprocessInput, type PreprocessedInput } from './commandPreprocessor';
import { applyProgressTagHints } from './commandTags';
import type { TaggableEntity } from './commandTags';
import { lookupMemory, lookupFuzzyMemory } from '../services/commandMemoryService';
import { looksLikeLeadForm, parseLeadForm } from './leadFormParser';

export type PipelineSource = 'memory' | 'rule' | 'fuzzy' | 'ai' | 'fallback';

export type PipelineStage = 'memory' | 'rule' | 'fuzzy' | 'ai';

export interface PipelineResult {
  intent: string;
  params: Record<string, unknown>;
  confidence: number;
  raw: string;
  source: PipelineSource;
  layer: number;
  reasoning?: string;
  memoryId?: string;
  memoryHitCount?: number;
  provider?: string;
  preprocessed: PreprocessedInput;
}

function createEmergencyFallback(
  rawInput: string,
  preprocessed: PreprocessedInput,
  message?: string,
): PipelineResult {
  return {
    intent: 'record_cost',
    params: {},
    confidence: 0.35,
    raw: rawInput,
    source: 'fallback',
    layer: 4,
    reasoning: message || 'Sistem tidak yakin — silakan isi form di bawah lalu catat.',
    preprocessed,
  };
}

function applyTagHints(
  preprocessed: PreprocessedInput,
  parsed: { intent: string; params: Record<string, unknown>; confidence: number },
): { intent: string; params: Record<string, unknown>; confidence: number } {
  const { hints } = preprocessed.tagResult;
  let params = { ...parsed.params };
  if (hints.projectName) params = { ...params, projectName: hints.projectName };
  if (hints.rapName && !params.item) params = { ...params, item: hints.rapName };
  if (hints.workerName && !params.source) params = { ...params, source: hints.workerName };

  const boosted = applyProgressTagHints(preprocessed.parseText, hints, {
    intent: parsed.intent,
    params,
    confidence: parsed.confidence,
  });

  return boosted;
}

/**
 * Never-fail parsing pipeline: memory → rules/batch → fuzzy memory → AI/fallback.
 * Always returns a result suitable for the confirmation UI.
 */
export async function runNeverFailPipeline(
  rawInput: string,
  context: PipelineContext,
  taggables: TaggableEntity[],
  onStage?: (stage: PipelineStage) => void,
): Promise<PipelineResult> {
  const preprocessed = preprocessInput(rawInput, taggables);

  // Layer 1 — exact memory
  onStage?.('memory');
  if (context.orgId) {
    try {
      const match = await lookupMemory(context.orgId, preprocessed.parseText);
      if (match) {
        const applied = applyTagHints(preprocessed, {
          intent: match.intent,
          params: finalizeParams(match.params),
          confidence: 0.95,
        });
        return {
          ...applied,
          raw: rawInput,
          source: 'memory',
          layer: 1,
          memoryId: match.memoryId,
          memoryHitCount: match.hitCount,
          preprocessed,
        };
      }
    } catch (e) {
      console.warn('Memory lookup failed:', e);
    }
  }

  // Layer 2 — lead form (konsultasi / WhatsApp) sebelum parser biaya
  onStage?.('rule');
  const leadSource = looksLikeLeadForm(preprocessed.original)
    ? preprocessed.original
    : looksLikeLeadForm(preprocessed.parseText)
      ? preprocessed.parseText
      : null;
  if (leadSource) {
    const lead = parseLeadForm(leadSource, context.leadTargetHint);
    if (lead) {
      return {
        intent: 'create_lead',
        params: lead,
        confidence: 0.93,
        raw: rawInput,
        source: 'rule',
        layer: 2,
        reasoning:
          lead.target === 'project'
            ? 'Form lead terdeteksi — akan dibuat proyek baru.'
            : 'Form lead terdeteksi — akan dibuat estimasi baru.',
        preprocessed,
      };
    }
  }

  const batchFromRaw = parseCostText(preprocessed.original);
  if (batchFromRaw.length > 0) {
    return {
      intent: 'record_cost_batch',
      params: { items: batchFromRaw },
      confidence: 0.9,
      raw: rawInput,
      source: 'rule',
      layer: 2,
      preprocessed,
    };
  }

  const batchFromClean = parseCostText(preprocessed.parseText);
  if (batchFromClean.length > 0) {
    return {
      intent: 'record_cost_batch',
      params: { items: batchFromClean },
      confidence: 0.9,
      raw: rawInput,
      source: 'rule',
      layer: 2,
      preprocessed,
    };
  }

  const ruleResult = parseCommand(preprocessed.parseText);
  if (ruleResult.intent !== 'unknown' && ruleResult.confidence >= 0.75) {
    const applied = applyTagHints(preprocessed, ruleResult);
    return {
      ...applied,
      raw: rawInput,
      source: 'rule',
      layer: 2,
      preprocessed,
    };
  }

  // Layer 3 — fuzzy memory
  onStage?.('fuzzy');
  if (context.orgId) {
    try {
      const fuzzy = await lookupFuzzyMemory(context.orgId, preprocessed.parseText);
      if (fuzzy) {
        const applied = applyTagHints(preprocessed, {
          intent: fuzzy.intent,
          params: finalizeParams(fuzzy.params),
          confidence: fuzzy.confidence,
        });
        return {
          ...applied,
          raw: rawInput,
          source: 'fuzzy',
          layer: 3,
          memoryId: fuzzy.memoryId,
          reasoning: `Mirip perintah yang sering dipakai tim (${Math.round(fuzzy.similarity * 100)}% cocok).`,
          preprocessed,
        };
      }
    } catch (e) {
      console.warn('Fuzzy memory lookup failed:', e);
    }
  }

  // Layer 4 — AI (always produces output)
  onStage?.('ai');
  const aiResult = await aiParseCommand(preprocessed.parseText, context);

  if (aiResult && aiResult.intent !== 'unknown') {
    const applied = applyTagHints(preprocessed, aiResult);
    return {
      ...applied,
      raw: rawInput,
      source: 'ai',
      layer: 4,
      reasoning: aiResult.reasoning,
      memoryId: aiResult.memoryId,
      provider: aiResult.provider,
      preprocessed,
    };
  }

  // Use weak rule match if any
  if (ruleResult.intent !== 'unknown') {
    const applied = applyTagHints(preprocessed, {
      ...ruleResult,
      confidence: Math.max(ruleResult.confidence, 0.45),
    });
    return {
      ...applied,
      raw: rawInput,
      source: 'rule',
      layer: 2,
      reasoning: 'Interpretasi aturan dengan confidence rendah — mohon koreksi sebelum catat.',
      preprocessed,
    };
  }

  return createEmergencyFallback(
    rawInput,
    preprocessed,
    aiResult?.reasoning,
  );
}
