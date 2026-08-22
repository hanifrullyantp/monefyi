import {
  ArrowLeft,
  Eye,
  FileDown,
  Loader2,
  MessageCircle,
  Receipt,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { AutoSaveStatus } from '../../hooks/useAutoSave';
import AutoSaveIndicator from './AutoSaveIndicator';

interface Props {
  navSidebarCollapsed: boolean;
  isNew: boolean;
  saving: boolean;
  pdfLoading: boolean;
  isReadOnly?: boolean;
  autoSaveStatus: AutoSaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  canDiscard: boolean;
  inline?: boolean;
  onCancel: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscardChanges: () => void;
  onRetryAutoSave: () => void;
  onWhatsApp: () => void;
  onPreviewPdf: () => void;
  onDownloadPdf: () => void;
  onKwitansi: () => void;
}

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
      title={label}
      aria-label={label}
      className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none shrink-0"
    >
      {children}
    </button>
  );
}

export default function EstimatorActionBar({
  navSidebarCollapsed,
  isNew,
  saving,
  pdfLoading,
  isReadOnly,
  autoSaveStatus,
  canUndo,
  canRedo,
  canDiscard,
  inline = false,
  onCancel,
  onSave,
  onUndo,
  onRedo,
  onDiscardChanges,
  onRetryAutoSave,
  onWhatsApp,
  onPreviewPdf,
  onDownloadPdf,
  onKwitansi,
}: Props) {
  return (
    <div
      className={
        inline
          ? 'mb-3 bg-white border border-slate-200 rounded-2xl shadow-sm'
          : `fixed left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] bottom-[4.75rem] lg:bottom-0 safe-bottom ${
              navSidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64'
            }`
      }
    >
      <div
        className={`max-w-[100rem] mx-auto px-3 sm:px-4 py-2.5 flex flex-nowrap items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          inline ? 'min-h-[3.25rem]' : ''
        }`}
      >
        {!inline && (
          <IconBtn label="Kembali" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </IconBtn>
        )}
        {inline && (
          <IconBtn label="Kembali ke daftar" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </IconBtn>
        )}

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <IconBtn label="Undo" onClick={onUndo} disabled={isReadOnly || !canUndo}>
            <Undo2 className="w-4 h-4" />
          </IconBtn>
          <IconBtn label="Redo" onClick={onRedo} disabled={isReadOnly || !canRedo}>
            <Redo2 className="w-4 h-4" />
          </IconBtn>
          <IconBtn
            label="Batal simpan"
            onClick={onDiscardChanges}
            disabled={isReadOnly || isNew || !canDiscard}
          >
            <RotateCcw className="w-4 h-4" />
          </IconBtn>
        </div>

        {!isNew && (
          <div className="hidden md:block shrink-0">
            <AutoSaveIndicator status={autoSaveStatus} onRetry={onRetryAutoSave} />
          </div>
        )}

        <div className="flex-1 min-w-2 shrink" />

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <IconBtn label="WhatsApp" onClick={onWhatsApp} disabled={isNew}>
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </IconBtn>
          <IconBtn label="Preview PDF" onClick={onPreviewPdf} disabled={pdfLoading || isNew}>
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </IconBtn>
          <IconBtn label="Download PDF" onClick={onDownloadPdf} disabled={pdfLoading || isNew}>
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          </IconBtn>
          <IconBtn label="Kwitansi" onClick={onKwitansi} disabled={pdfLoading || isNew}>
            <Receipt className="w-4 h-4 text-emerald-700" />
          </IconBtn>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || isReadOnly}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shrink-0 min-w-[5rem] sm:min-w-[5.5rem] ml-0.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan
        </button>
      </div>
    </div>
  );
}
