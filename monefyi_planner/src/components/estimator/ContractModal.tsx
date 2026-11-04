import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Download, FileSignature, Loader2, Plus, RotateCcw, Trash2, X,
} from 'lucide-react';
import type { EstimationFormDraft } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import {
  CONTRACT_PLACEHOLDERS,
  CONTRACT_TEMPLATES,
  cloneClauses,
  getContractTemplate,
  type ContractClause,
} from '../../lib/pdf/contractTemplates';
import {
  buildDefaultContractFields,
  buildPaymentTermsText,
  contractPdfFilename,
  downloadContractPdf,
  generateContractPdfBlob,
  type ContractFields,
} from '../../lib/pdf/contractPdf';
import { formatNumberId, parseNumberId } from '../../lib/estimatorFormat';
import PdfBlobCanvasViewer from './detail/PdfBlobCanvasViewer';

type Props = {
  open: boolean;
  draft: EstimationFormDraft;
  settings: PdfSettings;
  onClose: () => void;
  onToast?: (msg: string, type: 'success' | 'error') => void;
};

type Saved = {
  templateId: string;
  fields: ContractFields;
  clausesByTemplate: Record<string, ContractClause[]>;
};

const storageKey = (code: string) => `monefyi:contract:${code || 'draft'}`;

function loadSaved(code: string): Saved | null {
  try {
    const raw = localStorage.getItem(storageKey(code));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

const inputCls =
  'mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none bg-white';
const labelCls = 'text-[11px] font-bold text-slate-600';

function TextField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}

function AreaField({
  label, value, onChange, rows = 3, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea value={value} rows={rows} onChange={e => onChange(e.target.value)} className={`${inputCls} text-xs resize-y`} />
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

export default function ContractModal({ open, draft, settings, onClose, onToast }: Props) {
  const [templateId, setTemplateId] = useState(CONTRACT_TEMPLATES[0].id);
  const [fields, setFields] = useState<ContractFields | null>(null);
  const [clausesByTemplate, setClausesByTemplate] = useState<Record<string, ContractClause[]>>({});
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [valueInput, setValueInput] = useState('');
  const initKey = useRef('');

  // Inisialisasi saat dibuka (pulihkan draf tersimpan bila ada).
  useEffect(() => {
    if (!open) {
      initKey.current = '';
      return;
    }
    if (initKey.current === draft.code) return;
    initKey.current = draft.code;
    const saved = loadSaved(draft.code);
    const tpl = getContractTemplate(saved?.templateId ?? CONTRACT_TEMPLATES[0].id);
    const f = saved?.fields ?? buildDefaultContractFields(draft, settings, tpl);
    setTemplateId(tpl.id);
    setFields(f);
    setClausesByTemplate(saved?.clausesByTemplate ?? {});
    setValueInput(formatNumberId(f.contractValue));
  }, [open, draft, settings]);

  const template = getContractTemplate(templateId);
  const clauses = clausesByTemplate[templateId] ?? template.clauses;

  const patchField = <K extends keyof ContractFields>(key: K, value: ContractFields[K]) =>
    setFields(prev => (prev ? { ...prev, [key]: value } : prev));

  const setClauses = (next: ContractClause[]) =>
    setClausesByTemplate(prev => ({ ...prev, [templateId]: next }));

  const patchClause = (idx: number, patch: Partial<ContractClause>) =>
    setClauses(clauses.map((cl, i) => (i === idx ? { ...cl, ...patch } : cl)));

  const moveClause = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= clauses.length) return;
    const next = cloneClauses(clauses);
    [next[idx], next[j]] = [next[j], next[idx]];
    setClauses(next);
  };

  const switchTemplate = (id: string) => {
    if (id === templateId || !fields) return;
    const tpl = getContractTemplate(id);
    setTemplateId(id);
    // Sesuaikan warna & default khusus template; data para pihak tidak berubah.
    setFields({
      ...fields,
      accent: tpl.accent,
      durationDays: tpl.defaults.durationDays,
      warrantyDays: tpl.defaults.warrantyDays,
      penaltyPct: tpl.defaults.penaltyPct,
      retentionPct: tpl.defaults.retentionPct,
      revisionCount: tpl.defaults.revisionCount,
    });
  };

  const resetClauses = () => {
    setClausesByTemplate(prev => {
      const next = { ...prev };
      delete next[templateId];
      return next;
    });
  };

  // Simpan draf otomatis.
  useEffect(() => {
    if (!open || !fields) return;
    const t = setTimeout(() => {
      try {
        const payload: Saved = { templateId, fields, clausesByTemplate };
        localStorage.setItem(storageKey(draft.code), JSON.stringify(payload));
      } catch { /* quota — abaikan */ }
    }, 600);
    return () => clearTimeout(t);
  }, [open, fields, templateId, clausesByTemplate, draft.code]);

  const input = useMemo(
    () => (fields ? { draft, settings, templateId, fields, clauses } : null),
    [draft, settings, templateId, fields, clauses],
  );

  // Preview PDF (debounce).
  useEffect(() => {
    if (!open || !input) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const blob = await generateContractPdfBlob(input);
        if (!cancelled) setPdfBlob(blob);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal membuat PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, input]);

  if (!open || !fields || !input) return null;

  const handleDownload = async () => {
    try {
      await downloadContractPdf(input);
      onToast?.('Surat perjanjian diunduh', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Gagal unduh PDF', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-6xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileSignature className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 truncate">Surat Perjanjian Kerja</h2>
              <p className="text-xs text-slate-500 truncate">{draft.title || draft.code} · Klien: {draft.customer_name || '—'}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Unduh PDF
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Tutup">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[24rem_1fr] flex-1 min-h-0">
          <div className="border-b lg:border-b-0 lg:border-r border-slate-100 p-3 space-y-3 overflow-y-auto">
            <Section title="1 · Pilih Template">
              <div className="grid grid-cols-2 gap-2">
                {CONTRACT_TEMPLATES.map(tpl => {
                  const active = tpl.id === templateId;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => switchTemplate(tpl.id)}
                      className={`text-left rounded-xl border p-2 transition-all ${active ? 'border-emerald-500 ring-2 ring-emerald-200 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <DesignThumb design={tpl.design} accent={tpl.accent} />
                      <p className="mt-1.5 text-xs font-bold text-slate-900 leading-tight">{tpl.name}</p>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{tpl.tagline}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tpl.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{tag}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-2 pt-1">
                <span className={labelCls}>Warna aksen</span>
                <input
                  type="color"
                  value={fields.accent}
                  onChange={e => patchField('accent', e.target.value)}
                  className="h-7 w-10 rounded border border-slate-200 cursor-pointer"
                />
              </label>
            </Section>

            <Section title="2 · Data Perjanjian">
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Nomor perjanjian" value={fields.contractNumber} onChange={v => patchField('contractNumber', v)} />
                <TextField label="Tanggal" type="date" value={fields.contractDate} onChange={v => patchField('contractDate', v)} />
              </div>
              <TextField label="Kota penandatanganan" value={fields.city} onChange={v => patchField('city', v)} placeholder="Jakarta" />
            </Section>

            <Section title="3 · Pihak Pertama (Vendor)">
              <TextField label="Nama perusahaan" value={fields.vendorCompany} onChange={v => patchField('vendorCompany', v)} />
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Nama perwakilan" value={fields.vendorName} onChange={v => patchField('vendorName', v)} />
                <TextField label="Jabatan" value={fields.vendorPosition} onChange={v => patchField('vendorPosition', v)} />
              </div>
              <AreaField label="Alamat" rows={2} value={fields.vendorAddress} onChange={v => patchField('vendorAddress', v)} />
              <TextField label="No. telepon" value={fields.vendorPhone} onChange={v => patchField('vendorPhone', v)} />
            </Section>

            <Section title="4 · Pihak Kedua (Klien)">
              <TextField label="Nama klien" value={fields.clientName} onChange={v => patchField('clientName', v)} />
              <TextField label="No. KTP/NIK (opsional)" value={fields.clientIdNumber} onChange={v => patchField('clientIdNumber', v)} />
              <AreaField label="Alamat klien" rows={2} value={fields.clientAddress} onChange={v => patchField('clientAddress', v)} />
              <TextField label="No. telepon" value={fields.clientPhone} onChange={v => patchField('clientPhone', v)} />
            </Section>

            <Section title="5 · Pekerjaan & Pembayaran">
              <TextField label="Judul proyek" value={fields.projectTitle} onChange={v => patchField('projectTitle', v)} />
              <AreaField label="Lokasi pekerjaan" rows={2} value={fields.projectAddress} onChange={v => patchField('projectAddress', v)} />
              <AreaField
                label="Uraian lingkup (masuk ke Pasal 1)"
                rows={5}
                value={fields.scope}
                onChange={v => patchField('scope', v)}
                hint="Awali baris dengan a. b. c. atau - agar tampil sebagai daftar."
              />
              <label className="block">
                <span className={labelCls}>Nilai perjanjian (Rp)</span>
                <input
                  value={valueInput}
                  inputMode="numeric"
                  onChange={e => {
                    setValueInput(e.target.value);
                    patchField('contractValue', Math.max(0, parseNumberId(e.target.value)));
                  }}
                  className={`${inputCls} font-semibold tabular-nums`}
                />
              </label>
              <AreaField
                label="Skema pembayaran"
                rows={5}
                value={fields.paymentTerms}
                onChange={v => patchField('paymentTerms', v)}
              />
              <button
                type="button"
                onClick={() => patchField('paymentTerms', buildPaymentTermsText(draft))}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"
              >
                <RotateCcw className="w-3 h-3" /> Ambil ulang dari jadwal tagihan estimasi
              </button>
              <AreaField label="Rekening pembayaran" rows={2} value={fields.bankInfo} onChange={v => patchField('bankInfo', v)} />
            </Section>

            <Section title="6 · Waktu & Ketentuan" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Mulai kerja" type="date" value={fields.startDate} onChange={v => patchField('startDate', v)} />
                <NumField label="Durasi (hari)" value={fields.durationDays} onChange={v => patchField('durationDays', v)} />
                <NumField label="Garansi (hari)" value={fields.warrantyDays} onChange={v => patchField('warrantyDays', v)} />
                <NumField label="Denda / hari (%)" step={0.05} value={fields.penaltyPct} onChange={v => patchField('penaltyPct', v)} />
                <NumField label="Retensi (%)" value={fields.retentionPct} onChange={v => patchField('retentionPct', v)} />
                <NumField label="Jumlah revisi" value={fields.revisionCount} onChange={v => patchField('revisionCount', v)} />
              </div>
              <TextField
                label="Domisili hukum (Pengadilan Negeri)"
                value={fields.jurisdiction}
                onChange={v => patchField('jurisdiction', v)}
                placeholder="Jakarta Selatan"
              />
            </Section>

            <Section title="7 · Tampilan Dokumen" defaultOpen={false}>
              <Toggle label="Tanda tangan vendor (dari Pengaturan PDF)" checked={fields.showSignature} onChange={v => patchField('showSignature', v)} />
              <Toggle label="Kotak materai" checked={fields.showMaterai} onChange={v => patchField('showMaterai', v)} />
              <Toggle label="Kolom saksi" checked={fields.showWitness} onChange={v => patchField('showWitness', v)} />
              <Toggle label="Lampiran A — rincian pekerjaan & harga" checked={fields.showAppendix} onChange={v => patchField('showAppendix', v)} />
            </Section>

            <Section title={`8 · Klausul / Pasal (${clauses.length})`} defaultOpen={false}>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Edit teks bebas. Gunakan placeholder agar terisi otomatis:{' '}
                {CONTRACT_PLACEHOLDERS.slice(0, 8).map(p => (
                  <code key={p.key} className="bg-white border border-slate-200 rounded px-1 mr-1" title={p.label}>{`{{${p.key}}}`}</code>
                ))}
                …
              </p>
              {clauses.map((cl, idx) => (
                <div key={cl.id} className="rounded-xl border border-slate-200 bg-white p-2 space-y-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400 w-12 shrink-0">Pasal {idx + 1}</span>
                    <input
                      value={cl.title}
                      onChange={e => patchClause(idx, { title: e.target.value })}
                      className="flex-1 min-w-0 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500"
                    />
                    <button type="button" onClick={() => moveClause(idx, -1)} className="p-1 rounded hover:bg-slate-100" aria-label="Naik">
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button type="button" onClick={() => moveClause(idx, 1)} className="p-1 rounded hover:bg-slate-100" aria-label="Turun">
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setClauses(clauses.filter((_, i) => i !== idx))}
                      className="p-1 rounded hover:bg-red-50"
                      aria-label="Hapus pasal"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <textarea
                    value={cl.body}
                    rows={Math.min(10, Math.max(3, cl.body.split('\n').length + 1))}
                    onChange={e => patchClause(idx, { body: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] leading-relaxed resize-y outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClauses([...clauses, { id: `custom-${Date.now()}`, title: 'Ketentuan Tambahan', body: '' }])}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah pasal
                </button>
                <button
                  type="button"
                  onClick={resetClauses}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </Section>

            <p className="text-[10px] text-slate-400 leading-relaxed pb-2">
              Perubahan tersimpan otomatis di perangkat ini. Template adalah contoh umum dan bukan nasihat hukum —
              sesuaikan dengan kebutuhan atau konsultasikan dengan penasihat hukum untuk proyek bernilai besar.
            </p>
          </div>

          <div className="relative bg-slate-100 min-h-[240px] lg:min-h-0">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600">{error}</div>
            )}
            {pdfBlob && !error && (
              <PdfBlobCanvasViewer blob={pdfBlob} title={contractPdfFilename(draft)} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function NumField({
  label, value, onChange, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={inputCls}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 rounded border-slate-300 text-emerald-600"
      />
      <span className="text-xs text-slate-700">{label}</span>
    </label>
  );
}

/** Miniatur layout tiap desain (hanya ilustrasi, bukan render PDF). */
function DesignThumb({ design, accent }: { design: string; accent: string }) {
  const line = 'h-[3px] rounded bg-slate-200';
  return (
    <div className="h-20 rounded-lg border border-slate-100 bg-white p-1.5 overflow-hidden">
      {design === 'formal' && (
        <div className="space-y-1">
          <div className="mx-auto h-1.5 w-10 rounded" style={{ background: accent }} />
          <div className="h-[2px]" style={{ background: accent }} />
          <div className="mx-auto h-1 w-14 bg-slate-700 rounded" />
          <div className={line} /><div className={line} /><div className="h-[3px] w-2/3 rounded bg-slate-200" />
        </div>
      )}
      {design === 'modern' && (
        <div className="space-y-1">
          <div className="flex h-6 rounded overflow-hidden">
            <div className="flex-1 bg-slate-100" />
            <div className="w-1/2" style={{ background: accent }} />
          </div>
          <div className="h-1 w-8 rounded" style={{ background: accent }} />
          <div className={line} /><div className={line} /><div className="h-[3px] w-1/2 rounded bg-slate-200" />
        </div>
      )}
      {design === 'minimal' && (
        <div className="space-y-1">
          <div className="h-[3px] w-6 rounded bg-slate-300" />
          <div className="h-2 w-16 rounded bg-slate-800" />
          <div className="h-px bg-slate-300" />
          <div className={line} /><div className={line} /><div className="h-[3px] w-1/2 rounded bg-slate-200" />
        </div>
      )}
      {design === 'bold' && (
        <div className="flex gap-1.5">
          <div className="w-1.5 h-16 rounded-sm" style={{ background: accent }} />
          <div className="flex-1 space-y-1">
            <div className="h-2 w-16 rounded bg-slate-800" />
            <div className="h-2 rounded bg-slate-100 flex"><div className="w-4" style={{ background: accent }} /></div>
            <div className={line} /><div className={line} />
          </div>
        </div>
      )}
    </div>
  );
}
