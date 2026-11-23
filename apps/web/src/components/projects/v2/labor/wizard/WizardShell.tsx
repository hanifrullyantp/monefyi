import { useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X, CalendarPlus, Loader2 } from 'lucide-react';
import type { WizardVariant } from '../../../../../hooks/useWizardVariant';
import StepIndicator from './StepIndicator';
import '../../../../../styles/modal-wizard-tenaga.css';

type Props = {
  open: boolean;
  variant: WizardVariant;
  currentStep: number;
  title: string;
  isEdit?: boolean;
  loading?: boolean;
  saving?: boolean;
  canProceed: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  children: ReactNode;
};

export default function WizardShell({
  open, variant, currentStep, title, isEdit, loading, saving, canProceed,
  onClose, onBack, onNext, onSave, children,
}: Props) {
  const isMobile = variant === 'mobile';
  const isWide = variant === 'wide';

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (currentStep === 3) onSave();
      else if (canProceed) onNext();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (currentStep === 3) onSave();
    }
  }, [open, currentStep, canProceed, onClose, onNext, onSave]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const handlePrimary = () => {
    if (currentStep === 3) onSave();
    else onNext();
  };

  return createPortal(
    <div
      className={`wz-backdrop${isMobile ? ' mobile' : ''}`}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`wz-modal${isWide ? ' wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="wz-drag-handle" aria-hidden />
        <header className="wz-header">
          <div className="wz-header-row">
            <button
              type="button"
              className="wz-icon-btn"
              onClick={currentStep > 1 ? onBack : onClose}
              aria-label={currentStep > 1 ? 'Kembali' : 'Tutup'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="wz-header-title flex items-center justify-center gap-2">
              <CalendarPlus className="w-5 h-5 text-emerald-600 hidden sm:block" />
              {title || (isEdit ? 'Kelola Tenaga Kerja' : 'Tambah Tenaga Kerja')}
            </h1>
            <button type="button" className="wz-icon-btn" onClick={onClose} aria-label="Tutup">
              <X className="w-5 h-5" />
            </button>
          </div>
          <StepIndicator currentStep={currentStep} variant={variant} />
        </header>

        <div className="wz-content">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : children}
        </div>

        <footer className={`wz-footer${isMobile && currentStep !== 2 ? ' single' : ''}`}>
          {!isMobile && currentStep > 1 && (
            <button type="button" className="wz-btn-ghost" onClick={onBack}>← Kembali</button>
          )}
          {isMobile && currentStep === 2 && (
            <button type="button" className="wz-btn-ghost" onClick={onBack}>← Back</button>
          )}
          {!isMobile && currentStep === 1 && (
            <button type="button" className="wz-btn-ghost" onClick={onClose}>Batal</button>
          )}
          <button
            type="button"
            className="wz-btn-primary"
            disabled={!canProceed || saving || loading}
            onClick={handlePrimary}
            style={isMobile && currentStep !== 2 ? { width: '100%', margin: 0, minWidth: 0 } : undefined}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
            {currentStep === 3 ? 'Simpan ke RAP' : 'Lanjut →'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
