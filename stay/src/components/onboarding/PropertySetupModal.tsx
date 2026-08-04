import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2, Home } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ROOM_FACILITIES } from '../../constants/indonesianCities';
import { completePropertySetup } from '../../services/propertySetupService';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

const setupSchema = z.object({
  propertyName: z.string().min(2, 'Nama penginapan wajib'),
  description: z.string().optional(),
  checkInTime: z.string().min(1),
  checkOutTime: z.string().min(1),
  roomTypeName: z.string().min(2, 'Nama tipe kamar wajib'),
  basePrice: z.coerce.number().min(1000, 'Harga minimal Rp 1.000'),
  capacity: z.coerce.number().min(1).max(20),
  facilities: z.array(z.string()),
  rooms: z
    .array(
      z.object({
        number: z.string().min(1, 'Nomor kamar wajib'),
        floor: z.coerce.number().min(0),
        status: z.enum(['available', 'maintenance']),
      })
    )
    .min(1, 'Minimal 1 kamar'),
});

type SetupFormData = z.infer<typeof setupSchema>;

export interface PropertySetupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Wizard setup penginapan — langkah akhir onboarding.
 */
export default function PropertySetupModal({ open, onClose, onSuccess }: PropertySetupModalProps) {
  const { tenant } = useAuthStore();
  const markSetupCompleted = useOnboardingStore((s) => s.markSetupCompleted);
  const markOnboardingCompleted = useOnboardingStore((s) => s.markOnboardingCompleted);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(['Wifi', 'AC']);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      propertyName: tenant?.name ?? '',
      description: '',
      checkInTime: tenant?.checkInTime ?? '14:00',
      checkOutTime: tenant?.checkOutTime ?? '12:00',
      roomTypeName: 'Standard Room',
      basePrice: 350000,
      capacity: 2,
      facilities: ['Wifi', 'AC'],
      rooms: [{ number: '101', floor: 1, status: 'available' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'rooms' });

  const toggleFacility = (f: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const onSubmit = async (data: SetupFormData) => {
    setError('');
    setLoading(true);
    const result = await completePropertySetup({
      ...data,
      facilities: selectedFacilities,
      description: data.description ?? '',
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Gagal menyimpan');
      return;
    }

    markSetupCompleted();
    markOnboardingCompleted();
    onSuccess?.();
    onClose();
    navigate('/front-desk');
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Setup Penginapan 🏨"
      size="lg"
    >
      <div data-tour="property-setup" className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-sm text-slate-500">
          Lengkapi data minimal agar Front Desk siap digunakan. Anda bisa menambah kamar lagi nanti.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <section className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Detail Penginapan
            </h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nama Penginapan</label>
              <input
                {...register('propertyName')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {errors.propertyName && (
                <p className="text-xs text-red-500">{errors.propertyName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Deskripsi</label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Penginapan nyaman di pusat kota..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Check-in</label>
                <input
                  type="time"
                  {...register('checkInTime')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Check-out</label>
                <input
                  type="time"
                  {...register('checkOutTime')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Tipe Kamar</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700">Nama Tipe</label>
                <input
                  {...register('roomTypeName')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Harga / malam</label>
                <input
                  type="number"
                  {...register('basePrice')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Kapasitas</label>
                <input
                  type="number"
                  {...register('capacity')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Fasilitas</p>
              <div className="flex flex-wrap gap-2">
                {ROOM_FACILITIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFacility(f)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                      selectedFacilities.includes(f)
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-500'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Daftar Kamar
              </h3>
              <button
                type="button"
                onClick={() => append({ number: '', floor: 1, status: 'available' })}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah
              </button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <input
                    {...register(`rooms.${index}.number`)}
                    placeholder="101"
                    className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  />
                  <input
                    type="number"
                    {...register(`rooms.${index}.floor`)}
                    placeholder="Lantai"
                    className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  />
                  <select
                    {...register(`rooms.${index}.status`)}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  >
                    <option value="available">Tersedia</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {errors.rooms && (
              <p className="text-xs text-red-500">{errors.rooms.message}</p>
            )}
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">⚠️ {error}</div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            icon={<Home className="h-4 w-4" />}
          >
            {loading ? 'Menyimpan...' : 'Simpan & Buka Front Desk →'}
          </Button>
        </form>
      </div>
    </Modal>
  );
}
