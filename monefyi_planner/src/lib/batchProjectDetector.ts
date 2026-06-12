import type { ParsedCostLine } from './costParser';
import {
  extractProjectKeywords,
  pickPrimaryProjectKeyword,
  type ProjectKeywordHit,
} from './batchProjectKeywords';
import { combinedSimilarity } from './textSimilarity';
import type { TaggableEntity } from './commandTags';
import type { Project } from '../store/appStore';

export interface SimilarProject {
  id: string;
  name: string;
  similarity: number;
}

export interface KnownProjectGroup {
  projectId: string;
  projectName: string;
  items: ParsedCostLine[];
  totalAmount: number;
}

export interface UnknownProjectGroup {
  mentionedName: string;
  similarProjects: SimilarProject[];
  items: ParsedCostLine[];
  totalAmount: number;
  suggestedAction: 'create_new' | 'map_to_existing' | 'ask_user';
}

export interface SuggestedProject {
  id: string;
  name: string;
  reason: string;
}

export interface UserInputRequired {
  type: 'unknown_project' | 'ambiguous_project' | 'unassigned';
  mentionedName?: string;
  question: string;
  options: string[];
}

export interface ProjectDetectionResult {
  knownProjects: KnownProjectGroup[];
  unknownProjects: UnknownProjectGroup[];
  unassignedItems: {
    items: ParsedCostLine[];
    totalAmount: number;
    suggestedProjects: SuggestedProject[];
  };
  pendingItems: ParsedCostLine[];
  ignoredItemIds: string[];
  totalProjects: number;
  totalItems: number;
  totalAmount: number;
  requiresUserInput: boolean;
  userInputRequired: UserInputRequired[];
}

export interface BatchDetectionContext {
  orgId?: string;
  currentProjectId?: string | null;
  recentProjectId?: string | null;
}

export interface ProjectResolution {
  action:
    | 'map_existing'
    | 'created_new'
    | 'mark_operational'
    | 'ignore'
    | 'not_project_keyword'
    | 'assign_anyway';
  projectId?: string;
  projectName?: string;
  addAsAlias?: boolean;
  whatIsThis?: string;
  recontextText?: string;
}

const KNOWN_THRESHOLD = 0.85;
const AMBIGUOUS_THRESHOLD = 0.5;

function sumAmount(items: ParsedCostLine[]): number {
  return items.reduce((s, i) => s + (Number(i.total) || 0), 0);
}

function findBestProjectMatch(
  keyword: string,
  projects: Project[],
  aliases: TaggableEntity[],
): { project: Project | null; similarity: number } {
  let best: { project: Project; similarity: number } | null = null;

  for (const p of projects) {
    const sim = combinedSimilarity(keyword, p.name);
    if (!best || sim > best.similarity) {
      best = { project: p, similarity: sim };
    }
  }

  for (const a of aliases) {
    if (a.type !== 'project' || !a.id) continue;
    const aliasKey = (a.alias || a.name).toLowerCase();
    if (aliasKey.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(aliasKey)) {
      const p = projects.find(pr => pr.id === a.id);
      if (p) {
        const sim = Math.max(0.88, combinedSimilarity(keyword, p.name));
        if (!best || sim > best.similarity) best = { project: p, similarity: sim };
      }
    }
  }

  return best
    ? { project: best.project, similarity: best.similarity }
    : { project: null, similarity: 0 };
}

