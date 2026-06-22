import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import ColorPickerField from '../../components/estimator/ColorPickerField';
import { loadPdfSettings, updatePdfSettings } from '../../services/pdfSettingsService';
import {
  loadWhatsAppTemplate,
  saveWhatsAppTemplate,
  defaultWhatsAppTemplateConfig,
} from '../../services/quotationTemplateService';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import { PDF_TEMPLATE_OPTIONS } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';
import type { PdfTemplate } from '../../types/estimator';

export default function EstimatorSettings() {
  const navigate = useNavigate();
  const { tenant } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [settings, setSettings] = useState<PdfSettings | null>(null);
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateConfig>(defaultWhatsAppTemplateConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [data, wa] = await Promise.all([
        loadPdfSettings(tenant.id, tenant.name),
        loadWhatsAppTemplate(tenant.id),
      ]);
      setSettings(data);
      setWaTemplate(wa);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat pengaturan', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, tenant?.name, showToast]);

  useEffect(() => { load(); }, [load]);

  const patch = (p: Partial<PdfSettings>) => {
    setSettings(prev => (prev ? { ...prev, ...p } : prev));
  };

  const handleSave = async () => {
    if (!tenant?.id || !settings) return;
    setSaving(true);
    try {
      const updated = await updatePdfSettings(tenant.id, {
        company_name: settings.company_name,
        company_tagline: settings.company_tagline,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        bank_name: settings.bank_name,
        bank_account: settings.bank_account,
        bank_account_name: settings.bank_account_name,
        signature_name: settings.signature_name,
        signature_title: settings.signature_title,
        logo_url: settings.logo_url,
        signature_url: settings.signature_url,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        default_pdf_template: settings.default_pdf_template,
        footer_text: settings.footer_text,
      });
      await saveWhatsAppTemplate(tenant.id, waTemplate);
      setSettings(updated);
      showToast('Pengaturan disimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate('/app/estimator')} className="p-2 rounded-xl hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900">Pengaturan Estimator</h1>
          <p className="text-sm text-slate-500">Branding & default tampilan PDF penawaran</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan
        </button>
      </div>

      <div className="space-y-4">
        <Section title="Identitas Perusahaan">
          <Field label="Nama perusahaan" value={settings.company_name || ''} onChange={v => patch({ company_name: v })} />
          <Field label="Tagline" value={settings.company_tagline || ''} onChange={v => patch({ company_tagline: v })} />
          <Field label="Alamat" value={settings.address || ''} onChange={v => patch({ address: v })} multiline />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon" value={settings.phone || ''} onChange={v => patch({ phone: v })} />
            <Field label="Email" value={settings.email || ''} onChange={v => patch({ email: v })} />
          </div>
          <Field label="Website" value={settings.website || ''} onChange={v => patch({ website: v })} />
          <Field label="URL Logo (company-assets)" value={settings.logo_url || ''} onChange={v => patch({ logo_url: v || null })} />
        </Section>

        <Section title="Rekening Bank">
          <Field label="Nama bank" value={settings.bank_name || ''} onChange={v => patch({ bank_name: v })} />
          <Field label="No. rekening" value={settings.bank_account || ''} onChange={v => patch({ bank_account: v })} />
          <Field label="Atas nama" value={settings.bank_account_name || ''} onChange={v => patch({ bank_account_name: v })} />
        </Section>

        <Section title="Tanda Tangan">
          <Field label="URL gambar tanda tangan" value={settings.signature_url || ''} onChange={v => patch({ signature_url: v || null })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama" value={settings.signature_name || ''} onChange={v => patch({ signature_name: v })} />
            <Field label="Jabatan" value={settings.signature_title || ''} onChange={v => patch({ signature_title: v })} />
          </div>
        </Section>

        <Section title="Template WhatsApp Penawaran">
          <p className="text-xs text-slate-500">
            Placeholder:
            {' {{salutation}} {{customer_name}} {{title}} {{subtitle}} {{items_list}} {{total}} {{company_name}} {{company_tagline}}'}
          </p>
          <Field
            label="Format baris item"
            value={waTemplate.itemLine}
            onChange={v => setWaTemplate(prev => ({ ...prev, itemLine: v }))}
          />
          <p className="text-[10px] text-slate-600">
            Item: {'{{name}} {{qty}} {{unit}} x {{price}} = {{total}}'}
          </p>
          <label className="block">
            <span className="text-xs text-slate-500">Isi pesan utama</span>
            <textarea
              value={waTemplate.body}
              onChange={e => setWaTemplate(prev => ({ ...prev, body: e.target.value }))}
              rows={8}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none font-mono text-xs leading-relaxed"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Sapaan default"
              value={waTemplate.defaultSalutation}
              onChange={v => setWaTemplate(prev => ({ ...prev, defaultSalutation: v }))}
            />
            <Field
              label="Subjudul produk default"
              value={waTemplate.defaultSubtitle}
              onChange={v => setWaTemplate(prev => ({ ...prev, defaultSubtitle: v }))}
            />
          </div>
          <button
            type="button"
            onClick={() => setWaTemplate(defaultWhatsAppTemplateConfig())}
            className="text-xs text-emerald-600 font-semibold"
          >
            Reset template default
          </button>
        </Section>

        <Section title="Warna & Template PDF">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColorPickerField label="Primary" value={settings.primary_color} onChange={v => patch({ primary_color: v })} />
            <ColorPickerField label="Secondary" value={settings.secondary_color} onChange={v => patch({ secondary_color: v })} />
            <ColorPickerField label="Accent" value={settings.accent_color} onChange={v => patch({ accent_color: v })} />
          </div>
          <label className="block">
            <span className="text-xs text-slate-500">Template default</span>
            <select
              value={settings.default_pdf_template}
              onChange={e => patch({ default_pdf_template: e.target.value as PdfTemplate })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            >
              {PDF_TEMPLATE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <Field label="Footer text" value={settings.footer_text} onChange={v => patch({ footer_text: v })} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
        />
      )}
    </label>
  );
}

