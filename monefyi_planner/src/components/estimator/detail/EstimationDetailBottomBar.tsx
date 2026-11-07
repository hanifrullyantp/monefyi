import type { ReactNode } from 'react';
import {
  ChevronUp, FileText, Loader2, MessageCircle, Redo2, RotateCcw, Save, Undo2,
} from 'lucide-react';
import EstimationDetailBreakdown from './EstimationDetailBreakdown';
import { formatRupiahFull } from '../../../lib/estimatorFormat';
import { isDemoEmbedActive } from '../../../lib/demo/demoMode';
import type { EstimationFormDraft, EstimationSummary } from '../../../types/estimator';

type Props = {
  draft: EstimationFormDraft;
  summary: EstimationSummary;
  navSidebarCollapsed: boolean;
  embedMode?: boolean;
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
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl border border-white/30 bg-white/15 text-white hover:bg-white/25 disabled:opacity-35 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

export default function EstimationDetailBottomBar({
  draft,
  summary,
  navSidebarCollapsed,
  embedMode = false,
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
  const embed = embedMode || isDemoEmbedActive();
  const bottomClass = 'bottom-2 sm:bottom-3 lg:bottom-4 pb-[env(safe-area-inset-bottom)]';
  const horizontalClass = embed ? 'left-0' : navSidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64';

  return (
    <div
      className={`fixed left-0 right-0 z-40 pointer-events-none ${bottomClass} ${horizontalClass}`}
    >
      <div className="pointer-events-auto max-w-[100rem] mx-auto px-3 sm:px-4 relative">
        <button
          type="button"
          onClick={onToggleBreakdown}
          aria-label="Rincian total"
          aria-expanded={breakdownOpen}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-white border border-emerald-200 shadow-md text-emerald-700"
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

        <div
          className="relative overflow-hidden rounded-[20px] text-white"
          style={{
            background: 'linear-gradient(135deg, #064E3B 0%, #065F46 48%, #047857 100%)',
            boxShadow: '0 10px 28px rgba(6, 78, 59, 0.22)',
          }}
        >
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/[0.08]" />

          {showSaveActions && (
            <div className="relative flex items-center gap-1 px-2 sm:px-3 py-1.5 border-b border-white/15 bg-black/10">
              <IconBtn label="Undo" onClick={onUndo} disabled={isReadOnly || !canUndo}>
                <Undo2 className="w-4 h-4" />
              </IconBtn>
              <IconBtn label="Redo" onClick={onRedo} disabled={isReadOnly || !canRedo}>
                <Redo2 className="w-4 h-4" />
              </IconBtn>
              <IconBtn
                label="Reset perubahan"
                onClick={onDiscardChanges}
                disabled={isReadOnly || isNew || !canDiscard}
              >
                <RotateCcw className="w-4 h-4" />
              </IconBtn>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || isReadOnly}
                className="ml-auto inline-flex items-center justify-center gap-1 min-h-11 px-3 bg-white text-emerald-700 rounded-full text-xs font-bold disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan
              </button>
            </div>
          )}

          <div className="relative px-3 py-3 flex items-center gap-2 min-h-[4.25rem]">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#D1FAE5]">Total penawaran</p>
              <p className="text-lg sm:text-xl font-black tabular-nums leading-tight truncate">
                {formatRupiahFull(summary.grandTotal)}
              </p>
            </div>
            <IconBtn label="Pratinjau dokumen" onClick={onDocument} disabled={isNew}>
              <FileText className="w-4 h-4" />
            </IconBtn>
            <IconBtn label="Kirim WhatsApp" onClick={onWhatsApp} disabled={isNew}>
              <MessageCircle className="w-4 h-4" />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
