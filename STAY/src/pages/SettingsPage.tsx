import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { mockUsers } from '../data/mockData';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  Building2, Users, CreditCard, Bell,
  Clock, Percent, Phone, Mail, MapPin, ChevronRight, Check
} from 'lucide-react';
import { cn } from '../utils/cn';

type Tab = 'property' | 'staff' | 'billing' | 'notifications';

export default function SettingsPage() {
  const { user, tenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('property');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'property', label: 'Properti', icon: <Building2 className="h-4 w-4" /> },
    { value: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
    { value: 'billing', label: 'Tagihan', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'notifications', label: 'Notifikasi', icon: <Bell className="h-4 w-4" /> },
  ];

  const roleLabel: Record<string, string> = {
    owner: 'Pemilik',
    manager: 'Manajer',
    receptionist: 'Resepsionis',
  };

  const roleBadge: Record<string, 'danger' | 'warning' | 'info'> = {
    owner: 'danger',
    manager: 'warning',
    receptionist: 'info',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Pengaturan</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola pengaturan properti dan akun Anda</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
              activeTab === tab.value
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Property settings */}
      {activeTab === 'property' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-500" />
              Informasi Properti
            </h3>
            <div className="space-y-3">
              <Input label="Nama Properti" defaultValue={tenant?.name} />
              <Input label="Email" type="email" defaultValue={tenant?.email} leftIcon={<Mail className="h-4 w-4" />} />
              <Input label="Telepon" defaultValue={tenant?.phone} leftIcon={<Phone className="h-4 w-4" />} />
              <Input label="Alamat" defaultValue={tenant?.address} leftIcon={<MapPin className="h-4 w-4" />} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-500" />
              Jam Operasional
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Jam Check-in" type="time" defaultValue={tenant?.checkInTime} />
              <Input label="Jam Check-out" type="time" defaultValue={tenant?.checkOutTime} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Percent className="h-4 w-4 text-sky-500" />
              Pajak & Biaya Layanan
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Pajak (%)"
                type="number"
                defaultValue={tenant?.taxPercent}
                hint="Contoh: 10 untuk 10%"
              />
              <Input
                label="Service Charge (%)"
                type="number"
                defaultValue={tenant?.serviceChargePercent}
                hint="Contoh: 5 untuk 5%"
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" icon={saved ? <Check className="h-4 w-4" /> : undefined}>
            {saved ? 'Perubahan Disimpan!' : 'Simpan Perubahan'}
          </Button>
        </div>
      )}

      {/* Staff management */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{mockUsers.length} anggota tim</p>
            <Button size="sm">+ Tambah Staff</Button>
          </div>
          <div className="space-y-2.5">
            {mockUsers.map(staff => (
              <div key={staff.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{staff.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 truncate">{staff.name}</p>
                      {staff.id === user?.id && (
                        <span className="text-xs bg-sky-50 text-sky-500 px-2 py-0.5 rounded-full font-medium">Anda</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={roleBadge[staff.role]}>{roleLabel[staff.role]}</Badge>
                      <span className="text-xs text-slate-400">{staff.email}</span>
                    </div>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sky-100 text-sm">Paket Saat Ini</p>
                <p className="text-2xl font-bold capitalize">{tenant?.subscriptionPlan}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-sky-100">Aktif hingga</span>
              <span className="font-semibold">{tenant?.subscriptionExpiry}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { plan: 'Starter', price: '149.000', rooms: '10 kamar', features: ['Dashboard', 'Booking manual', 'Laporan dasar'] },
              { plan: 'Pro', price: '349.000', rooms: '50 kamar', features: ['Semua fitur Starter', 'Online booking', 'Xendit payment', 'Analitik lengkap', 'Multi-staff'], current: true },
              { plan: 'Enterprise', price: 'Custom', rooms: 'Tak terbatas', features: ['Semua fitur Pro', 'Multi-property', 'White label', 'Dedicated support'] },
            ].map(p => (
              <div key={p.plan} className={cn(
                'bg-white rounded-2xl border shadow-sm p-5',
                p.current ? 'border-sky-300 ring-1 ring-sky-300' : 'border-slate-100'
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-800">{p.plan}</p>
                    <p className="text-xs text-slate-400">{p.rooms}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">Rp{p.price}</p>
                    <p className="text-xs text-slate-400">/bulan</p>
                  </div>
                </div>
                <div className="space-y-1.5 mb-4">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button className={cn(
                  'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  p.current
                    ? 'bg-sky-50 text-sky-600 border border-sky-200 cursor-default'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                )}>
                  {p.current ? '✓ Paket Aktif' : 'Pilih Paket'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {[
              { label: 'Booking baru masuk', desc: 'Notifikasi saat ada booking baru', enabled: true },
              { label: 'Pembayaran diterima', desc: 'Notifikasi saat pembayaran dikonfirmasi', enabled: true },
              { label: 'Pengingat check-in', desc: '1 jam sebelum jam check-in', enabled: true },
              { label: 'Pengingat check-out', desc: '1 jam sebelum jam check-out', enabled: false },
              { label: 'Tugas housekeeping', desc: 'Notifikasi untuk tugas kebersihan baru', enabled: true },
              { label: 'Laporan harian', desc: 'Ringkasan pendapatan setiap malam', enabled: false },
            ].map((item, idx, arr) => (
              <div key={item.label} className={cn('flex items-center justify-between p-4', idx < arr.length - 1 && 'border-b border-slate-50')}>
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <button
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                    item.enabled ? 'bg-sky-500' : 'bg-slate-200'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm',
                    item.enabled ? 'right-1' : 'left-1'
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
