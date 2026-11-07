import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  List,
  Rocket,
  Save,
  Send,
  Eye,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sliders,
  Building2,
  User as UserIcon,
  Globe,
  Bell,
  Bug,
  Lock,
  Bot,
} from 'lucide-react';
import { redirectToCheckout } from '../../lib/checkout';
import {
  canUseCustomBranding,
  computeEstimatorProCheckoutAmount,
  isAdminFullAccess,
  isEstimatorProUpgrade,
  ENTITLEMENT_PREVIEW_OPTIONS,
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
import {
  loadTelegramConfig,
  saveTelegramConfig,
  testTelegramBot,
  sendTelegramMessage,
  type TelegramConfig,
} from '../../services/telegramService';
import { isPlatformAdmin } from '../../services/adminService';
import type { WhatsAppTemplateConfig } from '../../lib/whatsappQuotationMessage';
import { billingConfigFromOrgDefaults } from '../../lib/estimationBillingConfig';
import EstimationBillingScheduleEditor from '../../components/estimator/detail/EstimationBillingScheduleEditor';
import type { EstimationBillingConfig } from '../../types/estimator';
import type { PdfSettings } from '../../types/pdfSettings';

export default function EstimatorSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const {
    tenant,
    user,
    platformRole,
    entitlementPreviewMode,
    setEntitlementPreviewMode,
    uiViewMode,
    setUiViewMode,
  } = useAppStore();

  const showToast = useUiStore(s => s.showToast);
  const entitlement = useEntitlement();
  const isSuperAdmin = isPlatformAdmin(platformRole, user?.email);
  const showProUpgrade = !isAdminFullAccess(platformRole, user?.email, entitlementPreviewMode)
    && isEstimatorProUpgrade(entitlement);
  const allowBranding = canUseCustomBranding(entitlement);
  const proUpgradeAmount = computeEstimatorProCheckoutAmount(entitlement);

  const [settings, setSettings] = useState<PdfSettings | null>(null);
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateConfig>(defaultWhatsAppTemplateConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<
    'company' | 'whatsapp' | 'billing' | 'tools' | 'telegram' | 'admin-mode' | 'all-settings'
  >(() => {
    if (tabParam === 'telegram') return 'telegram';
    if (tabParam === 'admin-mode' || tabParam === 'mode') return 'admin-mode';
    if (tabParam === 'all-settings' || tabParam === 'all') return 'all-settings';
    if (tabParam === 'whatsapp') return 'whatsapp';
    if (tabParam === 'billing') return 'billing';
    if (tabParam === 'tools') return 'tools';
    return 'company';
  });

  const [pdfKind, setPdfKind] = useState<'quotation' | 'invoice'>('quotation');
  const [previewDisplay, setPreviewDisplay] = useState<PreviewDisplayToggles>({
    showLogo: true,
    showSignature: true,
    showStamp: true,
    showFooter: true,
  });

  // Telegram Config State
  const [teleConfig, setTeleConfig] = useState<TelegramConfig>(() => loadTelegramConfig());
  const [testingBot, setTestingBot] = useState(false);
  const [botTestResult, setBotTestResult] = useState<{ ok: boolean; username?: string; name?: string; error?: string } | null>(null);
  const [testChatMsg, setTestChatMsg] = useState('Halo dari Monefyi Estimator! Notifikasi bot Telegram berhasil terhubung. 🚀');
  const [sendingTestMsg, setSendingTestMsg] = useState(false);

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
        default_billing_milestones: settings.default_billing_milestones ?? null,
      });
      await saveWhatsAppTemplate(tenant.id, waTemplate);
      saveTelegramConfig(teleConfig);
      setSettings(updated);
      showToast('Seluruh pengaturan berhasil disimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTelegram = () => {
    saveTelegramConfig(teleConfig);
    showToast('Pengaturan Telegram berhasil disimpan', 'success');
  };

  const handleTestBot = async () => {
    if (!teleConfig.botToken.trim()) {
      showToast('Masukkan token bot Telegram terlebih dahulu', 'error');
      return;
    }
    setTestingBot(true);
    setBotTestResult(null);
    try {
      const res = await testTelegramBot(teleConfig.botToken.trim());
      setBotTestResult(res);
      if (res.ok) {
        showToast(`Bot terhubung: @${res.username || res.name}`, 'success');
        if (res.username) {
          setTeleConfig(prev => ({ ...prev, botUsername: res.username }));
        }
      } else {
        showToast(res.error || 'Gagal memverifikasi token bot', 'error');
      }
    } finally {
      setTestingBot(false);
    }
  };

  const handleSendTestMessage = async () => {
    const targetChatId = teleConfig.ownerChatId || teleConfig.defaultChannelChatId;
    if (!teleConfig.botToken || !targetChatId) {
      showToast('Token bot dan Chat ID wajib diisi untuk tes kirim pesan', 'error');
      return;
    }
    setSendingTestMsg(true);
    try {
      const res = await sendTelegramMessage(teleConfig.botToken, targetChatId, testChatMsg);
      if (res.ok) {
        showToast('Pesan berhasil terkirim ke Telegram!', 'success');
      } else {
        showToast(res.error || 'Gagal mengirim pesan ke Telegram', 'error');
      }
    } finally {
      setSendingTestMsg(false);
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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-20">
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
          <span>Profil perusahaan & identitas</span>
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
        <button type="button" onClick={() => navigate('/app/estimator')} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900 truncate">Pengaturan Estimator & Workspace</h1>
          <p className="text-xs sm:text-sm text-slate-500 truncate">Branding PDF, WhatsApp, Bot Telegram & Pilihan Mode Admin</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="hidden sm:inline">Simpan Semua</span>
          <span className="sm:hidden">Simpan</span>
        </button>
      </div>

      {/* Tabs Menu Responsif (Horizontal Scrollable pada Tampilan Mobile) */}
      <div className="flex gap-1.5 overflow-x-auto mb-6 pb-1.5 -mx-1 px-1 no-scrollbar">
        {([
          ['company', 'Perusahaan & PDF', null],
          ['whatsapp', 'WhatsApp', null],
          ['billing', 'Pembayaran', null],
          ['tools', 'Pricelist & Tools', null],
          ['telegram', '🤖 Telegram & Bot', 'Bot'],
          ['admin-mode', '👑 Pilihan Mode Admin', 'Peran'],
          ['all-settings', '⚙️ Pengaturan Lengkap', 'Semua'],
        ] as const).map(([id, label, badge]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === id
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{label}</span>
            {badge && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                activeTab === id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`space-y-4 ${activeTab === 'company' ? '' : 'lg:col-span-2'}`}>
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

        <Section title="Rekening Bank">
          <Field label="Nama bank" value={settings.bank_name || ''} onChange={v => patch({ bank_name: v })} />
          <Field label="No. rekening" value={settings.bank_account || ''} onChange={v => patch({ bank_account: v })} />
          <Field label="Atas nama" value={settings.bank_account_name || ''} onChange={v => patch({ bank_account_name: v })} />
        </Section>

        <Section title="Tanda Tangan & Cap">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama" value={settings.signature_name || ''} onChange={v => patch({ signature_name: v })} />
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
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
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
            className="text-xs text-emerald-600 font-semibold cursor-pointer"
          >
            Reset template default
          </button>
        </Section>
        )}

        {activeTab === 'billing' && (
        <Section title="Default Jadwal Tagihan">
          <p className="text-xs text-slate-500">
            Atur persentase DP, termin, dan pelunasan untuk estimasi baru. Total harus 100%.
          </p>
          <EstimationBillingScheduleEditor
            config={billingConfigFromOrgDefaults(
              settings.default_billing_milestones,
              settings.default_dp_pct ?? 50,
            )}
            onChange={(cfg: EstimationBillingConfig) => {
              const dpPct = cfg.milestones.find(m => m.key === 'dp')?.pct ?? settings.default_dp_pct ?? 50;
              patch({
                default_billing_milestones: cfg.milestones,
                default_dp_pct: dpPct,
              });
            }}
          />
          <p className="text-[10px] text-slate-500">
            Setiap estimasi bisa menyesuaikan jadwal tagihan per proyek di menu Dokumen & Pembayaran.
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 cursor-pointer"
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
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Buka Ulang Onboarding
          </button>
        </section>
        </>
        )}

        {/* TAB TELEGRAM & BOT SETTINGS */}
        {activeTab === 'telegram' && (
          <div className="space-y-4">
            <Section title="Status & Kredensial Bot Telegram">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-sm font-bold text-slate-900">Aktifkan Notifikasi Telegram</div>
                  <div className="text-xs text-slate-500">Kirim update estimasi dan laporan RAB ke bot / channel Telegram</div>
                </div>
                <input
                  type="checkbox"
                  checked={teleConfig.enabled}
                  onChange={e => setTeleConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Telegram Bot Token (@BotFather)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={teleConfig.botToken}
                    onChange={e => setTeleConfig(prev => ({ ...prev, botToken: e.target.value.trim() }))}
                    placeholder="Contoh: 1234567890:ABCdefGHIjklMNOpqrSTUvwxyz"
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleTestBot}
                    disabled={testingBot || !teleConfig.botToken}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {testingBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Tes Bot</span>
                  </button>
                </div>
                {botTestResult && (
                  <div className={`mt-2 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    botTestResult.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {botTestResult.ok ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>Bot Aktif: <strong>@{botTestResult.username || botTestResult.name}</strong></span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{botTestResult.error || 'Gagal koneksi ke bot'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Chat ID Owner / Admin
                  </label>
                  <input
                    value={teleConfig.ownerChatId || ''}
                    onChange={e => setTeleConfig(prev => ({ ...prev, ownerChatId: e.target.value.trim() }))}
                    placeholder="Contoh: 123456789"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Chat ID akun Telegram Anda (didapat via @userinfobot)</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Chat ID Grup / Channel Estimator
                  </label>
                  <input
                    value={teleConfig.defaultChannelChatId || ''}
                    onChange={e => setTeleConfig(prev => ({ ...prev, defaultChannelChatId: e.target.value.trim() }))}
                    placeholder="Contoh: -100123456789"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Untuk broadcast otomatis penawaran ke grup tim proyek</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveTelegram}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
              >
                Simpan Konfigurasi Bot Telegram
              </button>
            </Section>

            <Section title="Tes Pengiriman Pesan ke Telegram">
              <label className="block">
                <span className="text-xs text-slate-600 font-medium">Pesan Uji Coba:</span>
                <textarea
                  value={testChatMsg}
                  onChange={e => setTestChatMsg(e.target.value)}
                  rows={2}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none"
                />
              </label>
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={sendingTestMsg || !teleConfig.botToken}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {sendingTestMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Kirim Pesan Uji Coba ke Telegram</span>
              </button>
            </Section>

            <Section title="Panduan Menghubungkan Telegram">
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p>1. Buka aplikasi Telegram, cari <strong>@BotFather</strong>, kirim perintah <code>/newbot</code>, lalu ikuti instruksi untuk membuat bot dan menyalin <strong>Bot Token</strong>.</p>
                <p>2. Mulai chat dengan bot Anda (buka bot dan tekan <strong>Start</strong>) atau undang bot ke grup proyek Anda.</p>
                <p>3. Cari <strong>@userinfobot</strong> di Telegram untuk mengetahui Chat ID Anda, atau <strong>@getidsbot</strong> untuk Chat ID grup.</p>
                <p>4. Masukkan Token dan Chat ID pada form di atas, lalu klik <strong>Tes Bot</strong> &amp; <strong>Simpan</strong>.</p>
              </div>
            </Section>
          </div>
        )}

        {/* TAB PILIHAN MODE ADMIN & PRATINJAU */}
        {activeTab === 'admin-mode' && (
          <div className="space-y-4">
            <Section title="Mode Pratinjau Peran (Role View Mode)">
              <p className="text-xs text-slate-500 mb-2">
                Pilih peran tampilan antarmuka aplikasi. Berguna untuk melihat aplikasi dari sudut pandang peran yang berbeda di mobile.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'auto' as const, label: 'Otomatis', desc: 'Sesuai peran akun login Anda' },
                  { id: 'owner' as const, label: 'Pemilik (Owner)', desc: 'Tampilan penuh admin & manajemen' },
                  { id: 'worker' as const, label: 'Pekerja (Worker)', desc: 'Tampilan ringkas khusus mandor/tukang' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setUiViewMode(m.id);
                      showToast(`Mode tampilan diubah ke: ${m.label}`, 'success');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      uiViewMode === m.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm">{m.label}</span>
                      {uiViewMode === m.id && (
                        <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{m.desc}</p>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Skenario Paket Entitlement (Admin Test)">
              <p className="text-xs text-slate-500 mb-2">
                Uji coba batasan fitur paket (Free, Standard, Pro, Enterprise) tanpa harus mengubah data database akun.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ENTITLEMENT_PREVIEW_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setEntitlementPreviewMode(opt.id);
                      showToast(`Skenario paket diubah ke: ${opt.label}`, 'success');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      entitlementPreviewMode === opt.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs sm:text-sm">{opt.label}</span>
                      {entitlementPreviewMode === opt.id && (
                        <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </Section>

            {isSuperAdmin && (
              <Section title="Super Admin Platform">
                <p className="text-xs text-slate-500 mb-3">
                  Kelola integrasi AI Dual-LLM, Meta Ads API, CAPI Token, dan monitoring server.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Buka Panel Super Admin →</span>
                </button>
              </Section>
            )}
          </div>
        )}

        {/* TAB PENGATURAN LENGKAP WORKSPACE */}
        {activeTab === 'all-settings' && (
          <div className="space-y-4">
            <Section title="Direktori Pengaturan Lengkap Workspace">
              <p className="text-xs text-slate-500 mb-3">
                Akses semua halaman pengaturan aplikasi monefyi langsung dari mobile:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { href: '/app?tab=settings&st=profil', label: 'Profil Saya', desc: 'Nama lengkap, email, nomor HP & kata sandi', icon: UserIcon, color: 'text-blue-600 bg-blue-50' },
                  { href: '/app?tab=settings&st=organisasi', label: 'Organisasi & Brand', desc: 'Nama perusahaan, zona waktu, mata uang & warna tema', icon: Building2, color: 'text-emerald-600 bg-emerald-50' },
                  { href: '/app?tab=settings&st=koordinasi', label: 'Koordinasi Tim & AI', desc: 'Pengingat mandor, absensi tukang & bot Telegram', icon: Bot, color: 'text-sky-600 bg-sky-50' },
                  { href: '/app/estimator/pricelist', label: 'Pricelist Master', desc: 'Katalog harga material, upah kerja & subkon', icon: List, color: 'text-purple-600 bg-purple-50' },
                  { href: '/app?tab=settings&st=domain', label: 'Custom Domain', desc: 'Domain kustom mandiri untuk organisasi', icon: Globe, color: 'text-teal-600 bg-teal-50' },
                  { href: '/app?tab=settings&st=notifikasi', label: 'Preferensi Notifikasi', desc: 'Pengaturan email notifikasi & pengingat sistem', icon: Bell, color: 'text-amber-600 bg-amber-50' },
                  { href: '/app?tab=settings&st=keamanan', label: 'Keamanan Akun', desc: 'Ganti password dan sign-out semua perangkat', icon: Lock, color: 'text-rose-600 bg-rose-50' },
                  { href: '/app?tab=settings&st=diagnostik', label: 'Trace & Diagnostik', desc: 'Pelacak error real-time & log sistem', icon: Bug, color: 'text-slate-600 bg-slate-100' },
                  { href: '/admin', label: 'Super Admin & AI Config', desc: 'Pengaturan Multi-LLM, API Key & Meta CAPI', icon: Shield, color: 'text-amber-700 bg-amber-100' },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.href)}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <item.icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 flex items-center gap-1">
                        <span>{item.label}</span>
                        <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          </div>
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

