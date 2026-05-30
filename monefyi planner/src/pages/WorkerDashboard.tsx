import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, CheckSquare, CheckCircle, Circle,
  ChevronRight, AlertCircle, Wallet, TrendingUp, Star
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

function formatRupiah(n: number) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default function WorkerDashboard() {
  const { user, todos, updateTodo } = useAppStore();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'attendance' | 'payroll' | 'todos'>('home');

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleCheckIn = () => {
    setCheckedIn(true);
    setCheckInTime(timeStr);
  };

  const myTodos = todos.filter(t => t.status !== 'done').slice(0, 6);

  const getGreeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-sm text-slate-500">{getGreeting()},</div>
        <h1 className="text-2xl font-black text-slate-900">{user?.name?.split(' ')[0]} 👷</h1>
        <div className="text-xs text-slate-400 mt-0.5">{dateStr}</div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {[
          { id: 'home', label: '🏠 Home' },
          { id: 'attendance', label: '🕐 Absensi' },
          { id: 'payroll', label: '💵 Gaji' },
          { id: 'todos', label: '✅ Todo' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'home' && (
        <div className="space-y-4">
          {/* Attendance Status Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-5 text-white ${checkedIn
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : 'bg-gradient-to-br from-indigo-500 to-violet-600'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-white/80 text-sm mb-1">Status Hari Ini</div>
                <div className="font-black text-xl">
                  {checkedIn ? `✅ Check In ${checkInTime}` : '⏰ Belum Check In'}
                </div>
              </div>
              <div className="text-4xl font-black text-white/30">{timeStr}</div>
            </div>

            {!checkedIn ? (
              <button
                onClick={handleCheckIn}
                className="w-full py-3.5 bg-white text-indigo-700 font-black rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
              >
                📍 CHECK IN SEKARANG
              </button>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3 text-emerald-100 text-sm">
                  <MapPin className="w-4 h-4" /> Site Rumah Pak Ahmad — Terverifikasi
                </div>
                <button className="w-full py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-colors border border-white/30">
                  🏁 Check Out
                </button>
              </div>
            )}
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Kehadiran', value: '23/26', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Overtime', value: '8 jam', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Todo Selesai', value: '12/15', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="font-black text-slate-900 text-sm">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Todo Today */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800">Todo Hari Ini</h2>
              <button onClick={() => setActiveTab('todos')} className="text-xs text-indigo-600 font-medium">Lihat semua</button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
              {myTodos.slice(0, 3).map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => updateTodo(todo.id, { status: 'done' })} className="shrink-0">
                    <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500 transition-colors" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{todo.title}</div>
                    {todo.due_date && <div className="text-xs text-slate-400">{new Date(todo.due_date).toLocaleDateString('id-ID')}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    todo.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                      todo.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>{todo.priority}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Tasks */}
          <div>
            <h2 className="font-bold text-slate-800 mb-3">Progress Task Aktif</h2>
            <div className="space-y-3">
              {[
                { name: 'Pemasangan Keramik Lt. 2', progress: 65, project: 'Rumah Pak Ahmad' },
                { name: 'Pengecatan Tembok Luar', progress: 30, project: 'Renovasi Kantor' },
              ].map((task, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{task.name}</div>
                      <div className="text-xs text-slate-400">{task.project}</div>
                    </div>
                    <span className="text-lg font-black text-indigo-600 ml-2">{task.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${task.progress}%` }} />
                  </div>
                  <button className="w-full py-2 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Update Progress
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 text-white ${checkedIn ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
            <div className="text-white/80 text-sm mb-2">Status Absensi Hari Ini</div>
            <div className="text-2xl font-black mb-4">{checkedIn ? `✅ Check In pukul ${checkInTime}` : '⏰ Belum Check In'}</div>
            <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
              <MapPin className="w-4 h-4" />
              {checkedIn ? 'Site Rumah Pak Ahmad — Dalam radius 50m ✓' : 'Lokasi: Mendeteksi...'}
            </div>
            <div className={`text-sm px-3 py-1.5 rounded-lg w-fit mb-4 ${checkedIn ? 'bg-white/20 text-white' : 'bg-emerald-200/30 text-emerald-100'}`}>
              {checkedIn ? '⏱ Sudah bekerja 2 jam 15 menit' : '⚡ Tepat waktu — batas 08:15'}
            </div>
            <button
              onClick={handleCheckIn}
              disabled={checkedIn}
              className={`w-full py-3.5 font-black rounded-xl transition-colors ${checkedIn ? 'bg-white/10 text-white/50' : 'bg-white text-indigo-700 hover:bg-indigo-50'}`}
            >
              {checkedIn ? `✅ Sudah Check In (${checkInTime})` : '📍 CHECK IN SEKARANG'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4">Riwayat Absensi (Juni)</h3>
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => (
                <div key={i} className="text-center text-xs text-slate-400 font-medium">{d}</div>
              ))}
              {Array.from({ length: 15 }, (_, i) => i + 1).map(day => {
                const status = day <= 10 ? 'present' : day === 11 ? 'late' : day === 13 ? 'absent' : day <= 15 ? 'present' : 'none';
                return (
                  <div key={day} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${
                    status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                      status === 'late' ? 'bg-amber-100 text-amber-700' :
                        status === 'absent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200" /> Hadir: 13</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200" /> Terlambat: 1</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-200" /> Absen: 1</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white">
            <div className="text-white/80 text-sm mb-1">Estimasi Gaji Bulan Ini</div>
            <div className="text-3xl font-black mb-4">Rp 4.850.000</div>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'Gaji Pokok', value: '+Rp 4.000.000', color: 'text-white' },
                { label: 'Lembur (8 jam)', value: '+Rp 400.000', color: 'text-emerald-200' },
                { label: 'Tunjangan Hadir', value: '+Rp 500.000', color: 'text-emerald-200' },
                { label: 'Potongan Bon', value: '-Rp 50.000', color: 'text-rose-200' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-white/70">{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
              <div className="border-t border-white/20 pt-2 flex justify-between font-black text-white">
                <span>TOTAL</span>
                <span>Rp 4.850.000</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-amber-800 text-sm">Bon Aktif</span>
            </div>
            <div className="text-sm text-amber-700">Bon Rp 500.000 — Cicilan: Rp 50.000/bulan</div>
            <div className="text-xs text-amber-600 mt-1">Perkiraan lunas: Desember 2025</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">Riwayat Gaji</h3>
            <div className="space-y-3">
              {[
                { period: 'Mei 2025', amount: 4650000, status: 'paid', date: '1 Jun 2025' },
                { period: 'April 2025', amount: 4200000, status: 'paid', date: '1 Mei 2025' },
                { period: 'Maret 2025', amount: 4500000, status: 'paid', date: '1 Apr 2025' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{item.period}</div>
                    <div className="text-xs text-slate-400">Dibayar: {item.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">{formatRupiah(item.amount)}</div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">✓ Lunas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full py-3.5 border-2 border-dashed border-indigo-300 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
            <Wallet className="w-4 h-4" /> Ajukan Bon / Pinjaman
          </button>
        </div>
      )}

      {activeTab === 'todos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Daftar Todo</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
              {myTodos.length} aktif
            </span>
          </div>
          {['urgent', 'high', 'medium', 'low'].map(priority => {
            const priorityTodos = myTodos.filter(t => t.priority === priority);
            if (priorityTodos.length === 0) return null;
            return (
              <div key={priority}>
                <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${
                  priority === 'urgent' ? 'text-rose-600' :
                    priority === 'high' ? 'text-amber-600' :
                      priority === 'medium' ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  {priority === 'urgent' ? '🔴' : priority === 'high' ? '🟠' : priority === 'medium' ? '🟡' : '⚪'} {priority}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                  {priorityTodos.map(todo => (
                    <div key={todo.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                      <button
                        onClick={() => updateTodo(todo.id, { status: 'done' })}
                        className="mt-0.5 shrink-0"
                      >
                        <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500 transition-colors" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800">{todo.title}</div>
                        {todo.description && <div className="text-xs text-slate-400 mt-0.5">{todo.description}</div>}
                        {todo.due_date && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(todo.due_date).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
