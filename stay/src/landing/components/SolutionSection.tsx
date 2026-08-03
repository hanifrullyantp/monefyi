import React from 'react';
import { Clock, TrendingUp, Shield, Star } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const pillars = [
  {
    icon: Clock,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Hemat Waktu 5 Jam Sehari',
    desc: 'Otomasi tugas berulang. Anda fokus melayani tamu, bukan mengurus administrasi.',
  },
  {
    icon: TrendingUp,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Naikkan Pendapatan 30%',
    desc: 'Sistem pintar bantu Anda menetapkan harga optimal dan menjangkau tamu online yang selama ini terlewat.',
  },
  {
    icon: Shield,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    title: 'Data Selalu Rapi & Aman',
    desc: 'Tidak ada lagi buku hilang. Semua tercatat otomatis, tersimpan aman, bisa diakses dari HP kapan saja.',
  },
  {
    icon: Star,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Tamu Lebih Puas, Ulasan ⭐⭐⭐⭐⭐',
    desc: 'Booking online mudah, check-in cepat, komunikasi lancar via WhatsApp. Tamu senang, ulasan positif mengalir.',
  },
];

interface Props { isEditMode?: boolean; }

const SolutionSection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.1);

  return (
    <section id="solusi" className="py-24 bg-white" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            💡 Solusi Cerdas untuk Penginapan Anda
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
            contentEditable={isEditMode}
            suppressContentEditableWarning
          >
            Perkenalkan{' '}
            <span className="text-emerald-500">STAY</span>{' '}
            — Sahabat Digital Penginapan Anda
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Satu aplikasi. Semua masalah selesai. Bahkan orang tua bisa langsung pakai tanpa training.
          </p>
        </div>

        {/* Visual demo */}
        <div className={`mb-16 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative max-w-4xl mx-auto bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-1 shadow-2xl shadow-emerald-200">
            <div className="bg-white rounded-[22px] overflow-hidden">
              {/* Tab bar */}
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                </div>
                <div className="flex-1 bg-white rounded-lg px-4 py-1.5 text-xs text-gray-400 border border-gray-200">
                  app.stay.monefyi.com/dashboard
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sidebar */}
                <div className="hidden md:block">
                  <div className="space-y-1">
                    {['🏠 Dashboard', '🛏️ Front Desk', '📅 Booking', '💳 Pembayaran', '👥 Staff', '📊 Laporan', '⚙️ Pengaturan'].map((item, i) => (
                      <div key={i} className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${i === 0 ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main content */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Pendapatan Bulan Ini', value: 'Rp 48,5Jt', icon: '💰', color: 'emerald' },
                      { label: 'Occupancy Rate', value: '82%', icon: '🏨', color: 'blue' },
                      { label: 'Tamu Aktif', value: '34', icon: '👤', color: 'purple' },
                    ].map((s, i) => (
                      <div key={i} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl p-3`}>
                        <div className="text-xl mb-1">{s.icon}</div>
                        <div className={`text-sm font-black text-${s.color}-700`}>{s.value}</div>
                        <div className="text-xs text-gray-500">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart area */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Tren Pendapatan 30 Hari</div>
                    <div className="flex items-end gap-1 h-20">
                      {[35, 45, 55, 40, 60, 70, 65, 80, 75, 90, 85, 95, 88, 92, 78, 85, 90, 96, 88, 94, 80, 88, 92, 86, 90, 95, 88, 96, 92, 98].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t transition-all"
                          style={{
                            height: `${h}%`,
                            background: `linear-gradient(to top, #10B981, #6EE7B7)`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Rata-rata naik</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+30% vs bulan lalu ↑</span>
                    </div>
                  </div>

                  {/* Booking list */}
                  <div className="space-y-2">
                    {[
                      { name: 'Budi Santoso', room: '205', date: 'Check-in hari ini', status: 'Baru' },
                      { name: 'Anita Wijaya', room: '301', date: 'Check-in besok', status: 'Konfirmasi' },
                      { name: 'Rina Kusuma', room: '108', date: 'Sedang menginap', status: 'Aktif' },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2.5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                            {b.name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{b.name}</div>
                            <div className="text-xs text-gray-500">Kamar {b.room} · {b.date}</div>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          b.status === 'Baru' ? 'bg-blue-100 text-blue-700' :
                          b.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={i}
                className={`text-center p-6 rounded-2xl border border-gray-100 bg-white card-hover transition-all duration-700 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${300 + i * 100}ms` }}
              >
                <div className={`w-14 h-14 ${p.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`w-7 h-7 ${p.iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
