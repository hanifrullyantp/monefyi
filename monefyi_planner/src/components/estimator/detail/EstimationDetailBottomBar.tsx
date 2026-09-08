import type { ReactNode } from 'react';
import {
  ClipboardList, FileText, Loader2, MessageCircle, Redo2, Save, Undo2,
} from 'lucide-react';
import EstimationDetailBreakdown from './EstimationDetailBreakdown';
import { formatRupiahFull } from '../../../lib/estimatorFormat';
import type { EstimationFormDraft, EstimationSummary } from '../../../types/estimator';

type Props = {
  draft: EstimationFormDraft;
  summary: EstimationSummary;
  navSidebarCollapsed: boolean;
  isNew: boolean;
  isReadOnly: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  breakdownOpen: boolean;
  onToggleBreakdown: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onWhatsApp: () => void;
  onDocument: () => void;
};

function IconBtn({
  label,
  onClick,
  disabled,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-2 rounded-xl border transition-all duration-200 active:scale-95 shrink-0 disabled:opacity-35 disabled:pointer-events-none ${
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

export default function EstimationDetailBottomBar({
  draft,
  summary,
  navSidebarCollapsed,
  isNew,
  isReadOnly,
  saving,
  canUndo,
  canRedo,
  breakdownOpen,
  onToggleBreakdown,
  onUndo,
  onRedo,
  onSave,
  onWhatsApp,
  onDocument,
}: Props) {
  return (
    <div
      className={`fixed left-0 right-0 z-40 pointer-events-none bottom-[5.5rem] lg:bottom-0 ${
        navSidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64'
      }`}
    >
      <div className="pointer-events-auto max-w-[100rem] mx-auto px-3 sm:px-4 relative">
        {breakdownOpen && (
          <EstimationDetailBreakdown
            draft={draft}
            summary={summary}
            expanded
            className="mb-0 absolute bottom-full left-3 right-3 sm:left-4 sm:right-4"
          />
        )}

        <div className="bg-white/95 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-lg">
          <div className="px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-1.5 min-h-[3.25rem]">
            <div className="flex items-center gap-0.5 shrink-0">
              <IconBtn label="Undo" onClick={onUndo} disabled={isReadOnly || !canUndo}>
                <Undo2 className="w-4 h-4" />
              </IconBtn>
              <IconBtn label="Redo" onClick={onRedo} disabled={isReadOnly || !canRedo}>
                <Redo2 className="w-4 h-4" />
              </IconBtn>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <IconBtn label="WhatsApp" onClick={onWhatsApp} disabled={isNew}>
                <MessageCircle className="w-4 h-4 text-emerald-600" />
              </IconBtn>
              <IconBtn label="Dokumen" onClick={onDocument} disabled={isNew}>
                <FileText className="w-4 h-4" />
              </IconBtn>
              <IconBtn
                label="Rincian total"
                onClick={onToggleBreakdown}
                active={breakdownOpen}
              >
                <ClipboardList className="w-4 h-4" />
              </IconBtn>
            </div>

            <div className="flex-1 min-w-0 text-right px-1 sm:px-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 truncate">
                Total penawaran
              </div>
              <div className="text-base sm:text-lg font-black tabular-nums text-emerald-700 truncate leading-tight">
                {formatRupiahFull(summary.grandTotal)}
              </div>
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={saving || isReadOnly}
              className="inline-flex items-center justify-center gap-1 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shrink-0 active:scale-95 transition-all duration-200"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden xs:inline">Simpan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
