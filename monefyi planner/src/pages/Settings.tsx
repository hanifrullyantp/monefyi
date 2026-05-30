import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Building2, Clock, Users, Wallet, Tag, Bell, Mic,
  Shield, CreditCard, ChevronRight, Camera, Edit3, Check,
  MapPin, Smartphone, Globe, LogOut, Sparkles
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

const settingsMenu = [
  { id: 'profile', icon: User, label: 'Profil Saya', desc: 'Foto, nama, kontak, password' },
  { id: 'organization', icon: Building2, label: 'Organisasi', desc: 'Info bisnis, logo, NPWP' },
  { id: 'work-hours', icon: Clock, label: 'Jam & Hari Kerja', desc: 'Jadwal kerja, lembur, libur' },
  { id: 'employees', icon: Users, label: 'Karyawan & HR', desc: 'Kelola tim, role, payroll' },
  { id: 'accounts', icon: Wallet, label: 'Akun Keuangan', desc: 'Kas, bank, e-wallet' },
  { id: 'categories', icon: Tag, label: 'Kategori', desc: 'Income, expense, RAP' },
  { id: 'notifications', icon: Bell, label: 'Notifikasi', desc: 'Channel, rules, push' },
  { id: 'voice', icon: Mic, label: 'Voice & Command', desc: 'Bahasa, shortcut, history' },
  { id: 'subscription', icon: CreditCard, label: 'Subscription', desc: 'Plan, usage, upgrade' },
  { id: 'admin', icon: Shield, label: 'Admin Panel', desc: 'Monitor, audit, parsing rules' },
];

const employees = [
  { name: 'Budi Santoso', role: 'owner', dept: 'Management', status: 'active', checkedIn: true, type: 'full_time' },
  { name: 'Sari Dewi', role: 'manager', dept: 'Operations', status: 'active', checkedIn: true, type: 'full_time' },
  { name: 'Ahmad Rizky', role: 'worker', dept: 'Field', status: 'active', checkedIn: true, type: 'contract' },
  { name: 'Rudi Hartono', role: 'staff', dept: 'Field', status: 'active', checkedIn: false, type: 'daily' },
  { name: 'Siti Aminah', role: 'worker', dept: 'Field', status: 'active', checkedIn: true, type: 'daily' },
  { name: 'Deni Kusuma', role: 'worker', dept: 'Field', status: 'inactive', checkedIn: false, type: 'contract' },
];

