import { useCallback, useEffect, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  registerSchema,
  REGISTER_DRAFT_KEY,
  REGISTER_STEP1_FIELDS,
  validateRegisterStep1,
  type RegisterDraftData,
  type RegisterFormData,
} from '../schemas/validation';
import { useAuthStore } from '../store/authStore';
import {
  INDONESIAN_CITIES,
  PROPERTY_TYPES,
  OPERATING_STATUS_OPTIONS,
  REFERRAL_SOURCES,
} from '../constants/indonesianCities';
import type { LeadSource } from '../services/registerService';
import { cn } from '../utils/cn';

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent';

const inputErrorClass = 'border-red-300 focus:ring-red-400';

function scrollToFirstError(errors: FieldErrors<RegisterFormData>) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  const el = document.querySelector(`[data-field="${firstKey}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [validationSummary, setValidationSummary] = useState('');
  const [draftWarning, setDraftWarning] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const { signUp, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const leadSource = (searchParams.get('source') as LeadSource) || 'direct_register';

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    shouldUnregister: false,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      propertyName: '',
      propertyType: '',
      city: '',
      address: '',
      roomCount: 5,
      operatingStatus: '',
      referralSource: '',
      marketingOptIn: false,
      acceptTerms: false,
      leadSource,
    },
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REGISTER_DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as RegisterDraftData;
      const { step: _savedStep, ...fields } = parsed;

      reset({
        ...fields,
        password: '',
        confirmPassword: '',
        acceptTerms: false,
        marketingOptIn: fields.marketingOptIn ?? false,
        roomCount: fields.roomCount ?? 5,
        leadSource,
      });

      setDraftWarning('Draft dimuat. Silakan isi ulang password sebelum mendaftar.');
      setStep(1);
    } catch {
      /* ignore */
    }
  }, [reset, leadSource]);

  const applyFieldErrors = useCallback(
    (fieldErrors: Record<string, string>) => {
      for (const field of REGISTER_STEP1_FIELDS) {
        clearErrors(field);
      }
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof RegisterFormData, { type: 'manual', message });
      }
    },
    [clearErrors, setError]
  );

  useEffect(() => {
    const sub = watch((values) => {
      try {
        const { password, confirmPassword, ...safe } = values;
        const draft: RegisterDraftData = { ...safe, step };
        localStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* ignore */
      }
    });
    return () => sub.unsubscribe();
  }, [watch, step]);

  const goStep2 = () => {
    setValidationSummary('');
    setError('');
    const fieldErrors = validateRegisterStep1(getValues());
    if (Object.keys(fieldErrors).length > 0) {
      applyFieldErrors(fieldErrors);
      setValidationSummary('Periksa data pribadi yang ditandai merah.');
      const firstField = Object.keys(fieldErrors)[0];
      window.setTimeout(() => {
        document.querySelector(`[data-field="${firstField}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 50);
      return;
    }
    setStep(2);
    setDraftWarning('');
  };

  const onInvalid = useCallback(
    (invalidErrors: FieldErrors<RegisterFormData>) => {
      const hasStep1Error = REGISTER_STEP1_FIELDS.some((f) => f in invalidErrors);
      if (hasStep1Error) {
        setStep(1);
        setValidationSummary('Data pribadi perlu diperbaiki. Silakan cek Langkah 1.');
      } else {
        const firstMsg = Object.values(invalidErrors).find((e) => e?.message)?.message;
        setValidationSummary(
          firstMsg ? String(firstMsg) : 'Periksa field yang ditandai merah.'
        );
      }
      window.setTimeout(() => scrollToFirstError(invalidErrors), 50);
    },
    []
  );

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setValidationSummary('');

    const step1Errors = validateRegisterStep1(data);
    if (Object.keys(step1Errors).length > 0) {
      applyFieldErrors(step1Errors);
      setStep(1);
      setValidationSummary('Data pribadi perlu diperbaiki. Silakan cek Langkah 1.');
      return;
    }

    const result = await signUp({ ...data, leadSource });
    if (result.success) {
      localStorage.removeItem(REGISTER_DRAFT_KEY);
      navigate('/dashboard?onboarding=true');
    } else {
      setError(result.error ?? 'Registrasi gagal');
    }
  };

  const busy = isLoading || isSubmitting;

  const fieldClass = (name: keyof RegisterFormData) =>
    cn(inputClass, errors[name] && inputErrorClass);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-[500px]">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#00A86B] items-center justify-center shadow-lg shadow-emerald-200 mb-3">
            <Home className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Monefyi Stay</h1>
          <p className="text-slate-500 text-sm mt-1">Mulai Kelola Penginapan Anda Hari Ini ✨</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-[#00A86B]' : 'bg-emerald-200'}`}
          />
          <span
            className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-[#00A86B]' : 'bg-emerald-200'}`}
          />
          <span className="text-[10px] font-bold uppercase text-slate-400 ml-1">
            Langkah {step} / 2
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 p-6 sm:p-7">
          {(validationSummary || error || draftWarning) && (
            <div className="mb-4 space-y-2">
              {validationSummary && (
                <div
                  className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{validationSummary}</span>
                </div>
              )}
              {draftWarning && step === 1 && (
                <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  {draftWarning}
                </div>
              )}
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            {/* Langkah 1 — tetap di DOM saat step 2 agar RHF tidak kehilangan nilai */}
            <div className={cn(step === 2 && 'hidden')} aria-hidden={step === 2}>
              <h2 className="text-lg font-bold text-slate-800 mb-4">Data Pribadi 👋</h2>
              <div className="space-y-4">
                <div className="space-y-1.5" data-field="fullName">
                  <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
                  <input
                    {...register('fullName')}
                    className={fieldClass('fullName')}
                    placeholder="Budi Santoso"
                    aria-invalid={Boolean(errors.fullName)}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500">{errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5" data-field="email">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    {...register('email')}
                    className={fieldClass('email')}
                    placeholder="email@penginapan.com"
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5" data-field="phone">
                  <label className="text-sm font-medium text-slate-700">No. HP / WhatsApp</label>
                  <input
                    {...register('phone')}
                    className={fieldClass('phone')}
                    placeholder="+62812xxxxxxx"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1.5" data-field="password">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      {...register('password')}
                      className={cn(fieldClass('password'), 'pr-12')}
                      aria-invalid={Boolean(errors.password)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5" data-field="confirmPassword">
                  <label className="text-sm font-medium text-slate-700">Konfirmasi Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      {...register('confirmPassword')}
                      className={cn(fieldClass('confirmPassword'), 'pr-12')}
                      aria-invalid={Boolean(errors.confirmPassword)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
              {step === 1 && (
                <button
                  type="button"
                  onClick={goStep2}
                  className="mt-4 w-full bg-[#00A86B] hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                >
                  Lanjut ke Data Penginapan <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {step === 2 && (
              <>
                <h2 className="text-lg font-bold text-slate-800">Data Penginapan 🏨</h2>
                <div className="space-y-1.5" data-field="propertyName">
                  <label className="text-sm font-medium text-slate-700">Nama Penginapan</label>
                  <input
                    {...register('propertyName')}
                    className={fieldClass('propertyName')}
                    aria-invalid={Boolean(errors.propertyName)}
                  />
                  {errors.propertyName && (
                    <p className="text-xs text-red-500">{errors.propertyName.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5" data-field="propertyType">
                    <label className="text-sm font-medium text-slate-700">Jenis</label>
                    <select
                      {...register('propertyType')}
                      className={fieldClass('propertyType')}
                      aria-invalid={Boolean(errors.propertyType)}
                    >
                      <option value="">Pilih...</option>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {errors.propertyType && (
                      <p className="text-xs text-red-500">{errors.propertyType.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5" data-field="roomCount">
                    <label className="text-sm font-medium text-slate-700">Jumlah Kamar</label>
                    <input
                      type="number"
                      {...register('roomCount')}
                      className={fieldClass('roomCount')}
                      min={1}
                      aria-invalid={Boolean(errors.roomCount)}
                    />
                    {errors.roomCount && (
                      <p className="text-xs text-red-500">{errors.roomCount.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5" data-field="city">
                  <label className="text-sm font-medium text-slate-700">Kota</label>
                  <input
                    {...register('city')}
                    list="city-list"
                    className={fieldClass('city')}
                    aria-invalid={Boolean(errors.city)}
                  />
                  <datalist id="city-list">
                    {INDONESIAN_CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
                </div>
                <div className="space-y-1.5" data-field="address">
                  <label className="text-sm font-medium text-slate-700">Alamat Lengkap</label>
                  <textarea
                    {...register('address')}
                    rows={2}
                    className={fieldClass('address')}
                  />
                </div>
                <div className="space-y-1.5" data-field="operatingStatus">
                  <label className="text-sm font-medium text-slate-700">Sudah Beroperasi?</label>
                  <select
                    {...register('operatingStatus')}
                    className={fieldClass('operatingStatus')}
                    aria-invalid={Boolean(errors.operatingStatus)}
                  >
                    <option value="">Pilih...</option>
                    {OPERATING_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {errors.operatingStatus && (
                    <p className="text-xs text-red-500">{errors.operatingStatus.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Sumber Info (opsional)
                  </label>
                  <select {...register('referralSource')} className={inputClass}>
                    <option value="">Pilih...</option>
                    {REFERRAL_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100" data-field="acceptTerms">
                  <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      {...register('acceptTerms')}
                      className="mt-1"
                      aria-invalid={Boolean(errors.acceptTerms)}
                    />
                    <span>
                      Saya setuju dengan{' '}
                      <a href="#" className="text-[#00A86B] font-semibold" onClick={(e) => e.preventDefault()}>
                        Syarat & Ketentuan
                      </a>{' '}
                      dan{' '}
                      <a href="#" className="text-[#00A86B] font-semibold" onClick={(e) => e.preventDefault()}>
                        Kebijakan Privasi
                      </a>
                    </span>
                  </label>
                  {errors.acceptTerms && (
                    <p className="text-xs text-red-500">{errors.acceptTerms.message}</p>
                  )}
                  <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input type="checkbox" {...register('marketingOptIn')} className="mt-1" />
                    <span>Kirimkan saya tips & update via email</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setValidationSummary('');
                    }}
                    className="flex-1 border border-slate-200 py-3 rounded-xl text-sm font-semibold text-slate-600"
                    disabled={busy}
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="register-submit"
                    className="flex-[2] bg-[#00A86B] hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-200"
                  >
                    {busy ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Daftar & Coba Gratis 14 Hari →
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold text-[#00A86B] hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
