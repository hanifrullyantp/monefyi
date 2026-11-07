import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, List, Rocket, Save, FileSignature, X, Check } from 'lucide-react';
import { SignaturePadCanvas, type SignaturePadHandle } from '../signature/SignaturePadCanvas';
import { redirectToCheckout } from '../../../lib/checkout';
import {
  canUseCustomBranding,
  computeEstimatorProCheckoutAmount,
  isAdminFullAccess,
  isEstimatorProUpgrade,
} from '../../../lib/entitlement';
import { useEntitlement } from '../../../hooks/useEntitlement';
import EstimatorOnboardingWizard from '../EstimatorOnboardingWizard';
import { resetEstimatorOnboarding } from '../../../lib/estimatorOnboarding';
import LogoUpload from '../LogoUpload';
import TemplateSelector from '../pdf-settings/TemplateSelector';
import TemplateCustomizer from '../pdf-settings/TemplateCustomizer';
import type { PreviewDisplayToggles } from '../pdf-settings/TemplateCustomizer';
import TemplatePreview from '../pdf-settings/TemplatePreview';
import { loadPdfSettings, updatePdfSettings } from '../../../services/pdfSettingsService';
import {
  loadWhatsAppTemplate,
  saveWhatsAppTemplate,
  defaultWhatsAppTemplateConfig,
} from '../../../services/quotationTemplateService';
import type { WhatsAppTemplateConfig } from '../../../lib/whatsappQuotationMessage';
import { billingConfigFromOrgDefaults } from '../../../lib/estimationBillingConfig';
import EstimationBillingScheduleEditor from '../detail/EstimationBillingScheduleEditor';
import type { EstimationBillingConfig } from '../../../types/estimator';
import { useAppStore } from '../../../store/appStore';
import { useUiStore } from '../../../store/uiStore';
import type { PdfSettings } from '../../../types/pdfSettings';

