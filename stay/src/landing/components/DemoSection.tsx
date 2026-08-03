import React, { useState } from 'react';
import { ArrowRight, BarChart2, Calendar, LayoutGrid } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import { LoginLink } from '../LoginLink';

type Tab = 'frontdesk' | 'booking' | 'laporan';

interface Props {
  isEditMode?: boolean;
}

const DemoSection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.1);
  const [activeTab, setActiveTab] = useState<Tab>('frontdesk');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'frontdesk', label: 'Front Desk', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'booking', label: 'Booking', icon: <Calendar className="w-4 h-4" /> },
    { id: 'laporan', label: 'Laporan', icon: <BarChart2 className="w-4 h-4" /> },
  ];

  const tabContent: Record<Tab, React.ReactElement> = {
    frontdesk: (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-gray-800">🏨 Denah Kamar — Vila Kencana</div>
          <div className="flex gap-2 text-xs">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">6 Kosong</span>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">12 Terisi</span>
            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full">2 Cleaning</span>
          </div>
        </div>
        {/* Floor tabs */}
        <div className="flex gap-2 mb-4">
          {['Lantai 1', 'Lantai 2', 'Lantai 3'].map((f, i) => (
            <button key={i} className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{f}</button>
          ))}
        </div>
        {/* Room grid */}
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }, (_, i) => {
            const n = (i + 1).toString().padStart(3, '0');
            const status = [1, 3, 5, 8, 11, 14, 16, 18, 19].includes(i) ? 'empty'
              : [6, 13].includes(i) ? 'cleaning' : 'occupied';
            return (
              <div
                key={i}
                className={`rounded-xl p-2.5 text-center cursor-pointer transition-all hover:scale-105 ${
                  status === 'occupied' ? 'bg-red-100 border-2 border-red-200 hover:border-red-400' :
                  status === 'cleaning' ? 'bg-amber-100 border-2 border-amber-200 hover:border-amber-400' :
                  'bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-400'
                }`}
              >
                <div className="text-xs font-bold text-gray-700">{n}</div>
                <div className={`text-[9px] font-medium mt-0.5 ${
                  status === 'occupied' ? 'text-red-500' :
                  status === 'cleaning' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {status === 'occupied' ? '●' : status === 'cleaning' ? '◐' : '○'}
                </div>
              </div>
            );
          })}
        </div>
        {/* Quick check-in */}
        <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="text-xs font-bold text-emerald-700 mb-2">⚡ Check-in Cepat — Kamar 003</div>
          <div className="flex gap-2">
            <input className="flex-1 text-xs bg-white border border-emerald-200 rounded-lg px-3 py-2" placeholder="Nama tamu..." />
            <button className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600">Check-in</button>
          </div>
        </div>
      </div>
    ),
    booking: (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-gray-800">📅 Kalender Booking — Januari 2026</div>
          <button className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg">+ Booking Baru</button>
        </div>
        {/* Calendar mini */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-500 py-1">{d}</div>
          ))}
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 2;
            const hasBooking = [3,4,5,8,9,12,15,16,17,18,21,24,28].includes(day);
            const isToday = day === 19;
            return (
              <div key={i} className={`rounded-lg py-2 text-center text-xs cursor-pointer transition-all ${
                day < 1 || day > 31 ? 'opacity-0' :
                isToday ? 'bg-emerald-500 text-white font-bold' :
                hasBooking ? 'bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200' :
                'text-gray-600 hover:bg-gray-100'
              }`}>
                {day >= 1 && day <= 31 ? day : ''}
              </div>
            );
          })}
        </div>
        {/* Booking list */}
        <div className="space-y-2">
          {[
            { name: 'Budi S.', room: '205', nights: '2 malam', amount: 'Rp 700rb', status: 'Baru', color: 'blue' },
            { name: 'Ani W.', room: '301', nights: '1 malam', amount: 'Rp 350rb', status: 'Lunas', color: 'emerald' },
            { name: 'Eko P.', room: '102', nights: '3 malam', amount: 'Rp 900rb', status: 'DP', color: 'amber' },
          ].map((b, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700">{b.name[0]}</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{b.name} — Kamar {b.room}</div>
                  <div className="text-xs text-gray-500">{b.nights} · {b.amount}</div>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-${b.color}-100 text-${b.color}-700`}>{b.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    laporan: (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-gray-800">📊 Laporan Pendapatan — Januari 2026</div>
          <button className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">Export PDF</button>
        </div>
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Total Pendapatan', value: 'Rp 48,5Jt', change: '+30%', color: 'emerald' },
            { label: 'Total Booking', value: '142', change: '+18 booking', color: 'blue' },
            { label: 'Occupancy Rate', value: '82%', change: '+12%', color: 'purple' },
            { label: 'Laba Bersih', value: 'Rp 36,2Jt', change: '+28%', color: 'amber' },
          ].map((s, i) => (
            <div key={i} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl p-3`}>
              <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
              <div className={`text-base font-black text-${s.color}-700`}>{s.value}</div>
              <div className={`text-xs font-semibold text-${s.color}-500`}>{s.change} ↑</div>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-600 mb-3">Pendapatan Harian (Juta Rp)</div>
          <div className="flex items-end gap-0.5 h-16">
            {[12,18,14,22,19,28,25,30,27,32,29,35,31,28,33,30,36,34,40,38,42,39,44,41,45,43,48,46,50,48].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${(h / 50) * 100}%`, background: `linear-gradient(to top, #10B981, #6EE7B7)` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 mt-1">
            <span>1 Jan</span><span>10 Jan</span><span>20 Jan</span><span>31 Jan</span>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <section id="demo" className="py-24 bg-gray-50" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            🖥️ Demo Interaktif — Tanpa Daftar
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
            contentEditable={isEditMode}
            suppressContentEditableWarning
          >
            Coba Rasakan Sendiri, Tanpa Daftar
          </h2>
          <p className="text-lg text-gray-600">
            Klik demo di bawah untuk keliling dashboard STAY. Lihat betapa mudahnya.
          </p>
        </div>

        <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Browser chrome */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
            {/* Browser bar */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 bg-red-400 rounded-full" />
                <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                <div className="w-3 h-3 bg-green-400 rounded-full" />
              </div>
              <div className="flex-1 bg-white rounded-lg px-4 py-1.5 text-xs text-gray-500 border border-gray-200 max-w-sm">
                🔒 app.stay.monefyi.com/dashboard
              </div>
            </div>

            {/* App shell */}
            <div className="bg-white">
              {/* Tab navigation */}
              <div className="flex border-b border-gray-100 bg-gray-50">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'border-emerald-500 text-emerald-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="min-h-80">
                {tabContent[activeTab]}
              </div>
            </div>
          </div>

          {/* CTA below demo */}
          <div className="mt-10 text-center">
            <p className="text-gray-600 mb-4 text-lg">Suka yang Anda lihat?</p>
            <LoginLink className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-lg transition-all duration-200 shadow-lg shadow-emerald-200">
              Coba Gratis Sekarang
              <ArrowRight className="w-5 h-5" />
            </LoginLink>
            <p className="mt-2 text-sm text-gray-500">Tidak perlu kartu kredit · Setup 10 menit</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
