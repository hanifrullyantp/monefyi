import type { ProjectDetectionResult, ProjectResolution, OrgOperationalGroup } from '../../lib/batchProjectDetector';
import type { ParsedCostLine } from '../../lib/costParser';
import { formatRupiah } from '../../utils/projectUi';

interface GrandSummaryProps {
  detection: ProjectDetectionResult;
  resolvedUnknowns: Map<string, ProjectResolution>;
  orgGroups: OrgOperationalGroup[];
  allItems: ParsedCostLine[];
}

function categoryTotals(items: ParsedCostLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const cat = item.category || 'Lainnya';
    out[cat] = (out[cat] || 0) + (Number(item.total) || 0);
  }
  return out;
}

export default function GrandSummary({
  detection,
  resolvedUnknowns,
  orgGroups,
  allItems,
}: GrandSummaryProps) {
  const grandTotal = allItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const cats = categoryTotals(allItems);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <h4 className="text-sm font-bold text-slate-800">Ringkasan Total</h4>

      <div className="space-y-1.5">
        {detection.knownProjects.map(pg => (
          <div key={pg.projectId} className="flex justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {pg.projectName}
              <span className="text-slate-400">{pg.items.length} item</span>
            </span>
            <span className="font-semibold">{formatRupiah(pg.totalAmount)}</span>
          </div>
        ))}

        {detection.unknownProjects.map(ug => {
          const resolved = resolvedUnknowns.get(ug.mentionedName.toLowerCase());
          return (
            <div key={ug.mentionedName} className="flex justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${resolved ? 'bg-blue-500' : 'bg-amber-500'}`} />
                {resolved && (resolved.action === 'org_operational' || resolved.action === 'mark_operational')
                  ? resolved.orgLabel || 'Organisasi'
                  : resolved.projectName || ug.mentionedName}
                {!resolved && <span className="text-amber-600 font-semibold">perlu konfirmasi</span>}
                <span className="text-slate-400">{ug.items.length} item</span>
              </span>
              <span className={`font-semibold ${!resolved ? 'text-amber-700' : ''}`}>
                {formatRupiah(ug.totalAmount)}
              </span>
            </div>
          );
        })}

        {orgGroups.map(og => (
          <div key={og.label} className="flex justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {og.label}
              <span className="text-slate-400">{og.items.length} item · organisasi</span>
            </span>
            <span className="font-semibold">{formatRupiah(og.totalAmount)}</span>
          </div>
        ))}

        {detection.unassignedItems.items.length > 0 && (
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Belum diassign
              <span className="text-slate-400">{detection.unassignedItems.items.length} item</span>
            </span>
            <span className="font-semibold">{formatRupiah(detection.unassignedItems.totalAmount)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center border-t border-slate-200 pt-3">
        <span className="font-bold text-slate-800">Grand Total</span>
        <span className="font-black text-lg text-emerald-700">{formatRupiah(grandTotal)}</span>
      </div>

      {Object.keys(cats).length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] text-slate-500">Breakdown kategori:</p>
          {Object.entries(cats).map(([cat, amt]) => (
            <div key={cat} className="flex items-center gap-2 text-xs">
              <span className="w-20 truncate">{cat}</span>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${grandTotal > 0 ? (amt / grandTotal) * 100 : 0}%` }}
                />
              </div>
              <span className="font-medium w-20 text-right">{formatRupiah(amt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
