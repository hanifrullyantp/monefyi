import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { usePosStore } from '../store/posStore';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  Building2, Users, CreditCard, Bell,
  Clock, Percent, Phone, Mail, MapPin, ChevronRight, Check
} from 'lucide-react';
import { cn } from '../utils/cn';

type Tab = 'property' | 'staff' | 'billing' | 'payments' | 'notifications';

export default function SettingsPage() {
  const { user, tenant, setTenant } = useAuthStore();
  const { users, updateTenant } = useAppStore();
  const { bankAccounts, paymentMethods } = usePosStore();
  const [activeTab, setActiveTab] = useState<Tab>('property');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    checkInTime: tenant?.checkInTime || '14:00',
    checkOutTime: tenant?.checkOutTime || '12:00',
    taxPercent: String(tenant?.taxPercent ?? 10),
    serviceChargePercent: String(tenant?.serviceChargePercent ?? 5),
  });

  const handleSave = () => {
    const updates = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      taxPercent: parseFloat(form.taxPercent) || 10,
      serviceChargePercent: parseFloat(form.serviceChargePercent) || 5,
    };
    updateTenant(updates);
    if (tenant) setTenant({ ...tenant, ...updates });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'property', label: 'Properti', icon: <Building2 className="h-4 w-4" /> },
    { value: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
    { value: 'billing', label: 'Tagihan', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'payments', label: 'Pembayaran', icon: <CreditCard className="h-4 w-4" /> },
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
              activeTab === tab.value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'property' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" />
              Informasi Properti
            </h3>
            <div className="space-y-3">
              <Input label="Nama Properti" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} leftIcon={<Mail className="h-4 w-4" />} />
              <Input label="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} leftIcon={<Phone className="h-4 w-4" />} />
              <Input label="Alamat" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} leftIcon={<MapPin className="h-4 w-4" />} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              Operasional
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Check-in" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} />
              <Input label="Check-out" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} />
              <Input label="Pajak (%)" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: e.target.value })} leftIcon={<Percent className="h-4 w-4" />} />
              <Input label="Service Charge (%)" value={form.serviceChargePercent} onChange={(e) => setForm({ ...form, serviceChargePercent: e.target.value })} leftIcon={<Percent className="h-4 w-4" />} />
            </div>
          </div>

          <Button onClick={handleSave} icon={saved ? <Check className="h-4 w-4" /> : undefined}>
            {saved ? 'Tersimpan!' : 'Simpan Perubahan'}
          </Button>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Tim Staff</h3>
            <p className="text-sm text-slate-500">{users.length} anggota tim</p>
          </div>
          <div className="space-y-2">
            {users.map(staff => (
              <div key={staff.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">
                  {staff.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{staff.name}</p>
                  <p className="text-xs text-slate-400">{staff.email}</p>
                </div>
                <Badge variant={roleBadge[staff.role]}>{roleLabel[staff.role]}</Badge>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border p-5 space-y-4">
            <h3 className="font-bold text-slate-800">Rekening Bank</h3>
            {bankAccounts.map((b) => (
              <div key={b.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-medium">{b.bankName} {b.isPrimary && <Badge variant="success">Utama</Badge>}</p>
                  <p className="text-sm font-mono">{b.accountNumber} · {b.accountHolder}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(b.accountNumber)}>Copy</Button>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border p-5 space-y-3">
            <h3 className="font-bold text-slate-800">Metode Pembayaran & Fee</h3>
            {paymentMethods.filter((m) => m.isActive).map((m) => (
              <div key={m.id} className="flex justify-between items-center p-3 border rounded-xl">
                <span className="font-medium text-sm">{m.name}</span>
                <span className="text-xs text-slate-500">
                  {m.feeType === 'fixed' ? `Rp ${m.feeAmount}` : m.feeType === 'percent' ? `${(m.feePercent * 100).toFixed(2)}%` : 'Gratis'}
                  {' · '}{m.feeBearer === 'hotel' ? 'Hotel' : m.feeBearer === 'guest' ? 'Tamu' : 'Bagi dua'}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border p-5 space-y-3">
            <h3 className="font-bold text-slate-800">Xendit</h3>
            <p className="text-sm text-slate-500">API Key dikonfigurasi di Supabase secrets (XENDIT_SECRET_KEY)</p>
            <Input label="Callback Token" placeholder="Dari dashboard Xendit" />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="mode" defaultChecked /> Sandbox</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="mode" /> Production</label>
            </div>
            <Button variant="outline" size="sm">Test Koneksi</Button>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm text-slate-600">Plan: <strong className="capitalize">{tenant?.subscriptionPlan}</strong></p>
          <p className="text-xs text-slate-400 mt-2">Berlaku hingga {tenant?.subscriptionExpiry}</p>
        </div>
      )}

      {activeTab === 'notifications' && user && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          {['Booking baru', 'Check-in/out', 'Pembayaran', 'Housekeeping'].map((label) => (
            <label key={label} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <input type="checkbox" defaultChecked className="rounded accent-emerald-600" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
