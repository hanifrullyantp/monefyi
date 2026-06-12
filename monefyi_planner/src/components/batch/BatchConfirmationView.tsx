import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ParsedCostLine } from '../../lib/costParser';
import { recontextualizeCostLine } from '../../lib/costParser';
import {
  detectAndSeparateProjects,
  allUnknownsResolved,
  allUnassignedResolved,
  buildBatchExecutionGroups,
  type ProjectDetectionResult,
  type ProjectResolution,
  type BatchDetectionContext,
} from '../../lib/batchProjectDetector';
import type { Project } from '../../store/appStore';
import type { TaggableEntity } from '../../lib/commandTags';
import type { CostRealization } from '../../services/costService';
import { loadCostRealizations } from '../../services/costService';
import { formatRupiah } from '../../utils/projectUi';
import UnknownProjectCard from './UnknownProjectCard';
import ProjectItemsTable from './ProjectItemsTable';
import UnassignedItemsTable from './UnassignedItemsTable';
import GrandSummary from './GrandSummary';
import ItemSplitDialog from './ItemSplitDialog';

export interface BatchConfirmationResult {
  groups: Array<{ projectId: string; projectName: string; items: ParsedCostLine[] }>;
  resolutions: Array<{ mentionedName: string; resolution: ProjectResolution }>;
  canSave: boolean;
}

interface BatchConfirmationViewProps {
  initialItems: ParsedCostLine[];
  projects: Project[];
  aliases: TaggableEntity[];
  context: BatchDetectionContext;
  orgId: string;
  userId: string;
  onItemsChange: (items: ParsedCostLine[]) => void;
  onReadyChange: (canSave: boolean) => void;
  onBuildResult: (result: BatchConfirmationResult) => void;
  onProjectCreated?: (project: Project) => void;
}

