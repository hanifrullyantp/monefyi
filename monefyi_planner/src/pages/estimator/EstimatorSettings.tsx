import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, List, Rocket, Save } from 'lucide-react';
import { redirectToCheckout } from '../../lib/checkout';
import {
  computeEstimatorProCheckoutAmount,
  isAdminFullAccess,
  isEstimatorProUpgrade,
} from '../../lib/entitlement';
import { useEntitlement } from '../../hooks/useEntitlement';
import EstimatorOnboardingWizard from '../../components/estimator/EstimatorOnboardingWizard';
import { resetEstimatorOnboarding } from '../../lib/estimatorOnboarding';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import EstimatorBreadcrumb from '../../components/estimator/EstimatorBreadcrumb';
import LogoUpload from '../../components/estimator/LogoUpload';
import TemplateSelector from '../../components/estimator/pdf-settings/TemplateSelector';
import TemplatePreview from '../../components/estimator/pdf-settings/TemplatePreview';
import TemplateCustomizer, { type PreviewDisplayToggles } from '../../components/estimator/pdf-settings/TemplateCustomizer';
import { loadPdfSettings, updatePdfSettings } from '../../services/pdfSettingsService';
import {
  loadWhatsAppTemplate,
  saveWhatsAppTemplate,
  defaultWhatsAppTemplateConfig,
} from '../../services/quotationTemplateService';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import { defaultBillingMilestones } from '../../lib/estimationBillingConfig';
import type { PdfSettings } from '../../types/pdfSettings';

