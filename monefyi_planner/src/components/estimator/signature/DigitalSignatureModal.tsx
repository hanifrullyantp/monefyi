import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  FileSignature,
  Save,
  Sparkles,
  User,
  Users,
  X,
  Trash2,
} from 'lucide-react';
import { SignaturePadCanvas, type SignaturePadHandle } from './SignaturePadCanvas';
import type { DocumentSignatures, EstimationFormDraft } from '../../../types/estimator';
import type { PdfSettings } from '../../../types/pdfSettings';
import {
  getEstimationSignatures,
  saveEstimationSignatures,
} from '../../../lib/pdf/digitalSignatureStorage';
import { formatDateId } from '../../../lib/estimatorFormat';

interface Props {
  open: boolean;
  draft: EstimationFormDraft;
  settings: PdfSettings;
  onClose: () => void;
  onSaveSignatures: (signatures: DocumentSignatures) => void;
  onSaveAsDefaultUserSignature?: (dataUri: string, name: string, title: string) => void;
  onToast?: (msg: string, type: 'success' | 'error') => void;
}

export default function DigitalSignatureModal({
  open,
  draft,
  settings,
  onClose,
  onSaveSignatures,
  onSaveAsDefaultUserSignature,
  onToast,
}: Props) {
  const [activeTab, setActiveTab] = useState<'user' | 'buyer'>('user');

  // Signatures state
  const [signatures, setSignatures] = useState<DocumentSignatures>(() => {
    const fromStorage = getEstimationSignatures(draft.code || 'draft');
    if (fromStorage) return fromStorage;
    return draft.signatures || {};
  });

  // User form fields
  const [userName, setUserName] = useState(
    signatures.userSignature?.signerName || settings.signature_name || settings.company_name || '',
  );
  const [userTitle, setUserTitle] = useState(
    signatures.userSignature?.signerTitle || settings.signature_title || 'Penanggung Jawab / Estimator',
  );
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Buyer form fields
  const [buyerName, setBuyerName] = useState(
    signatures.buyerSignature?.signerName || draft.customer_name || '',
  );
  const [buyerTitle, setBuyerTitle] = useState(
    signatures.buyerSignature?.signerTitle || 'Disetujui Oleh (Klien)',
  );
  const [showBuyerInPdf, setShowBuyerInPdf] = useState(
    signatures.showBuyerSignature !== false,
  );

  const userPadRef = useRef<SignaturePadHandle | null>(null);
  const buyerPadRef = useRef<SignaturePadHandle | null>(null);

  // Synchronize when draft or open changes
  useEffect(() => {
    if (!open) return;
    const stored = getEstimationSignatures(draft.code || 'draft') || draft.signatures || {};
    setSignatures(stored);

    if (stored.userSignature) {
      setUserName(stored.userSignature.signerName);
      setUserTitle(stored.userSignature.signerTitle);
    } else {
      setUserName(settings.signature_name || settings.company_name || '');
      setUserTitle(settings.signature_title || 'Penanggung Jawab / Estimator');
    }

    if (stored.buyerSignature) {
      setBuyerName(stored.buyerSignature.signerName);
      setBuyerTitle(stored.buyerSignature.signerTitle);
    } else {
      setBuyerName(draft.customer_name || '');
      setBuyerTitle('Disetujui Oleh (Klien)');
    }

    setShowBuyerInPdf(stored.showBuyerSignature !== false);
  }, [open, draft.code, draft.signatures, draft.customer_name, settings]);

  const hasUserSig = Boolean(signatures.userSignature?.dataUri || settings.signature_url);
  const hasBuyerSig = Boolean(signatures.buyerSignature?.dataUri);

  // Save current active tab signature
  const handleSaveUserSignature = () => {
    const dataUri = userPadRef.current?.getDataUri() || signatures.userSignature?.dataUri || settings.signature_url;
    if (!dataUri) {
      if (onToast) onToast('Silakan goreskan tanda tangan Anda terlebih dahulu', 'error');
      return;
    }

    const updated: DocumentSignatures = {
      ...signatures,
      userSignature: {
        dataUri,
        signerName: userName.trim() || 'Hormat Kami',
        signerTitle: userTitle.trim() || 'Estimator',
        signedAt: formatDateId(new Date()),
      },
    };

    setSignatures(updated);
    saveEstimationSignatures(draft.code || 'draft', updated);
    onSaveSignatures(updated);

    if (saveAsDefault && onSaveAsDefaultUserSignature) {
      onSaveAsDefaultUserSignature(dataUri, userName.trim(), userTitle.trim());
    }

    if (onToast) onToast('Tanda tangan user berhasil disimpan', 'success');
  };

  const handleSaveBuyerSignature = () => {
    const dataUri = buyerPadRef.current?.getDataUri() || signatures.buyerSignature?.dataUri;
    if (!dataUri) {
      if (onToast) onToast('Silakan minta pembeli / klien menandatangani di layar HP', 'error');
      return;
    }

    const updated: DocumentSignatures = {
      ...signatures,
      showBuyerSignature: showBuyerInPdf,
      buyerSignature: {
        dataUri,
        signerName: buyerName.trim() || draft.customer_name || 'Klien',
        signerTitle: buyerTitle.trim() || 'Disetujui Oleh',
        signedAt: formatDateId(new Date()),
      },
    };

    setSignatures(updated);
    saveEstimationSignatures(draft.code || 'draft', updated);
    onSaveSignatures(updated);

    if (onToast) onToast('Tanda tangan pembeli/klien berhasil disimpan', 'success');
  };

  const handleApplyAndClose = () => {
    // Also grab any unsubmitted drawing from current pad
    let currentSigs = { ...signatures };

    if (activeTab === 'user') {
      const userUri = userPadRef.current?.getDataUri();
      if (userUri) {
        currentSigs.userSignature = {
          dataUri: userUri,
          signerName: userName.trim() || 'Hormat Kami',
          signerTitle: userTitle.trim() || 'Estimator',
          signedAt: formatDateId(new Date()),
        };
        if (saveAsDefault && onSaveAsDefaultUserSignature) {
          onSaveAsDefaultUserSignature(userUri, userName.trim(), userTitle.trim());
        }
      }
    } else {
      const buyerUri = buyerPadRef.current?.getDataUri();
      if (buyerUri) {
        currentSigs.buyerSignature = {
          dataUri: buyerUri,
          signerName: buyerName.trim() || draft.customer_name || 'Klien',
          signerTitle: buyerTitle.trim() || 'Disetujui Oleh',
          signedAt: formatDateId(new Date()),
        };
      }
    }

    currentSigs.showBuyerSignature = showBuyerInPdf;

    saveEstimationSignatures(draft.code || 'draft', currentSigs);
    onSaveSignatures(currentSigs);
    if (onToast) onToast('Tanda tangan otomatis diterapkan ke dokumen PDF!', 'success');
    onClose();
  };

  const handleClearUser = () => {
    userPadRef.current?.clear();
    const updated = { ...signatures, userSignature: null };
    setSignatures(updated);
    saveEstimationSignatures(draft.code || 'draft', updated);
    onSaveSignatures(updated);
  };

  const handleClearBuyer = () => {
    buyerPadRef.current?.clear();
    const updated = { ...signatures, buyerSignature: null };
    setSignatures(updated);
    saveEstimationSignatures(draft.code || 'draft', updated);
    onSaveSignatures(updated);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                  Tanda Tangan Digital Dokumen
                </h3>
                <p className="text-xs text-slate-500">
                  Gores langsung di layar HP/layar sentuh untuk otomatis masuk ke PDF
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher: User vs Buyer */}
          <div className="p-3 bg-slate-100/70 border-b border-slate-200/80 shrink-0">
            <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-2xl">
              {/* Tab User / Saya */}
              <button
                type="button"
                onClick={() => setActiveTab('user')}
                className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'user'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>1. Tanda Tangan Saya (User)</span>
                {signatures.userSignature?.dataUri ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Sudah ditandatangani" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" title="Belum" />
                )}
              </button>

              {/* Tab Buyer / Klien */}
              <button
                type="button"
                onClick={() => setActiveTab('buyer')}
                className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'buyer'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>2. Tanda Tangan Klien (Buyer)</span>
                {signatures.buyerSignature?.dataUri ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Sudah ditandatangani" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" title="Belum" />
                )}
              </button>
            </div>
          </div>

          {/* Modal Body / Tab Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {activeTab === 'user' ? (
              /* TAB 1: USER / PENYEDIA */
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tanda Tangan Penyedia / Vendor</span>
                  </div>
                  {signatures.userSignature?.dataUri && (
                    <button
                      type="button"
                      onClick={handleClearUser}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus Tanda Tangan
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Nama Penanda Tangan
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Jabatan / Peran
                    </label>
                    <input
                      type="text"
                      value={userTitle}
                      onChange={(e) => setUserTitle(e.target.value)}
                      placeholder="Contoh: Direktur / Estimator"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Pad Tanda Tangan HP */}
                <SignaturePadCanvas
                  ref={userPadRef}
                  initialDataUri={signatures.userSignature?.dataUri || settings.signature_url}
                  label="Gores Tanda Tangan Anda di Layar HP"
                  height={170}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={saveAsDefault}
                      onChange={(e) => setSaveAsDefault(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Simpan juga sebagai tanda tangan default perusahaan</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveUserSignature}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 transition"
                  >
                    <Save className="w-3.5 h-3.5" /> Simpan Tanda Tangan Saya
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: BUYER / KLIEN */
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tanda Tangan Persetujuan Klien / Buyer</span>
                  </div>
                  {signatures.buyerSignature?.dataUri && (
                    <button
                      type="button"
                      onClick={handleClearBuyer}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus Tanda Tangan Klien
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                  💡 <strong>Tip Saat Bertemu Klien:</strong> Serahkan HP Anda kepada pembeli/klien agar mereka dapat menandatangani dokumen langsung di layar ini sebagai bukti persetujuan resmi.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Nama Klien / Pembeli
                    </label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Nama klien (otomatis terisi dari penawaran)"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Status / Keterangan
                    </label>
                    <input
                      type="text"
                      value={buyerTitle}
                      onChange={(e) => setBuyerTitle(e.target.value)}
                      placeholder="Contoh: Disetujui Oleh / Pemilik Proyek"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Pad Tanda Tangan HP Klien */}
                <SignaturePadCanvas
                  ref={buyerPadRef}
                  initialDataUri={signatures.buyerSignature?.dataUri}
                  label="Minta Klien Menandatangani di Layar HP"
                  height={170}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={showBuyerInPdf}
                      onChange={(e) => setShowBuyerInPdf(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Tampilkan kolom tanda tangan klien di dokumen PDF</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveBuyerSignature}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100 transition"
                  >
                    <Save className="w-3.5 h-3.5" /> Simpan Tanda Tangan Klien
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                {hasUserSig ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />
                )}
                <span className={hasUserSig ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  User {hasUserSig ? '✓' : ''}
                </span>
              </span>

              <span className="flex items-center gap-1">
                {hasBuyerSig ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />
                )}
                <span className={hasBuyerSig ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  Buyer {hasBuyerSig ? '✓' : ''}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleApplyAndClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md shadow-emerald-700/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan ke PDF</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