export default function BatchConfirmationView({
  initialItems,
  projects,
  aliases,
  context,
  orgId,
  userId,
  onItemsChange,
  onReadyChange,
  onBuildResult,
  onProjectCreated,
}: BatchConfirmationViewProps) {
  const [items, setItems] = useState<ParsedCostLine[]>(initialItems);
  const [detection, setDetection] = useState<ProjectDetectionResult | null>(null);
  const [resolvedUnknowns, setResolvedUnknowns] = useState<Map<string, ProjectResolution>>(new Map());
  const [unassignedAssignments, setUnassignedAssignments] = useState<Map<string, string>>(new Map());
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [costsByProject, setCostsByProject] = useState<Record<string, CostRealization[]>>({});
  const [splitItem, setSplitItem] = useState<ParsedCostLine | null>(null);

  const runDetection = useCallback((lines: ParsedCostLine[]) => {
    const result = detectAndSeparateProjects(lines, context, projects, aliases);
    setDetection(result);
    setResolvedUnknowns(new Map());
    setUnassignedAssignments(new Map());
    setIgnoredIds(new Set());
  }, [context, projects, aliases]);

  useEffect(() => {
    setItems(initialItems);
    runDetection(initialItems);
  }, [initialItems, runDetection]);

  const updateItem = (itemId: string, patch: Partial<ParsedCostLine>) => {
    setItems(prev => {
      const next = prev.map(i => i.id === itemId ? { ...i, ...patch } : i);
      onItemsChange(next);
      runDetection(next);
      return next;
    });
  };

  const deleteItem = (itemId: string) => {
    setIgnoredIds(prev => new Set([...prev, itemId]));
    setItems(prev => {
      const next = prev.filter(i => i.id !== itemId);
      onItemsChange(next);
      runDetection(next);
      return next;
    });
  };

  const handleResolveUnknown = (mentionedName: string, resolution: ProjectResolution) => {
    setResolvedUnknowns(prev => {
      const next = new Map(prev);
      next.set(mentionedName.toLowerCase(), resolution);
      return next;
    });

    if (resolution.action === 'not_project_keyword' && resolution.recontextText && detection) {
      const ug = detection.unknownProjects.find(u => u.mentionedName.toLowerCase() === mentionedName.toLowerCase());
      if (ug) {
        setItems(prev => {
          const next = prev.map(line => {
            if (!ug.items.some(u => u.id === line.id)) return line;
            return recontextualizeCostLine(line, resolution.recontextText!);
          });
          onItemsChange(next);
          setTimeout(() => runDetection(next), 0);
          return next;
        });
      }
    }
  };

  const handleProjectCreated = (project: Project, mentionedName: string) => {
    onProjectCreated?.(project);
    handleResolveUnknown(mentionedName, {
      action: 'created_new',
      projectId: project.id,
      projectName: project.name,
      addAsAlias: true,
    });
  };

  const activeItems = useMemo(
    () => items.filter(i => !ignoredIds.has(i.id)),
    [items, ignoredIds],
  );

  const canSave = useMemo(() => {
    if (!detection) return false;
    if (!allUnknownsResolved(detection, resolvedUnknowns)) return false;
    if (!allUnassignedResolved(detection, unassignedAssignments, ignoredIds)) return false;
    return activeItems.length > 0;
  }, [detection, resolvedUnknowns, unassignedAssignments, ignoredIds, activeItems]);

  useEffect(() => {
    onReadyChange(canSave);
    if (!detection) return;

    const groups = buildBatchExecutionGroups(
      detection,
      resolvedUnknowns,
      unassignedAssignments,
      ignoredIds,
      projects,
    );

    const resolutions = Array.from(resolvedUnknowns.entries()).map(([k, resolution]) => ({
      mentionedName: k,
      resolution,
    }));

    onBuildResult({ groups, resolutions, canSave });
  }, [canSave, detection, resolvedUnknowns, unassignedAssignments, ignoredIds, projects, onReadyChange, onBuildResult]);

  useEffect(() => {
    if (!detection) return;
    const ids = detection.knownProjects.map(g => g.projectId);
    const resolvedIds = Array.from(resolvedUnknowns.values())
      .map(r => r.projectId)
      .filter(Boolean) as string[];
    const unique = [...new Set([...ids, ...resolvedIds])];
    let cancelled = false;
    Promise.all(
      unique.map(async id => {
        const costs = await loadCostRealizations(id).catch(() => []);
        return { id, costs };
      }),
    ).then(rows => {
      if (cancelled) return;
      const map: Record<string, CostRealization[]> = {};
      for (const row of rows) map[row.id] = row.costs;
      setCostsByProject(map);
    });
    return () => { cancelled = true; };
  }, [detection, resolvedUnknowns]);

  const handleSplit = (parts: Array<{ projectId: string; amount: number }>) => {
    if (!splitItem) return;
    const newLines: ParsedCostLine[] = parts.map((part, idx) => ({
      ...splitItem,
      id: `${splitItem.id}-split-${idx}`,
      total: part.amount,
      unitPrice: part.amount,
      quantity: 1,
      isMultiProject: false,
    }));
    setItems(prev => {
      const without = prev.filter(i => i.id !== splitItem.id);
      const next = [...without, ...newLines];
      onItemsChange(next);
      runDetection(next);
      return next;
    });
    setSplitItem(null);
  };

  if (!detection) return null;

  const previewTotal = activeItems.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        Preview {activeItems.length} biaya · Total {formatRupiah(previewTotal)}
      </div>

      {detection.unknownProjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            Project Tidak Dikenal — Perlu Konfirmasi
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 rounded-full">
              {detection.unknownProjects.filter(u => !resolvedUnknowns.has(u.mentionedName.toLowerCase())).length} belum selesai
            </span>
          </div>
          {detection.unknownProjects.map(ug => (
            <UnknownProjectCard
              key={ug.mentionedName}
              unknownProject={ug}
              projects={projects}
              orgId={orgId}
              userId={userId}
              isResolved={resolvedUnknowns.has(ug.mentionedName.toLowerCase())}
              resolvedValue={resolvedUnknowns.get(ug.mentionedName.toLowerCase())}
              onResolve={res => handleResolveUnknown(ug.mentionedName, res)}
              onProjectCreated={handleProjectCreated}
            />
          ))}
        </div>
      )}

      {detection.knownProjects.map(pg => (
        <ProjectItemsTable
          key={pg.projectId}
          projectId={pg.projectId}
          projectName={pg.projectName}
          items={pg.items.filter(i => !ignoredIds.has(i.id))}
          totalAmount={pg.items.filter(i => !ignoredIds.has(i.id)).reduce((s, i) => s + i.total, 0)}
          existingCosts={costsByProject[pg.projectId] || []}
          onItemChange={updateItem}
          onItemDelete={deleteItem}
          onItemSplit={line => setSplitItem(line)}
        />
      ))}

      {detection.unknownProjects
        .filter(ug => resolvedUnknowns.has(ug.mentionedName.toLowerCase()))
        .map(ug => {
          const resolved = resolvedUnknowns.get(ug.mentionedName.toLowerCase())!;
          if (!resolved.projectId || !resolved.projectName) return null;
          return (
            <ProjectItemsTable
              key={`resolved-${ug.mentionedName}`}
              projectId={resolved.projectId}
              projectName={resolved.projectName}
              items={ug.items.filter(i => !ignoredIds.has(i.id))}
              totalAmount={ug.items.filter(i => !ignoredIds.has(i.id)).reduce((s, i) => s + i.total, 0)}
              existingCosts={costsByProject[resolved.projectId] || []}
              badge="Dipetakan"
              onItemChange={updateItem}
              onItemDelete={deleteItem}
              onItemSplit={line => setSplitItem(line)}
            />
          );
        })}

      <UnassignedItemsTable
        items={detection.unassignedItems.items.filter(i => !ignoredIds.has(i.id))}
        totalAmount={detection.unassignedItems.items
          .filter(i => !ignoredIds.has(i.id))
          .reduce((s, i) => s + i.total, 0)}
        suggestedProjects={detection.unassignedItems.suggestedProjects}
        projects={projects}
        assignments={unassignedAssignments}
        onAssignAll={projectId => {
          setUnassignedAssignments(prev => {
            const next = new Map(prev);
            detection.unassignedItems.items.forEach(item => {
              if (!ignoredIds.has(item.id)) next.set(item.id, projectId);
            });
            return next;
          });
        }}
        onItemAssign={(itemId, projectId) => {
          setUnassignedAssignments(prev => {
            const next = new Map(prev);
            next.set(itemId, projectId);
            return next;
          });
        }}
        onItemChange={updateItem}
        onItemDelete={deleteItem}
      />

      <GrandSummary
        detection={detection}
        resolvedUnknowns={resolvedUnknowns}
        allItems={activeItems}
      />

      {!canSave && (
        <p className="text-xs text-amber-700 font-medium">
          Selesaikan konfirmasi project dan assign item yang belum punya project sebelum menyimpan.
        </p>
      )}

      {splitItem && (
        <ItemSplitDialog
          item={splitItem}
          projects={projects}
          onConfirm={handleSplit}
          onCancel={() => setSplitItem(null)}
        />
      )}
    </div>
  );
}