export default function EstimatorSettings() {
  const navigate = useNavigate();
  const { tenant, user, platformRole, entitlementPreviewMode } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const entitlement = useEntitlement();
  const showProUpgrade = !isAdminFullAccess(platformRole, user?.email, entitlementPreviewMode)
    && isEstimatorProUpgrade(entitlement);
  const proUpgradeAmount = computeEstimatorProCheckoutAmount(entitlement);
  const [settings, setSettings] = useState<PdfSettings | null>(null);
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateConfig>(defaultWhatsAppTemplateConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'whatsapp' | 'billing' | 'tools'>('company');
  const [pdfKind, setPdfKind] = useState<'quotation' | 'invoice'>('quotation');
  const [previewDisplay, setPreviewDisplay] = useState<PreviewDisplayToggles>({
    showLogo: true,
    showSignature: true,
    showStamp: true,
    showFooter: true,
  });

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
        default_invoice_template: settings.default_invoice_template,
        footer_text: settings.footer_text,
        watermark_text: settings.watermark_text,
        stamp_url: settings.stamp_url,
        default_dp_pct: settings.default_dp_pct ?? 50,
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

  const progressFields = [
    Boolean(settings.company_name?.trim()),
    Boolean(settings.phone?.trim()),
    Boolean(settings.address?.trim()),
    Boolean(settings.logo_url),
    Boolean(settings.bank_name?.trim() && settings.bank_account?.trim()),
    Boolean(settings.signature_url || settings.signature_name?.trim()),
    Boolean(settings.default_pdf_template),
    Boolean(settings.primary_color),
    Boolean(waTemplate.body?.trim()),
  ];
  const progressDone = progressFields.filter(Boolean).length;

  const showSetupBanner = !settings.company_name?.trim();

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <EstimatorBreadcrumb items={[{ label: 'Pengaturan' }]} />

      {showSetupBanner && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Setup identitas perusahaan Anda agar penawaran terlihat profesional. Mulai dari nama dan logo.
        </div>
      )}

      {showProUpgrade && tenant?.id && user?.id && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-emerald-900">
            <p className="font-semibold">Upgrade ke Estimator Pro</p>
            <p className="text-emerald-800 mt-0.5">
              Kwitansi PDF, pricelist kustom &amp; lebih banyak template — selisih Rp {proUpgradeAmount.toLocaleString('id-ID')}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => redirectToCheckout('estimator_pro', {
              orgId: tenant.id,
              userId: user.id,
              email: user.email ?? undefined,
              checkoutAmount: proUpgradeAmount,
              upgradeFrom: 'estimator_standard',
            })}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white shrink-0"
          >
            <Rocket className="w-4 h-4" />
            Upgrade Pro
          </button>
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
          <span>Profil perusahaan</span>
          <span>{progressDone}/9 lengkap</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(progressDone / 9) * 100}%` }}
          />
        </div>
      </div>

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

      <div className="flex gap-1 overflow-x-auto mb-6 pb-1 -mx-1 px-1">
        {([
          ['company', 'Perusahaan & PDF'],
          ['whatsapp', 'WhatsApp'],
          ['billing', 'Pembayaran'],
          ['tools', 'Pricelist & Lainnya'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
        {activeTab === 'company' && (
        <>
        <Section title="Identitas Perusahaan">
          <Field label="Nama perusahaan" value={settings.company_name || ''} onChange={v => patch({ company_name: v })} />
          <Field label="Tagline" value={settings.company_tagline || ''} onChange={v => patch({ company_tagline: v })} />
          <Field label="Alamat" value={settings.address || ''} onChange={v => patch({ address: v })} multiline />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon" value={settings.phone || ''} onChange={v => patch({ phone: v })} />
            <Field label="Email" value={settings.email || ''} onChange={v => patch({ email: v })} />
          </div>
          <Field label="Website" value={settings.website || ''} onChange={v => patch({ website: v })} />
          {tenant?.id && (
            <LogoUpload
              orgId={tenant.id}
              kind="logo"
              label="Logo perusahaan"
              value={settings.logo_url}
              onChange={url => patch({ logo_url: url })}
              onError={msg => showToast(msg, 'error')}
            />
          )}
        </Section>

        <Section title="Rekening Bank">
          <Field label="Nama bank" value={settings.bank_name || ''} onChange={v => patch({ bank_name: v })} />
          <Field label="No. rekening" value={settings.bank_account || ''} onChange={v => patch({ bank_account: v })} />
          <Field label="Atas nama" value={settings.bank_account_name || ''} onChange={v => patch({ bank_account_name: v })} />
        </Section>

        <Section title="Tanda Tangan & Cap">
          {tenant?.id && (
            <LogoUpload
              orgId={tenant.id}
              kind="signature"
              label="Gambar tanda tangan"
              value={settings.signature_url}
              onChange={url => patch({ signature_url: url })}
              onError={msg => showToast(msg, 'error')}
              previewClassName="w-32 h-16"
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama" value={settings.signature_name || ''} onChange={v => patch({ signature_name: v })} />
            <Field label="Jabatan" value={settings.signature_title || ''} onChange={v => patch({ signature_title: v })} />
          </div>
          {tenant?.id && (
            <LogoUpload
              orgId={tenant.id}
              kind="stamp"
              label="Cap / stamp perusahaan"
              value={settings.stamp_url}
              onChange={url => patch({ stamp_url: url })}
              onError={msg => showToast(msg, 'error')}
              previewClassName="w-24 h-24"
            />
          )}
        </Section>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {(['quotation', 'invoice'] as const).map(id => (
            <button
              key={id}
              type="button"
              onClick={() => setPdfKind(id)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                pdfKind === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {id === 'quotation' ? 'Penawaran' : 'Invoice'}
            </button>
          ))}
        </div>
        <TemplateSelector
          title={pdfKind === 'quotation' ? 'Template penawaran' : 'Template invoice'}
          selected={pdfKind === 'quotation' ? settings.default_pdf_template : settings.default_invoice_template}
          onSelect={id => patch(pdfKind === 'quotation'
            ? { default_pdf_template: id }
            : { default_invoice_template: id })}
        />
        <TemplateCustomizer
          settings={settings}
          onChange={patch}
          display={previewDisplay}
          onDisplayChange={p => setPreviewDisplay(prev => ({ ...prev, ...p }))}
        />
        </>
        )}

        {activeTab === 'whatsapp' && (
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
        )}

        {activeTab === 'billing' && (
        <Section title="Default Jadwal Tagihan">
          <p className="text-xs text-slate-500">
            Persentase DP default untuk estimasi baru. Termin & pelunasan dihitung otomatis dari sisa.
          </p>
          <label className="block">
            <span className="text-xs text-slate-500">DP default ({Math.round(settings.default_dp_pct ?? 50)}%)</span>
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={settings.default_dp_pct ?? 50}
              onChange={e => patch({ default_dp_pct: Number(e.target.value) })}
              className="w-full mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>10%</span>
              <span>50%</span>
              <span>80%</span>
            </div>
          </label>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Preview pembagian</p>
            {defaultBillingMilestones(settings.default_dp_pct ?? 50)
              .filter(m => m.enabled)
              .map(m => (
                <div key={m.key} className="flex justify-between text-xs text-slate-700">
                  <span>{m.label}</span>
                  <span className="font-bold tabular-nums">{m.pct}%</span>
                </div>
              ))}
          </div>
          <p className="text-[10px] text-slate-500">
            Setiap estimasi bisa menyesuaikan jadwal tagihan per proyek di halaman Dokumen & Pembayaran.
          </p>
        </Section>
        )}

        {activeTab === 'tools' && (
        <>
        <Section title="Pricelist">
          <p className="text-xs text-slate-500 mb-3">Kelola harga master material, upah, dan jasa.</p>
          <button
            type="button"
            onClick={() => navigate('/app/estimator/pricelist')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50"
          >
            <List className="w-4 h-4" />
            Buka Pricelist
          </button>
        </Section>
        <section className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Onboarding Estimator</h3>
          <p className="text-xs text-slate-500 mb-3">
            Ulangi wizard setup identitas dan pricelist jika perlu.
          </p>
          <button
            type="button"
            onClick={() => {
              if (!user?.id) return;
              resetEstimatorOnboarding(user.id);
              setOnboardingOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Buka Ulang Onboarding
          </button>
        </section>
        </>
        )}
        </div>
        {(activeTab === 'company') && (
        <TemplatePreview
          kind={pdfKind}
          template={pdfKind === 'quotation' ? settings.default_pdf_template : settings.default_invoice_template}
          settings={settings}
          display={previewDisplay}
        />
        )}
      </div>

      {onboardingOpen && tenant?.id && user?.id && (
        <EstimatorOnboardingWizard
          open={onboardingOpen}
          orgId={tenant.id}
          orgName={tenant.name}
          userId={user.id}
          onClose={() => setOnboardingOpen(false)}
          onCompleted={() => {
            showToast('Onboarding selesai', 'success');
            void load();
          }}
        />
      )}
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

