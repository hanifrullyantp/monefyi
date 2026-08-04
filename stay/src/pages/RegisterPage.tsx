import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  registerSchema,
  REGISTER_DRAFT_KEY,
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

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-transparent';

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
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
    trigger,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      roomCount: 5,
      marketingOptIn: false,
      acceptTerms: undefined,
      leadSource,
    },
  });

  useEffect(() => {
    try {
      const draft = localStorage.getItem(REGISTER_DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft) as Partial<RegisterFormData>;
        reset({ ...parsed, leadSource, acceptTerms: undefined });
      }
    } catch {
      /* ignore */
    }
  }, [reset, leadSource]);

  useEffect(() => {
    const sub = watch((values) => {
      try {
        const { password, confirmPassword, ...safe } = values;
        localStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(safe));
      } catch {
        /* ignore */
      }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const goStep2 = async () => {
    const ok = await trigger(['fullName', 'email', 'phone', 'password', 'confirmPassword']);
    if (ok) setStep(2);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    const result = await signUp({ ...data, leadSource });
    if (result.success) {
      localStorage.removeItem(REGISTER_DRAFT_KEY);
      navigate('/front-desk?onboarding=true');
    } else {
      setError(result.error ?? 'Registrasi gagal');
    }
  };

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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <h2 className="text-lg font-bold text-slate-800">Data Pribadi 👋</h2>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
                  <input {...register('fullName')} className={inputClass} placeholder="Budi Santoso" />
                  {errors.fullName && (
                    <p className="text-xs text-red-500">{errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    {...register('email')}
                    className={inputClass}
                    placeholder="email@penginapan.com"
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">No. HP / WhatsApp</label>
                  <input
                    {...register('phone')}
                    className={inputClass}
                    placeholder="+62812xxxxxxx"
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      {...register('password')}
                      className={`${inputClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Konfirmasi Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      {...register('confirmPassword')}
                      className={`${inputClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={goStep2}
                  className="w-full bg-[#00A86B] hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                >
                  Lanjut ke Data Penginapan <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-lg font-bold text-slate-800">Data Penginapan 🏨</h2>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nama Penginapan</label>
                  <input {...register('propertyName')} className={inputClass} />
                  {errors.propertyName && (
                    <p className="text-xs text-red-500">{errors.propertyName.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Jenis</label>
                    <select {...register('propertyType')} className={inputClass}>
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
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Jumlah Kamar</label>
                    <input type="number" {...register('roomCount')} className={inputClass} min={1} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Kota</label>
                  <input {...register('city')} list="city-list" className={inputClass} />
                  <datalist id="city-list">
                    {INDONESIAN_CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Alamat Lengkap</label>
                  <textarea {...register('address')} rows={2} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Sudah Beroperasi?</label>
                  <select {...register('operatingStatus')} className={inputClass}>
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

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input type="checkbox" {...register('acceptTerms')} className="mt-1" />
                    <span>
                      Saya setuju dengan{' '}
                      <a href="#" className="text-[#00A86B] font-semibold">
                        Syarat & Ketentuan
                      </a>{' '}
                      dan{' '}
                      <a href="#" className="text-[#00A86B] font-semibold">
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

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">⚠️ {error}</div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-slate-200 py-3 rounded-xl text-sm font-semibold text-slate-600"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    data-testid="register-submit"
                    className="flex-[2] bg-[#00A86B] hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-200"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
