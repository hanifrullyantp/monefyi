import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FileText, Loader2, Save, Eye, Settings2 } from 'lucide-react';
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
  const [detailOpen, setDetailOpen] = useState(false);
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
          if (formDraft.customer_name || formDraft.customer_phone) {
            setDetailOpen(true);
          }
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
    <div className="w-full max-w-[100rem] mx-auto px-3 sm:px-5 py-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate('/app/estimator')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0"
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
          <input
            value={draft.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder="Judul estimasi *"
            className="w-full text-xl font-black text-slate-900 bg-transparent border-0 border-b-2 border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none py-0.5 truncate"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan
        </button>
      </div>

      {/* Toolbar: detail toggle — tidak memotong tabel */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setDetailOpen(v => !v)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            detailOpen
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Detail & Customer
          <ChevronDown className={`w-4 h-4 transition-transform ${detailOpen ? 'rotate-180' : ''}`} />
        </button>
        {draft.customer_name && !detailOpen && (
          <span className="text-xs text-slate-500 truncate max-w-[200px]">
            {draft.customer_name}
          </span>
        )}
      </div>

      {/* Panel detail — collapsible, di atas tabel tapi tidak di samping */}
      {detailOpen && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 md:col-span-2 xl:col-span-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Informasi Customer & Proyek</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Kode">
                <input
                  value={draft.code}
                  onChange={e => patch({ code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
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
            </div>
            <Field label="Alamat">
              <textarea
                value={draft.customer_address}
                onChange={e => patch({ customer_address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"
              />
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

          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700"
            >
              Overhead, Diskon & PPN
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
        </div>
      )}

      {/* Fokus utama: tabel lebar + ringkasan samping */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 w-full">
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
        <div className="w-full xl:w-72 shrink-0 xl:sticky xl:top-4">
          <EstimationSummaryPanel draft={draft} />
        </div>
      </div>

      {/* Pengaturan sekunder — di bawah tabel */}
      {detailOpen && (
        <div className="mt-4 space-y-4">
          <EstimationImageSlots
            orgId={tenant!.id}
            estimationId={isNew ? null : id ?? null}
            images={draft.images}
            onChange={images => patch({ images })}
            onToast={(msg, type) => showToast(msg, type)}
          />
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
      )}

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
