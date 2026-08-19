import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Rocket, X } from 'lucide-react';
import LogoUpload from './LogoUpload';
import PricelistTemplateSelector from './PricelistTemplateSelector';
import { setEstimatorOnboardingCompleted } from '../../lib/estimatorOnboarding';
import { updatePdfSettings } from '../../services/pdfSettingsService';
import { importPricelistTemplate, getPricelistTemplate } from '../../services/pricelistTemplateService';
import { analytics } from '../../lib/analytics/events';
import { useUiStore } from '../../store/uiStore';

type WizardStep = 1 | 2 | 3;

type Props = {
  open: boolean;
  orgId: string;
  orgName: string;
  userId: string;
  onClose: () => void;
  onCompleted?: () => void;
};

export default function EstimatorOnboardingWizard({
  open,
  orgId,
  orgName,
  userId,
  onClose,
  onCompleted,
}: Props) {
  const navigate = useNavigate();
  const showToast = useUiStore(s => s.showToast);
  const [step, setStep] = useState<WizardStep>(1);
  const [companyName, setCompanyName] = useState(orgName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [loadedTemplateName, setLoadedTemplateName] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCompanyName(orgName || '');
    setPhone('');
    setAddress('');
    setLogoUrl(null);
    setTemplateLoaded(false);
    setLoadedTemplateName('');
    analytics.onboardingStarted();
  }, [open, orgName]);

  if (!open) return null;

  const finish = () => {
    setEstimatorOnboardingCompleted(userId, true);
    analytics.onboardingCompleted({
      templateChosen: loadedTemplateName || null,
      hasLogo: Boolean(logoUrl),
    });
    onCompleted?.();
    onClose();
  };

  const handleDismiss = () => {
    const ok = window.confirm(
      'Yakin lewati onboarding? Bisa dibuka lagi dari Pengaturan Estimator.',
    );
    if (!ok) return;
    analytics.onboardingSkipped({ stepAtSkip: step });
    finish();
  };

  const saveCompanyStep = async (): Promise<boolean> => {
    if (!companyName.trim()) {
      showToast('Nama perusahaan wajib diisi', 'error');
      return false;
    }
    setSaving(true);
    try {
      await updatePdfSettings(orgId, {
        company_name: companyName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        logo_url: logoUrl,
      });
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan identitas', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleContinueStep1 = async () => {
    const ok = await saveCompanyStep();
    if (ok) setStep(2);
  };

  const handleSkipStep1 = () => setStep(2);

  const handleImportTemplate = async (templateId: string) => {
    const count = await importPricelistTemplate(orgId, userId, templateId);
    const template = getPricelistTemplate(templateId);
    setTemplateLoaded(true);
    setLoadedTemplateName(template?.name || '');
    return count;
  };

  const handleContinueStep2 = () => setStep(3);

  const stepLabels = ['Identitas', 'Pricelist', 'Siap'];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div>
          <h1 className="font-black text-slate-900">
            {step === 1 ? 'Selamat Datang di Monefyi Estimator! 🎉' : 'Setup Estimator'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Langkah {step} dari 3: {stepLabels[step - 1]}</p>
        </div>
        <button type="button" onClick={handleDismiss} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Tutup">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="px-4 pt-4 shrink-0">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          {([1, 2, 3] as WizardStep[]).map(n => (
            <button
              key={n}
              type="button"
              disabled={n > step}
              onClick={() => {
                if (n < step) setStep(n);
              }}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                n <= step ? 'bg-emerald-500' : 'bg-slate-200'
              } ${n < step ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label={`Langkah ${n}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {step === 1 && (
            <section className="space-y-4">
              <p className="text-sm text-slate-600">
                Isi identitas agar penawaran Anda terlihat profesional di mata klien.
              </p>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Nama Perusahaan *</span>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                  placeholder="PT / CV / Brand Anda"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">No. WhatsApp</span>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                  placeholder="08xxxxxxxxxx"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Alamat</span>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                  className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none"
                />
              </label>
              <LogoUpload
                orgId={orgId}
                kind="logo"
                label="Logo (opsional)"
                value={logoUrl}
                onChange={setLogoUrl}
                onError={msg => window.alert(msg)}
              />
              <p className="text-xs text-slate-400">ℹ️ Bisa dilengkapi nanti di Pengaturan.</p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <p className="text-sm text-slate-600">
                Muat template harga untuk mulai cepat, atau mulai dari kosong.
              </p>
              {templateLoaded && (
                <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  ✓ Template {loadedTemplateName} dimuat. Anda bisa muat template lain jika perlu.
                </div>
              )}
              <PricelistTemplateSelector
                onSelectTemplate={async templateId => {
                  const count = await handleImportTemplate(templateId);
                  showToast(
                    `${count} item berhasil ditambahkan. Sesuaikan harga di pricelist.`,
                    'success',
                  );
                }}
                showEmptyOption={false}
                compact
              />
            </section>
          )}

          {step === 3 && (
            <section className="text-center py-8 space-y-5">
              <div className="text-5xl" aria-hidden>🎉</div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Anda sudah siap buat penawaran pertama!</h2>
                <p className="text-sm text-slate-500 mt-2">Yang bisa Anda lakukan sekarang:</p>
              </div>
              <ul className="text-left text-sm text-slate-700 space-y-2 max-w-sm mx-auto">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Buat estimasi dari pricelist</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Export PDF dengan branding Anda</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Kirim langsung via WhatsApp</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Track pipeline estimasi</li>
                <li className="flex gap-2"><span className="shrink-0">🎁</span> BONUS: 1 proyek gratis di Planner</li>
              </ul>
            </section>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-100 flex gap-2 justify-end shrink-0 safe-bottom">
        {step === 1 && (
          <>
            <button type="button" onClick={handleSkipStep1} className="px-4 py-2.5 rounded-xl text-sm text-slate-600">
              Lewati
            </button>
            <button
              type="button"
              onClick={handleContinueStep1}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Lanjut →
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600">
              ← Kembali
            </button>
            <button
              type="button"
              onClick={handleContinueStep2}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Lanjut →
            </button>
          </>
        )}
        {step === 3 && (
          <>
            <button
              type="button"
              onClick={() => {
                finish();
                navigate('/app/estimator');
              }}
              className="px-4 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600"
            >
              Ke Dashboard Estimator →
            </button>
            <button
              type="button"
              onClick={() => {
                finish();
                navigate('/app/estimator/new');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Rocket className="w-4 h-4" /> Buat Estimasi Pertama
            </button>
          </>
        )}
      </div>
    </div>
  );
}
