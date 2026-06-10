import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Save, Eye } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import EstimationItemsTable from '../../components/estimator/EstimationItemsTable';
import EstimationImageSlots from '../../components/estimator/EstimationImageSlots';
import EstimationSummaryPanel from '../../components/estimator/EstimationSummaryPanel';
import PdfDesignCustomizer from '../../components/estimator/PdfDesignCustomizer';
import PdfPreviewModal from '../../components/estimator/PdfPreviewModal';
import { uploadPendingImages } from '../../services/estimationImageService';
import { downloadQuotationPdf } from '../../lib/pdf/generateQuotationPdf';
import { loadPdfSettings } from '../../services/pdfSettingsService';
import type { PdfSettings } from '../../types/pdfSettings';
import {
  createEstimation,
  estimationToFormDraft,
  generateEstimationCode,
  loadEstimation,
  newEstimationDraft,
  updateEstimation,
} from '../../services/estimatorService';
import type { EstimationImageDraft } from '../../types/estimator';
import { ESTIMATION_STATUS_LABEL } from '../../lib/estimatorFormat';
import type { EstimationFormDraft } from '../../types/estimator';

export default function EstimatorForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { tenant, user, projects } = useAppStore();
  const showToast = useUiStore(s => s.showToast);

  const [draft, setDraft] = useState<EstimationFormDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pdfDesignOpen, setPdfDesignOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const patch = useCallback((p: Partial<EstimationFormDraft>) => {
    setDraft(prev => (prev ? { ...prev, ...p } : prev));
  }, []);

  useEffect(() => {
    if (!tenant?.id) return;

    const init = async () => {
      setLoading(true);
      try {
        const settings = await loadPdfSettings(tenant.id, tenant.name);
        setPdfSettings(settings);

        if (isNew) {
          const code = await generateEstimationCode(tenant.id);
          setDraft({
            ...newEstimationDraft(code),
            pdf_template: settings.default_pdf_template,
            pdf_primary_color: settings.primary_color,
            pdf_secondary_color: settings.secondary_color,
          });
        } else {
          const est = await loadEstimation(id);
          if (!est) {
            showToast('Estimasi tidak ditemukan', 'error');
            navigate('/app/estimator');
            return;
          }
          const formDraft = await estimationToFormDraft(est);
          setDraft({
            ...formDraft,
            pdf_primary_color: est.pdf_primary_color || settings.primary_color,
            pdf_secondary_color: est.pdf_secondary_color || settings.secondary_color,
            pdf_template: est.pdf_template || settings.default_pdf_template,
          });
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal memuat', 'error');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [tenant?.id, id, isNew, navigate, showToast]);

  const handleSave = async () => {
    if (!draft || !tenant?.id || !user?.id) return;
    if (!draft.title.trim()) {
      showToast('Judul estimasi wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      let images: EstimationImageDraft[] = draft.images;

      if (isNew) {
        const created = await createEstimation(tenant.id, user.id, draft);
        if (images.some(img => img.pendingFile)) {
          images = await uploadPendingImages(tenant.id, created.id, images);
          await updateEstimation(created.id, { ...draft, images });
        }
        showToast('Estimasi disimpan', 'success');
        navigate(`/app/estimator/${created.id}`, { replace: true });
      } else {
        if (images.some(img => img.pendingFile)) {
          images = await uploadPendingImages(tenant.id, id, images);
        }
        await updateEstimation(id, { ...draft, images });
        patch({ images });
        showToast('Perubahan disimpan', 'success');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requireSaved = (): boolean => {
    if (isNew) {
      showToast('Simpan draft terlebih dahulu sebelum generate PDF', 'error');
      return false;
    }
    if (!draft.title.trim()) {
      showToast('Judul estimasi wajib diisi', 'error');
      return false;
    }
    return true;
  };

  const handleDownloadPdf = async () => {
    if (!draft || !pdfSettings || !requireSaved()) return;
    setPdfLoading(true);
    try {
      await downloadQuotationPdf(draft, pdfSettings, {
        showImages: draft.pdf_show_images,
        showBank: draft.pdf_show_bank,
        showSignature: draft.pdf_show_signature,
      });
      showToast('PDF diunduh', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membuat PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreviewPdf = () => {
    if (!requireSaved()) return;
    setPdfPreviewOpen(true);
  };

  if (loading || !draft) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/app/estimator')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-emerald-600 font-bold">{draft.code}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {ESTIMATION_STATUS_LABEL[draft.status]}
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 truncate">
            {isNew ? 'Estimasi Baru' : draft.title || 'Edit Estimasi'}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Informasi & pengaturan */}
        <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
          <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Informasi</h3>
            <Field label="Kode">
              <input
                value={draft.code}
                onChange={e => patch({ code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
              />
            </Field>
            <Field label="Judul *">
              <input
                value={draft.title}
                onChange={e => patch({ title: e.target.value })}
                placeholder="Renovasi Kitchen Set 3.5m"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </Field>
            <Field label="Customer">
              <input
                value={draft.customer_name}
                onChange={e => patch({ customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </Field>
            <Field label="Telepon">
              <input
                value={draft.customer_phone}
                onChange={e => patch({ customer_phone: e.target.value })}
                placeholder="+62..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </Field>
            <Field label="Alamat">
              <textarea
                value={draft.customer_address}
                onChange={e => patch({ customer_address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"
              />
            </Field>
            <Field label="Proyek (opsional)">
              <select
                value={draft.project_id || ''}
                onChange={e => patch({ project_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              >
                <option value="">— Tidak terhubung —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label={`Masa berlaku (${draft.validity_days} hari)`}>
              <input
                type="range"
                min={7}
                max={30}
                step={7}
                value={draft.validity_days}
                onChange={e => patch({ validity_days: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>7 hari</span>
                <span>14 hari</span>
                <span>21 hari</span>
                <span>30 hari</span>
              </div>
            </Field>
          </section>

          <EstimationImageSlots
            orgId={tenant!.id}
            estimationId={isNew ? null : id ?? null}
            images={draft.images}
            onChange={images => patch({ images })}
            onToast={(msg, type) => showToast(msg, type)}
          />

          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700"
            >
              Pengaturan Lanjut
              <span className="text-slate-400">{advancedOpen ? '▲' : '▼'}</span>
            </button>
            {advancedOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                <Field label={`Overhead (${draft.overhead_pct}%)`}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.overhead_pct}
                    onChange={e => patch({ overhead_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
                <Field label={`Diskon (${draft.discount_pct}%)`}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.discount_pct}
                    onChange={e => patch({ discount_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </Field>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">PPN 11%</span>
                  <button
                    type="button"
                    onClick={() => patch({ tax_pct: draft.tax_pct > 0 ? 0 : 11 })}
                    className={`w-10 h-6 rounded-full transition-colors ${draft.tax_pct > 0 ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${draft.tax_pct > 0 ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
            )}
          </section>

          <PdfDesignCustomizer
            draft={draft}
            onChange={patch}
            open={pdfDesignOpen}
            onToggle={() => setPdfDesignOpen(v => !v)}
          />

          <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Catatan & Syarat</h3>
            <textarea
              value={draft.notes}
              onChange={e => patch({ notes: e.target.value })}
              placeholder="Catatan untuk customer..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"
            />
            <textarea
              value={draft.terms_conditions}
              onChange={e => patch({ terms_conditions: e.target.value })}
              placeholder="Syarat & ketentuan..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"
            />
          </section>
        </div>

        {/* Items — kolom utama */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <EstimationItemsTable
            orgId={tenant!.id}
            items={draft.items}
            defaultMargin={draft.margin_pct}
            overheadPct={draft.overhead_pct}
            discountPct={draft.discount_pct}
            taxPct={draft.tax_pct}
            onChange={items => patch({ items })}
          />
        </div>

        {/* Ringkasan */}
        <div className="lg:col-span-3 order-3">
          <EstimationSummaryPanel draft={draft} />
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 px-4 py-3 flex flex-wrap gap-2 justify-end z-20 safe-bottom">
        <button
          type="button"
          onClick={() => navigate('/app/estimator')}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handlePreviewPdf}
          disabled={pdfLoading || isNew}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          <Eye className="w-4 h-4" /> Preview PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfLoading || isNew}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Download PDF
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan Draft'}
        </button>
      </div>

      {pdfPreviewOpen && pdfSettings && (
        <PdfPreviewModal
          draft={draft}
          settings={pdfSettings}
          onClose={() => setPdfPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