function ProfileSection() {
  const { user, tenant } = useAppStore();
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-5">Profil Saya</h3>
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black">
              {user?.name.charAt(0)}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50">
              <Camera className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
          <div>
            <div className="font-black text-xl text-slate-900">{user?.name}</div>
            <div className="text-sm text-slate-500">{user?.email}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold capitalize">{user?.role}</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{user?.position}</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Nama Lengkap', value: user?.name, icon: User },
            { label: 'Email', value: user?.email, icon: Globe },
            { label: 'Department', value: user?.department, icon: Building2 },
            { label: 'Jabatan', value: user?.position, icon: Tag },
          ].map((field, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                  <field.icon className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">{field.label}</div>
                  <div className="text-sm font-medium text-slate-800">{field.value || '-'}</div>
                </div>
              </div>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg">
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">Preferensi</h3>
        <div className="space-y-4">
          {[
            { label: 'Bahasa Aplikasi', value: 'Bahasa Indonesia', icon: Globe },
            { label: 'Tema', value: 'Terang (Light)', icon: Smartphone },
            { label: 'Timezone', value: 'WIB (Asia/Jakarta)', icon: Clock },
          ].map((pref, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <pref.icon className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">{pref.label}</div>
                  <div className="text-sm font-medium text-slate-800">{pref.value}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmployeesSection() {
  const roleColors: Record<string, string> = {
    owner: 'bg-violet-100 text-violet-700',
    admin: 'bg-indigo-100 text-indigo-700',
    manager: 'bg-blue-100 text-blue-700',
    staff: 'bg-emerald-100 text-emerald-700',
    worker: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Karyawan & Tim</h3>
        <button className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
          + Undang Karyawan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {employees.map((emp, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-all"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
              emp.status === 'inactive' ? 'bg-slate-400' :
                emp.checkedIn ? 'bg-emerald-500' : 'bg-amber-500'
            }`}>
              {emp.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">{emp.name}</span>
                {emp.checkedIn && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[emp.role] || 'bg-slate-100 text-slate-600'}`}>
                  {emp.role}
                </span>
                <span className="text-xs text-slate-400">{emp.dept}</span>
                <span className="text-xs text-slate-400">· {emp.type.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-xs font-medium ${emp.status === 'inactive' ? 'text-slate-400' : emp.checkedIn ? 'text-emerald-600' : 'text-amber-600'}`}>
                {emp.status === 'inactive' ? 'Nonaktif' : emp.checkedIn ? '✓ Hadir' : '⚠ Belum Absen'}
              </div>
              <button className="text-xs text-indigo-500 hover:text-indigo-700 mt-0.5">Kelola</button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
        <h4 className="font-bold text-indigo-800 text-sm mb-2">Pengaturan Absensi</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Jam Masuk', value: '08:00' },
            { label: 'Jam Pulang', value: '17:00' },
            { label: 'Toleransi Terlambat', value: '15 menit' },
            { label: 'Radius GPS', value: '100 meter' },
            { label: 'Rate Lembur', value: '1.5×' },
            { label: 'Threshold Lembur', value: '30 menit' },
          ].map((s, i) => (
            <div key={i} className="flex justify-between py-1.5 border-b border-indigo-100 last:border-0">
              <span className="text-indigo-600 text-xs">{s.label}</span>
              <span className="font-bold text-indigo-800 text-xs">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminSection() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total User', value: '8', icon: Users, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Sync Queue', value: '0', icon: Check, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'AI Commands', value: '47', icon: Sparkles, color: 'bg-violet-50 text-violet-600' },
          { label: 'Storage', value: '128MB', icon: Shield, color: 'bg-amber-50 text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="font-black text-2xl text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" /> AI Parsing Analytics
        </h3>
        <div className="space-y-3">
          {[
            { layer: 'Layer 1: Rule-Based', rate: 78, color: 'bg-emerald-500' },
            { layer: 'Layer 2: Fuzzy Match', rate: 17, color: 'bg-blue-500' },
            { layer: 'Layer 3: GPT-4o', rate: 5, color: 'bg-violet-500' },
          ].map((layer, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-medium">{layer.layer}</span>
                <span className="font-bold">{layer.rate}% hit rate</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${layer.color} rounded-full`} style={{ width: `${layer.rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">Audit Log Terbaru</h3>
        <div className="space-y-2">
          {[
            { action: 'Catat biaya: Semen Rp 3.25jt', user: 'Budi S.', time: '10:30', icon: '💰' },
            { action: 'Update progress Pondasi 75%', user: 'Ahmad R.', time: '09:45', icon: '📊' },
            { action: 'Check in Absensi', user: 'Rudi H.', time: '09:32', icon: '🕐' },
            { action: 'Request Bon Rp 500rb', user: 'Siti A.', time: '08:15', icon: '💵' },
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-lg">{log.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{log.action}</div>
                <div className="text-xs text-slate-400">{log.user} · Hari ini {log.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { logout, setCurrentView } = useAppStore();

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSection />;
      case 'employees': return <EmployeesSection />;
      case 'admin': return <AdminSection />;
      default: return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            {settingsMenu.find(m => m.id === activeSection) && (() => {
              const Icon = settingsMenu.find(m => m.id === activeSection)!.icon;
              return <Icon className="w-7 h-7 text-indigo-600" />;
            })()}
          </div>
          <p className="text-sm text-slate-400 max-w-xs">
            Konfigurasi <strong className="text-slate-600 capitalize">{settingsMenu.find(m => m.id === activeSection)?.label}</strong> tersedia di versi produksi.
          </p>
        </div>
      );
    }
  };

  if (activeSection) {
    const section = settingsMenu.find(m => m.id === activeSection);
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveSection(null)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-500 rotate-180" />
          </button>
          <div>
            <h1 className="font-black text-xl text-slate-900">{section?.label}</h1>
            <p className="text-xs text-slate-400">{section?.desc}</p>
          </div>
        </div>
        {renderSection()}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-slate-900">Pengaturan</h1>
        <p className="text-sm text-slate-500">Konfigurasi akun, bisnis, dan tim kamu</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
        {settingsMenu.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <item.icon className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-slate-800 text-sm">{item.label}</div>
              <div className="text-xs text-slate-400">{item.desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </button>
        ))}
      </div>

      <button
        onClick={() => { logout(); setCurrentView('landing'); }}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl border border-rose-200 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Keluar dari Akun
      </button>
    </div>
  );
}
