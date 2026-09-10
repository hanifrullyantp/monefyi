import type { ReactNode } from 'react';
import {
  ChevronUp, Loader2, MessageCircle, Redo2, RotateCcw, Save, Undo2,
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
  showSaveActions: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canDiscard: boolean;
  breakdownOpen: boolean;
  onToggleBreakdown: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscardChanges: () => void;
  onSave: () => void;
  onWhatsApp: () => void;
  onDocument: () => void;
};

function IconBtn({
  label,
  onClick,
  disabled,
  children,
  onGradient,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  onGradient?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-2 rounded-xl border transition-all duration-200 active:scale-95 shrink-0 disabled:opacity-35 disabled:pointer-events-none ${
        onGradient
          ? 'border-white/30 bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-white'
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
  showSaveActions,
  canUndo,
  canRedo,
  canDiscard,
  breakdownOpen,
  onToggleBreakdown,
  onUndo,
  onRedo,
  onDiscardChanges,
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
        <button
          type="button"
          onClick={onToggleBreakdown}
          aria-label="Rincian total"
          aria-expanded={breakdownOpen}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border border-emerald-200 shadow-md text-emerald-700 hover:bg-emerald-50 transition-all duration-200 active:scale-95"
        >
          <ChevronUp
            className={`w-4 h-4 transition-transform duration-200 ${breakdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {breakdownOpen && (
          <EstimationDetailBreakdown
            draft={draft}
            summary={summary}
            expanded
            className="mb-0 absolute bottom-full left-3 right-3 sm:left-4 sm:right-4 mb-2"
          />
        )}

        <div className="relative rounded-2xl border border-emerald-700/25 shadow-xl shadow-emerald-900/20 overflow-visible">
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 text-white rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.14),transparent_55%)] pointer-events-none" />

            {showSaveActions && (
              <div className="relative flex items-center gap-1 px-2 sm:px-3 py-1.5 border-b border-white/15 bg-black/10">
                <IconBtn label="Undo" onClick={onUndo} disabled={isReadOnly || !canUndo} onGradient>
                  <Undo2 className="w-4 h-4" />
                </IconBtn>
                <IconBtn label="Redo" onClick={onRedo} disabled={isReadOnly || !canRedo} onGradient>
                  <Redo2 className="w-4 h-4" />
                </IconBtn>
                <IconBtn
                  label="Reset perubahan"
                  onClick={onDiscardChanges}
                  disabled={isReadOnly || isNew || !canDiscard}
                  onGradient
                >
                  <RotateCcw className="w-4 h-4" />
                </IconBtn>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || isReadOnly}
                  className="ml-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-50 disabled:opacity-50 shrink-0 active:scale-95 transition-all duration-200"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan
                </button>
              </div>
            )}

            <div className="relative px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-1.5 min-h-[3.25rem]">
              <div className="flex items-center gap-0.5 shrink-0">
                <IconBtn label="WhatsApp" onClick={onWhatsApp} disabled={isNew} onGradient>
                  <MessageCircle className="w-4 h-4 text-white" />
                </IconBtn>
                <IconBtn label="Dokumen" onClick={onDocument} disabled={isNew} onGradient>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden>
                    <path
                      d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                    <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                    <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </IconBtn>
              </div>

              <div className="flex-1 min-w-0 text-right px-1 sm:px-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/75 truncate">
                  Total penawaran
                </div>
                <div className="text-base sm:text-xl font-black tabular-nums text-white truncate leading-tight">
                  {formatRupiahFull(summary.grandTotal)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
