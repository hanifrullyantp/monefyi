import { normalizeInput } from './commandNormalize';
import { resolveTags, type TagParseResult } from './commandTags';
import { parseCostText } from './costParser';
import type { TaggableEntity } from './commandTags';

export type DetectedFormat = 'single' | 'batch' | 'whatsapp' | 'unknown';

export interface PreprocessedInput {
  original: string;
  normalized: string;
  parseText: string;
  tagResult: TagParseResult;
  detectedFormat: DetectedFormat;
  preConfidence: number;
}

function detectInputFormat(input: string): DetectedFormat {
  if (/duit\s+keluar/i.test(input) || /^\d{1,2}\/\d{1,2}/m.test(input)) {
    return 'whatsapp';
  }
  const lines = input.split(/\n/).filter(l => l.trim());
  if (lines.length >= 3) return 'batch';
  if (lines.length === 1) return 'single';
  if (parseCostText(input).length > 0) return 'whatsapp';
  return 'unknown';
}

function calculatePreConfidence(
  normalized: string,
  hints: TagParseResult['hints'],
  format: DetectedFormat,
): number {
  let confidence = 0.5;
  if (hints.projectName || hints.projectId) confidence += 0.15;
  if (format !== 'unknown') confidence += 0.1;
  const intentKeywords = ['catat', 'bayar', 'beli', 'terima', 'update', 'progress', 'cek', 'buka'];
  if (intentKeywords.some(kw => normalized.includes(kw))) confidence += 0.15;
  if (/\d+/.test(normalized)) confidence += 0.1;
  return Math.min(confidence, 1);
}

export function preprocessInput(
  rawInput: string,
  taggables: TaggableEntity[],
): PreprocessedInput {
  const original = rawInput.trim();
  const tagResult = resolveTags(original, taggables);
  const parseText = tagResult.cleanText || original;
  const normalized = normalizeInput(parseText.replace(/\n/g, ' '));
  const detectedFormat = detectInputFormat(original);

  return {
    original,
    normalized,
    parseText,
    tagResult,
    detectedFormat,
    preConfidence: calculatePreConfidence(normalized, tagResult.hints, detectedFormat),
  };
}
