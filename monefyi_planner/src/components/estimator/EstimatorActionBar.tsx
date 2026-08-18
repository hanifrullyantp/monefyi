import { ArrowLeft, Eye, FileDown, Loader2, MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  navSidebarCollapsed: boolean;
  isNew: boolean;
  pdfLoading: boolean;
  onCancel: () => void;
  onWhatsApp: () => void;
  onPreviewPdf: () => void;
  onDownloadPdf: () => void;
}

function ActionBtn({
  onClick,
  disabled,
  label,
  title,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 min-w-[2.75rem] ${className ?? ''}`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function EstimatorActionBar({
  navSidebarCollapsed,
  isNew,
  pdfLoading,
  onCancel,
  onWhatsApp,
  onPreviewPdf,
  onDownloadPdf,
}: Props) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 z-20 safe-bottom ${
        navSidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64'
      }`}
    >
      <ActionBtn
        onClick={onCancel}
        label="Batal"
        title="Kembali ke daftar estimasi"
        className="border border-slate-200 text-slate-600 hover:bg-slate-50"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
      </ActionBtn>

      <div className="flex items-center gap-1 sm:gap-2">
        <ActionBtn
          onClick={onWhatsApp}
          disabled={isNew}
          label="WhatsApp"
          title="Bagikan estimasi via WhatsApp"
          className="border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
        </ActionBtn>
        <ActionBtn
          onClick={onPreviewPdf}
          disabled={pdfLoading || isNew}
          label="Preview"
          title="Pratinjau PDF penawaran"
          className="border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Eye className="w-4 h-4 shrink-0" />}
        </ActionBtn>
        <ActionBtn
          onClick={onDownloadPdf}
          disabled={pdfLoading || isNew}
          label="Download"
          title="Unduh PDF penawaran"
          className="border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <FileDown className="w-4 h-4 shrink-0" />}
        </ActionBtn>
      </div>
    </div>
  );
}
