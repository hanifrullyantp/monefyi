import { useState } from 'react';
import { 
  Users, Key, Banknote, CalendarCheck, 
  Wallet, ListTodo, Plus, Mail, 
  ShieldCheck, Smartphone, MoreVertical, 
  Download, Filter, Search, CheckCircle2, 
  Clock, AlertCircle, Trash2, Edit3, 
  ChevronRight, Calendar, UserPlus, 
  ArrowUpRight, ArrowDownRight, CreditCard
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency, formatDateTime } from '../utils/format';
import Button from '../components/ui/Button';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { mockUsers } from '../data/mockData';

type TabType = 'access' | 'data' | 'payroll' | 'attendance' | 'loans' | 'tasks';

export default function EmployeeManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('data');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const tabs = [
    { id: 'access', label: 'Akses', icon: Key, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'data', label: 'Karyawan', icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'payroll', label: 'Payroll', icon: Banknote, color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'attendance', label: 'Absensi', icon: CalendarCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'loans', label: 'Kasbon', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'tasks', label: 'Tugas', icon: ListTodo, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manajemen Karyawan</h1>
          <p className="text-sm text-slate-500 font-medium">Kelola akses, data diri, dan operasional staff penginapan</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-sm">
              {mockUsers.length}
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-1">Staff Aktif</p>
              <p className="text-xs font-bold text-emerald-600">Seluruh Unit</p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="rounded-2xl h-11"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowInviteModal(true)}
          >
            Undang Staff
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
              activeTab === tab.id 
                ? cn("border-slate-800 bg-slate-800 text-white shadow-lg", tab.color.replace('text', 'shadow')) 
                : "bg-white border-transparent text-slate-400 hover:bg-slate-50"
            )}
          >
            <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-white" : tab.color)} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'access' && <AccessTab />}
        {activeTab === 'data' && <EmployeeDataTab />}
        {activeTab === 'payroll' && <PayrollTab />}
        {activeTab === 'attendance' && <AttendanceTab />}
        {activeTab === 'loans' && <LoansTab />}
        {activeTab === 'tasks' && <TasksTab />}
      </div>

      {/* Invite Modal Placeholder */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Undang Karyawan Baru" size="sm">
        <div className="space-y-5">
          <Input label="Email Karyawan" placeholder="contoh@gmail.com" type="email" leftIcon={<Mail className="h-4 w-4" />} />
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Pilih Role Akses</label>
            <select className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500 transition-all">
              <option value="manager">Manager</option>
              <option value="receptionist">Resepsionis</option>
              <option value="housekeeping">Housekeeping</option>
            </select>
          </div>
          <Button className="w-full h-12 rounded-2xl shadow-lg shadow-emerald-100" onClick={() => setShowInviteModal(false)}>Kirim Undangan</Button>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-TABS COMPONENTS ---

function AccessTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden">
            <CardHeader title="Pengguna Aplikasi" icon={<ShieldCheck className="h-4 w-4" />} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 text-left">Nama & Email</th>
                    <th className="px-6 py-4 text-left">Role</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mockUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-700">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.role === 'owner' ? 'danger' : 'info'} className="uppercase text-[9px] font-black">{user.role}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold text-slate-600 italic">Aktif</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"><Edit3 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden">
            <CardHeader title="Riwayat Login Terakhir" icon={<Clock className="h-4 w-4" />} />
            <div className="p-6 space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700">Ahmad Fauzi · Mobile App</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Android · IP 192.168.1.1</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">{formatDateTime(new Date().toISOString())}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-slate-900 rounded-[2rem] text-white p-8 shadow-2xl shadow-emerald-200">
            <h3 className="text-lg font-black uppercase tracking-widest mb-4">Izin Akses Role</h3>
            <div className="space-y-6">
              <RolePermissionItem label="Manager" desc="Semua fitur kecuali Billing" />
              <RolePermissionItem label="Resepsionis" desc="Front Desk, POS, Booking" />
              <RolePermissionItem label="Housekeeping" desc="Hanya modul kebersihan" />
            </div>
            <button className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Lihat Detail Matriks</button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RolePermissionItem({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <p className="text-sm font-black uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-[10px] text-slate-400 font-bold ml-3.5 uppercase">{desc}</p>
    </div>
  );
}

function EmployeeDataTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" placeholder="Cari nama staff..." />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 transition-all"><Filter className="h-5 w-5" /></button>
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 transition-all"><Download className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockUsers.map(staff => (
          <div key={staff.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 shadow-inner overflow-hidden border-4 border-white">
                <Users className="h-8 w-8 opacity-20" />
              </div>
              <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors"><MoreVertical className="h-5 w-5" /></button>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{staff.name}</h3>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">{staff.role}</p>
            </div>
            <div className="mt-6 space-y-3 pt-6 border-t border-slate-50">
              <StaffInfoItem icon={<Mail />} value={staff.email} />
              <StaffInfoItem icon={<Smartphone />} value={staff.phone || '—'} />
              <StaffInfoItem icon={<Calendar />} value="Mulai: 12 Jan 2024" />
            </div>
            <div className="mt-8 flex gap-2">
              <button className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all">Data Diri</button>
              <button className="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-600 transition-all">Detail Kerja</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffInfoItem({ icon, value }: { icon: any; value: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-500">
      <div className="text-slate-300">
        {icon && typeof icon === 'object' ? { ...icon, props: { ...icon.props, className: 'h-3.5 w-3.5' } } : null}
      </div>
      <span className="text-[10px] font-bold truncate tracking-wide">{value}</span>
    </div>
  );
}

function PayrollTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PayrollStat label="Total Gaji Bulan Ini" value={formatCurrency(12500000)} icon={<Banknote className="text-emerald-500" />} />
        <PayrollStat label="Karyawan Dibayar" value="8 / 12" icon={<CheckCircle2 className="text-sky-500" />} />
        <PayrollStat label="Sisa Belum Dibayar" value={formatCurrency(3400000)} icon={<AlertCircle className="text-orange-500" />} />
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Daftar Payroll Juni 2024</h3>
          <button className="bg-emerald-600 text-white px-5 py-2 rounded-2xl text-xs font-black uppercase shadow-lg shadow-emerald-100">Proses Massal</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4 text-left">Karyawan</th>
                <th className="px-8 py-4 text-left">Gaji Pokok</th>
                <th className="px-8 py-4 text-left">Tunjangan</th>
                <th className="px-8 py-4 text-left">Potongan</th>
                <th className="px-8 py-4 text-left">Total Net</th>
                <th className="px-8 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800 tracking-tight">{user.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{user.role}</p>
                  </td>
                  <td className="px-8 py-5 font-bold text-slate-600">{formatCurrency(3500000)}</td>
                  <td className="px-8 py-5 font-bold text-emerald-600">+{formatCurrency(450000)}</td>
                  <td className="px-8 py-5 font-bold text-rose-500">-{formatCurrency(120000)}</td>
                  <td className="px-8 py-5 font-black text-slate-900">{formatCurrency(3830000)}</td>
                  <td className="px-8 py-5 text-right">
                    <Badge variant={user.id === 'user-1' ? 'success' : 'warning'} className="uppercase text-[9px] font-black rounded-lg">
                      {user.id === 'user-1' ? 'Lunas' : 'Belum Bayar'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PayrollStat({ label, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/30 flex items-center gap-5">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
        {icon && typeof icon === 'object' ? { ...icon, props: { ...icon.props, className: 'h-6 w-6' } } : null}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function AttendanceTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl shadow-slate-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-8 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-3xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-100">
              <CalendarCheck className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Absensi Hari Ini</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="rounded-2xl h-11 px-6 border-slate-200 text-[10px] font-black uppercase tracking-widest">Digital Link</Button>
             <Button className="rounded-2xl h-11 px-6 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-100 text-[10px] font-black uppercase tracking-widest">+ Input Manual</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <AttendanceSummaryCircle label="Hadir" count={9} color="bg-emerald-500" />
          <AttendanceSummaryCircle label="Terlambat" count={2} color="bg-amber-500" />
          <AttendanceSummaryCircle label="Izin" count={1} color="bg-sky-500" />
          <AttendanceSummaryCircle label="Sakit" count={0} color="bg-rose-500" />
          <AttendanceSummaryCircle label="Alpa" count={0} color="bg-slate-400" />
        </div>

        <div className="mt-10 space-y-3">
          {mockUsers.map(staff => (
            <div key={staff.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:border-orange-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 text-xs shadow-sm">
                  {staff.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wide">{staff.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold">Resepsionis</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Masuk</p>
                  <p className="text-xs font-bold text-slate-700">07:55 WIB</p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Keluar</p>
                  <p className="text-xs font-bold text-slate-300 italic">Belum Pulang</p>
                </div>
                <Badge variant="success" className="rounded-lg text-[9px] font-black px-3 py-1">HADIR</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttendanceSummaryCircle({ label, count, color }: any) {
  return (
    <div className="text-center p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
      <p className={cn("text-3xl font-black mb-1", color.replace('bg-', 'text-'))}>{count}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function LoansTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-rose-200 lg:col-span-1">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest mb-2">Total Kasbon Aktif</p>
          <p className="text-3xl font-black tracking-tight">{formatCurrency(4850000)}</p>
          <button className="mt-8 w-full py-4 bg-white text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 active:scale-95 transition-all">Ajukan Kasbon Baru</button>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 overflow-hidden">
            <CardHeader title="Daftar Kasbon Staff" icon={<Clock className="h-4 w-4" />} />
            <div className="overflow-x-auto">
               <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Staff</th>
                    <th className="px-8 py-4 text-left">Pinjaman</th>
                    <th className="px-8 py-4 text-left">Sisa</th>
                    <th className="px-8 py-4 text-left">Cicilan/Bln</th>
                    <th className="px-8 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-8 py-5"><p className="font-black text-slate-800 uppercase tracking-tight">Sari Dewi</p></td>
                    <td className="px-8 py-5 font-bold text-slate-600">{formatCurrency(2000000)}</td>
                    <td className="px-8 py-5 font-black text-rose-500">{formatCurrency(1200000)}</td>
                    <td className="px-8 py-5 font-bold text-slate-600">{formatCurrency(400000)}</td>
                    <td className="px-8 py-5 text-right"><Badge variant="info" className="uppercase font-black text-[9px]">4 Bulan Lagi</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-8 py-5"><p className="font-black text-slate-800 uppercase tracking-tight">Ahmad Fauzi</p></td>
                    <td className="px-8 py-5 font-bold text-slate-600">{formatCurrency(500000)}</td>
                    <td className="px-8 py-5 font-black text-rose-500">{formatCurrency(0)}</td>
                    <td className="px-8 py-5 font-bold text-slate-600">—</td>
                    <td className="px-8 py-5 text-right"><Badge variant="success" className="uppercase font-black text-[9px]">Lunas</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TasksTab() {
  const [taskFilter, setTaskFilter] = useState('all');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          {['all', 'pending', 'doing', 'done'].map(f => (
            <button 
              key={f} 
              onClick={() => setTaskFilter(f)}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                taskFilter === f ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {f === 'all' ? 'Semua' : f}
            </button>
          ))}
        </div>
        <Button className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" icon={<Plus className="h-4 w-4" />}>Tambah Tugas</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TaskCard 
          title="Bersihkan Kamar 301" 
          desc="Tamu baru checkout tadi jam 11:00. Pastikan handuk diganti baru semua." 
          staff="Rina Putri" 
          priority="High" 
          deadline="Hari ini, 14:00" 
          category="Cleaning"
        />
        <TaskCard 
          title="Perbaiki AC Kamar 105" 
          desc="Kompresor berisik, tolong cek freon dan bersihkan filter." 
          staff="Teknisi" 
          priority="Urgent" 
          deadline="Segera" 
          category="Maintenance"
        />
        <TaskCard 
          title="Restock Minibar Suite" 
          desc="Pesan 2 box soda dan camilan untuk restock gudang lantai 2." 
          staff="Ahmad Fauzi" 
          priority="Normal" 
          deadline="Besok, 10:00" 
          category="Admin"
        />
      </div>
    </div>
  );
}

function TaskCard({ title, desc, staff, priority, deadline, category }: any) {
  const priorityColor: any = {
    'Low': 'bg-slate-100 text-slate-600',
    'Normal': 'bg-sky-50 text-sky-600',
    'High': 'bg-orange-50 text-orange-600',
    'Urgent': 'bg-rose-50 text-rose-600'
  };

  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col hover:shadow-2xl transition-all border-b-4 border-b-indigo-500">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{category}</span>
        <Badge className={cn("rounded-lg text-[8px] font-black uppercase tracking-wider border-none", priorityColor[priority])}>{priority}</Badge>
      </div>
      <h4 className="text-lg font-black text-slate-800 tracking-tight leading-snug">{title}</h4>
      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{desc}</p>
      
      <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">{staff.charAt(0)}</div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{staff}</p>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-3 w-3" />
          <span className="text-[10px] font-bold italic">{deadline}</span>
        </div>
      </div>
    </div>
  );
}