function rankSimilarProjects(keyword: string, projects: Project[]): SimilarProject[] {
  return projects
    .map(p => ({
      id: p.id,
      name: p.name,
      similarity: combinedSimilarity(keyword, p.name),
    }))
    .filter(p => p.similarity >= 0.4)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

function detectProjectForItem(
  item: ParsedCostLine,
  projects: Project[],
  aliases: TaggableEntity[],
): {
  keyword: ProjectKeywordHit | null;
  matchedProject: Project | null;
  similarity: number;
} {
  const text = item.rawText || item.item;
  const keyword = pickPrimaryProjectKeyword(text);
  if (!keyword) {
    return { keyword: null, matchedProject: null, similarity: 0 };
  }

  if (keyword.isAmbiguous) {
    return { keyword, matchedProject: null, similarity: 0 };
  }

  const { project, similarity } = findBestProjectMatch(keyword.keyword, projects, aliases);
  return { keyword, matchedProject: project, similarity };
}

/**
 * Detect and separate batch lines by project mentions.
 */
export function detectAndSeparateProjects(
  parsedItems: ParsedCostLine[],
  context: BatchDetectionContext,
  availableProjects: Project[],
  aliases: TaggableEntity[] = [],
): ProjectDetectionResult {
  const knownMap = new Map<string, KnownProjectGroup>();
  const unknownMap = new Map<string, UnknownProjectGroup>();
  const unassigned: ParsedCostLine[] = [];
  const pending: ParsedCostLine[] = [];
  const userInputRequired: UserInputRequired[] = [];

  for (const item of parsedItems) {
    const { keyword, matchedProject, similarity } = detectProjectForItem(
      item,
      availableProjects,
      aliases,
    );

    const enriched: ParsedCostLine = {
      ...item,
      mentionedProject: keyword?.keyword,
      projectHintConfidence: keyword?.confidence ?? 0,
    };

    if (!keyword) {
      unassigned.push(enriched);
      continue;
    }

    if (keyword.isAmbiguous) {
      const key = keyword.keyword.toLowerCase();
      const existing = unknownMap.get(key);
      if (existing) {
        existing.items.push(enriched);
        existing.totalAmount = sumAmount(existing.items);
      } else {
        unknownMap.set(key, {
          mentionedName: keyword.keyword,
          similarProjects: rankSimilarProjects(keyword.keyword, availableProjects),
          items: [enriched],
          totalAmount: enriched.total,
          suggestedAction: 'ask_user',
        });
      }
      pending.push(enriched);
      continue;
    }

    if (matchedProject && similarity >= KNOWN_THRESHOLD) {
      const gid = matchedProject.id;
      const group = knownMap.get(gid);
      if (group) {
        group.items.push(enriched);
        group.totalAmount = sumAmount(group.items);
      } else {
        knownMap.set(gid, {
          projectId: matchedProject.id,
          projectName: matchedProject.name,
          items: [enriched],
          totalAmount: enriched.total,
        });
      }
      continue;
    }

    if (matchedProject && similarity >= AMBIGUOUS_THRESHOLD) {
      const key = keyword.keyword.toLowerCase();
      const existing = unknownMap.get(key);
      if (existing) {
        existing.items.push(enriched);
        existing.totalAmount = sumAmount(existing.items);
      } else {
        unknownMap.set(key, {
          mentionedName: keyword.keyword,
          similarProjects: rankSimilarProjects(keyword.keyword, availableProjects),
          items: [enriched],
          totalAmount: enriched.total,
          suggestedAction: 'ask_user',
        });
        userInputRequired.push({
          type: 'ambiguous_project',
          mentionedName: keyword.keyword,
          question: `"${keyword.keyword}" — apakah ini salah satu project yang sudah ada, atau project baru?`,
          options: rankSimilarProjects(keyword.keyword, availableProjects).map(p => p.name),
        });
      }
      pending.push(enriched);
      continue;
    }

    const key = keyword.keyword.toLowerCase();
    const existing = unknownMap.get(key);
    if (existing) {
      existing.items.push(enriched);
      existing.totalAmount = sumAmount(existing.items);
    } else {
      unknownMap.set(key, {
        mentionedName: keyword.keyword,
        similarProjects: rankSimilarProjects(keyword.keyword, availableProjects),
        items: [enriched],
        totalAmount: enriched.total,
        suggestedAction: 'create_new',
      });
      userInputRequired.push({
        type: 'unknown_project',
        mentionedName: keyword.keyword,
        question: `"${keyword.keyword}" tidak ditemukan di daftar project. Ini project baru?`,
        options: [
          `Buat project "${keyword.keyword}"`,
          'Petakan ke project existing',
          'Bukan nama project',
          'Abaikan',
        ],
      });
    }
    pending.push(enriched);
  }

  const suggestedProjects: SuggestedProject[] = [];
  if (context.currentProjectId) {
    const current = availableProjects.find(p => p.id === context.currentProjectId);
    if (current) {
      suggestedProjects.push({
        id: current.id,
        name: current.name,
        reason: 'Project yang sedang dibuka',
      });
    }
  }
  if (context.recentProjectId) {
    const recent = availableProjects.find(p => p.id === context.recentProjectId);
    if (recent && !suggestedProjects.some(s => s.id === recent.id)) {
      suggestedProjects.push({
        id: recent.id,
        name: recent.name,
        reason: 'Project yang baru-baru ini digunakan',
      });
    }
  }

  const knownProjects = Array.from(knownMap.values());
  const unknownProjects = Array.from(unknownMap.values());
  const unassignedItems = {
    items: unassigned,
    totalAmount: sumAmount(unassigned),
    suggestedProjects,
  };

  return {
    knownProjects,
    unknownProjects,
    unassignedItems,
    pendingItems: pending,
    ignoredItemIds: [],
    totalProjects: knownProjects.length + unknownProjects.length,
    totalItems: parsedItems.length,
    totalAmount: sumAmount(parsedItems),
    requiresUserInput: unknownProjects.length > 0 || unassigned.length > 0,
    userInputRequired,
  };
}

/** Build execution groups from detection + resolutions. */
export function buildBatchExecutionGroups(
  detection: ProjectDetectionResult,
  resolvedUnknowns: Map<string, ProjectResolution>,
  unassignedAssignments: Map<string, string>,
  ignoredIds: Set<string>,
  projects: Project[],
): Array<{ projectId: string; projectName: string; items: ParsedCostLine[] }> {
  const groupMap = new Map<string, { projectId: string; projectName: string; items: ParsedCostLine[] }>();

  const addToGroup = (projectId: string, projectName: string, item: ParsedCostLine) => {
    if (ignoredIds.has(item.id)) return;
    const g = groupMap.get(projectId);
    if (g) g.items.push(item);
    else groupMap.set(projectId, { projectId, projectName, items: [item] });
  };

  for (const kg of detection.knownProjects) {
    for (const item of kg.items) {
      addToGroup(kg.projectId, kg.projectName, item);
    }
  }

  for (const ug of detection.unknownProjects) {
    const resolution = resolvedUnknowns.get(ug.mentionedName.toLowerCase());
    if (!resolution || resolution.action === 'ignore') {
      for (const item of ug.items) {
        if (!resolution) continue;
        ignoredIds.add(item.id);
      }
      continue;
    }
    if (resolution.action === 'not_project_keyword') {
      continue;
    }
    if (resolution.projectId && resolution.projectName) {
      for (const item of ug.items) {
        addToGroup(resolution.projectId, resolution.projectName, item);
      }
    }
  }

  for (const item of detection.unassignedItems.items) {
    const pid = unassignedAssignments.get(item.id);
    if (!pid) continue;
    const p = projects.find(pr => pr.id === pid);
    if (p) addToGroup(p.id, p.name, item);
  }

  return Array.from(groupMap.values()).filter(g => g.items.length > 0);
}

export function allUnknownsResolved(
  detection: ProjectDetectionResult,
  resolvedUnknowns: Map<string, ProjectResolution>,
): boolean {
  return detection.unknownProjects.every(ug =>
    resolvedUnknowns.has(ug.mentionedName.toLowerCase()),
  );
}

export function allUnassignedResolved(
  detection: ProjectDetectionResult,
  unassignedAssignments: Map<string, string>,
  ignoredIds: Set<string>,
): boolean {
  return detection.unassignedItems.items.every(
    item => unassignedAssignments.has(item.id) || ignoredIds.has(item.id),
  );
}