export default function EstimatorSettingsPanel() {
  const navigate = useNavigate();
  const { tenant, user, platformRole, entitlementPreviewMode } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const entitlement = useEntitlement();
  const showProUpgrade = !isAdminFullAccess(platformRole, user?.email, entitlementPreviewMode)
    && isEstimatorProUpgrade(entitlement);
  const allowBranding = canUseCustomBranding(entitlement);
  const proUpgradeAmount = computeEstimatorProCheckoutAmount(entitlement);

  const [settings, setSettings] = useState<PdfSettings | null>(null);
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateConfig>(defaultWhatsAppTemplateConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [settingsPadOpen, setSettingsPadOpen] = useState(false);
  const settingsPadRef = useRef<SignaturePadHandle | null>(null);

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

  useEffect(() => { void load(); }, [load]);

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
        default_billing_milestones: settings.default_billing_milestones ?? null,
      });
      await saveWhatsAppTemplate(tenant.id, waTemplate);
      setSettings(updated);
      showToast('Pengaturan Estimator & template berhasil disimpan ke Supabase Cloud', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-16">
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
    <div className="space-y-6">
      {showSetupBanner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Setup identitas perusahaan Anda agar penawaran terlihat profesional. Mulai dari nama dan logo.
        </div>
      )}

      {showProUpgrade && tenant?.id && user?.id && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white shrink-0 cursor-pointer shadow-sm hover:bg-emerald-700"
          >
            <Rocket className="w-4 h-4" />
            Upgrade Pro
          </button>
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
          <span>Kelengkapan Profil Penawaran & PDF</span>
          <span>{progressDone}/9 lengkap</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(progressDone / 9) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Branding Estimator & PDF Penawaran</h3>
          <p className="text-xs text-slate-500">Kop surat, logo, template WhatsApp, rekening bank, dan skema pembayaran</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Simpan Penawaran & PDF</span>
        </button>
      </div>

      {/* Sub-tab Responsif */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {([
          ['company', 'Perusahaan & Kop Surat'],
          ['whatsapp', 'Template WhatsApp'],
          ['billing', 'Skema Pembayaran'],
          ['tools', 'Pricelist & Bantuan'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`space-y-4 ${activeTab === 'company' ? '' : 'lg:col-span-2'}`}>
          {activeTab === 'company' && (
            <>
              <Section title="Identitas Perusahaan & Kop Surat">
                <Field label="Nama perusahaan" value={settings.company_name || ''} onChange={v => patch({ company_name: v })} />
                <Field label="Tagline" value={settings.company_tagline || ''} onChange={v => patch({ company_tagline: v })} />
                <Field label="Alamat" value={settings.address || ''} onChange={v => patch({ address: v })} multiline />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Telepon" value={settings.phone || ''} onChange={v => patch({ phone: v })} />
                  <Field label="Email" value={settings.email || ''} onChange={v => patch({ email: v })} />
                </div>
                <Field label="Website" value={settings.website || ''} onChange={v => patch({ website: v })} />
                {tenant?.id && allowBranding && (
                  <LogoUpload
                    orgId={tenant.id}
                    kind="logo"
                    label="Logo perusahaan"
                    value={settings.logo_url}
                    onChange={url => patch({ logo_url: url })}
                    onError={msg => showToast(msg, 'error')}
                  />
                )}
                {tenant?.id && !allowBranding && (
                  <p className="text-xs text-slate-500">Logo perusahaan tersedia di Estimator Pro.</p>
                )}
              </Section>

              <Section title="Rekening Bank Penampung">
                <Field label="Nama bank" value={settings.bank_name || ''} onChange={v => patch({ bank_name: v })} />
                <Field label="No. rekening" value={settings.bank_account || ''} onChange={v => patch({ bank_account: v })} />
                <Field label="Atas nama" value={settings.bank_account_name || ''} onChange={v => patch({ bank_account_name: v })} />
              </Section>

              <Section title="Tanda Tangan & Cap Digital">
                {!allowBranding && (
                  <p className="text-xs text-slate-500">Gambar tanda tangan dan cap tersedia di Estimator Pro. PDF paket Gratis tetap berwatermark.</p>
                )}
                {tenant?.id && allowBranding && (
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
                {tenant?.id && allowBranding && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setSettingsPadOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition border border-slate-200 cursor-pointer"
                    >
                      <FileSignature className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Buat Tanda Tangan Langsung di Layar HP</span>
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nama Pejabat" value={settings.signature_name || ''} onChange={v => patch({ signature_name: v })} />
                  <Field label="Jabatan" value={settings.signature_title || ''} onChange={v => patch({ signature_title: v })} />
                </div>
                {tenant?.id && allowBranding && (
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
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${pdfKind === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                  >
                    {id === 'quotation' ? 'Format Penawaran' : 'Format Invoice'}
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
                onDisplayChange={p => setPreviewDisplay((prev: PreviewDisplayToggles) => ({ ...prev, ...p }))}
              />
            </>
          )}

          {activeTab === 'whatsapp' && (
            <Section title="Template Pesan WhatsApp Penawaran">
              <p className="text-xs text-slate-500">
                Placeholder yang dapat digunakan:
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
                <span className="text-xs text-slate-500 font-semibold">Isi pesan utama penawaran</span>
                <textarea
                  value={waTemplate.body}
                  onChange={e => setWaTemplate(prev => ({ ...prev, body: e.target.value }))}
                  rows={8}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none font-mono leading-relaxed"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="text-xs text-emerald-600 font-semibold cursor-pointer hover:underline"
              >
                Reset ke template default
              </button>
            </Section>
          )}

          {activeTab === 'billing' && (
            <Section title="Skema Pembayaran Proyek Default">
              <p className="text-xs text-slate-500">
                Atur persentase DP, termin, dan pelunasan default untuk estimasi baru. Total persentase harus 100%.
              </p>
              <EstimationBillingScheduleEditor
                config={billingConfigFromOrgDefaults(
                  settings.default_billing_milestones,
                  settings.default_dp_pct ?? 50,
                )}
                onChange={(cfg: EstimationBillingConfig) => {
                  const dpPct = cfg.milestones.find((m: any) => m.key === 'dp')?.pct ?? settings.default_dp_pct ?? 50;
                  patch({
                    default_billing_milestones: cfg.milestones,
                    default_dp_pct: dpPct,
                  });
                }}
              />
              <p className="text-[11px] text-slate-500">
                Setiap estimasi dapat menyesuaikan jadwal termin pembayaran secara mandiri di halaman rincian estimasi.
              </p>
            </Section>
          )}

          {activeTab === 'tools' && (
            <>
              <Section title="Pricelist Master">
                <p className="text-xs text-slate-500 mb-3">Kelola katalog harga master material, upah tenaga kerja, dan subkontraktor.</p>
                <button
                  type="button"
                  onClick={() => navigate('/app/estimator/pricelist')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <List className="w-4 h-4" />
                  Buka Master Pricelist
                </button>
              </Section>
              <section className="bg-white border border-slate-200 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Panduan Onboarding</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Ulangi wizard panduan awal pengisian identitas dan pricelist.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!user?.id) return;
                    resetEstimatorOnboarding(user.id);
                    setOnboardingOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Buka Ulang Onboarding
                </button>
              </section>
            </>
          )}
        </div>

        {activeTab === 'company' && (
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

      {settingsPadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-800 text-sm">Gores Tanda Tangan di Layar HP</h4>
              </div>
              <button
                type="button"
                onClick={() => setSettingsPadOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <SignaturePadCanvas
              ref={settingsPadRef}
              initialDataUri={settings?.signature_url}
              height={170}
              label="Tanda Tangan Pejabat / Perusahaan"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSettingsPadOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const uri = settingsPadRef.current?.getDataUri();
                  if (uri) {
                    patch({ signature_url: uri });
                    showToast('Tanda tangan digital berhasil dipilih. Klik Simpan di atas untuk menyimpan.', 'success');
                  }
                  setSettingsPadOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Gunakan Tanda Tangan Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
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
      <span className="text-xs text-slate-500 font-semibold">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      )}
    </label>
  );
}
