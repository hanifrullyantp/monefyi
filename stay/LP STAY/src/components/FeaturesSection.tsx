import React from 'react';
import { Hotel, Globe, CreditCard, Users, BarChart2, MessageCircle, Wifi, Bot } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const features = [
  {
    icon: Hotel,
    emoji: '🏨',
    title: 'Front Desk Digital dengan Denah Kamar',
    desc: 'Lihat semua kamar Anda dalam satu layar. Warna hijau berarti kosong, merah berisi, kuning perlu dibersihkan. Cukup satu klik untuk check-in tamu.',
    benefit: 'Tidak ada lagi bingung kamar mana yang kosong. Tamu tidak menunggu lama. Staff baru langsung paham cara pakai.',
    color: 'emerald',
    mock: 'frontdesk',
  },
  {
    icon: Globe,
    emoji: '🌐',
    title: 'Booking Online 24 Jam Otomatis',
    desc: 'Punya link booking sendiri seperti Traveloka mini. Tamu bisa pesan kamar tengah malam, bayar online, kamar langsung terkonfirmasi.',
    benefit: 'Dapatkan tamu tambahan bahkan saat Anda tidur. Uang masuk otomatis ke rekening. Tidak ada lagi kehilangan booking karena telat balas chat.',
    color: 'blue',
    mock: 'booking',
  },
  {
    icon: CreditCard,
    emoji: '💳',
    title: 'Pembayaran Lengkap: QRIS, VA, E-Wallet',
    desc: 'Terima pembayaran dari semua bank Indonesia, semua e-wallet, dan QRIS. Uang langsung masuk ke rekening Anda tanpa perlu kejar-kejaran transfer.',
    benefit: 'Tamu bayar sesuai kesukaannya, Anda tidak repot menagih. Cashflow lebih sehat, tidak ada piutang menumpuk.',
    color: 'purple',
    mock: 'payment',
  },
  {
    icon: Users,
    emoji: '👥',
    title: 'Kelola Staff, Gaji, & Kasbon Otomatis',
    desc: 'Absensi digital dari HP, gaji dihitung otomatis, kasbon karyawan tercatat rapi. Bahkan bisa kirim slip gaji ke WhatsApp karyawan.',
    benefit: 'Tidak ada lagi drama gaji salah hitung. Karyawan transparan, Anda hemat waktu berjam-jam setiap bulan.',
    color: 'amber',
    mock: 'staff',
  },
  {
    icon: BarChart2,
    emoji: '📊',
    title: 'Laporan Otomatis, Owner Tenang',
    desc: 'Pendapatan harian, mingguan, bulanan — semua tersedia di dashboard. Grafik cantik yang mudah dibaca. Export ke Excel atau PDF dalam satu klik.',
    benefit: 'Owner bisa pantau bisnis dari mana saja. Keputusan bisnis berbasis data, bukan tebakan. Siap laporan pajak kapan saja.',
    color: 'emerald',
    mock: 'report',
  },
  {
    icon: MessageCircle,
    emoji: '📱',
    title: 'WhatsApp Otomatis untuk Tamu',
    desc: 'Konfirmasi booking, reminder check-in, tagihan, ucapan terima kasih — semua terkirim otomatis via WhatsApp tanpa Anda harus mengetik.',
    benefit: 'Tamu merasa dilayani profesional. Anda tidak stress balas chat berulang. Retensi tamu meningkat, mereka kembali lagi.',
    color: 'blue',
    mock: 'whatsapp',
  },
  {
    icon: Wifi,
    emoji: '📡',
    title: 'Kerja Meski Internet Mati (Offline Mode)',
    desc: 'Mati listrik? Internet lemot? Tenang, STAY tetap berjalan. Semua transaksi tetap bisa jalan, data otomatis sinkron saat internet kembali.',
    benefit: 'Bisnis Anda tidak berhenti hanya karena masalah teknis. Tamu tetap terlayani, transaksi tetap tercatat.',
    color: 'purple',
    mock: 'offline',
  },
  {
    icon: Bot,
    emoji: '🤖',
    title: 'Asisten AI 24 Jam untuk Anda',
    desc: 'Tanya apa saja: "Kamar mana yang kosong minggu depan?" atau "Buatkan laporan bulan ini". AI menjawab dalam hitungan detik.',
    benefit: 'Seperti punya asisten pintar yang tidak pernah lelah. Keputusan lebih cepat, insight lebih tajam.',
    color: 'amber',
    mock: 'ai',
  },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  blue: 'bg-blue-100 text-blue-600 border-blue-200',
  purple: 'bg-purple-100 text-purple-600 border-purple-200',
  amber: 'bg-amber-100 text-amber-600 border-amber-200',
};

const MockDashboard: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const colorClasses: Record<string, { bg: string; accent: string; light: string }> = {
    emerald: { bg: 'bg-emerald-500', accent: 'bg-emerald-600', light: 'bg-emerald-50' },
    blue: { bg: 'bg-blue-500', accent: 'bg-blue-600', light: 'bg-blue-50' },
    purple: { bg: 'bg-purple-500', accent: 'bg-purple-600', light: 'bg-purple-50' },
    amber: { bg: 'bg-amber-500', accent: 'bg-amber-600', light: 'bg-amber-50' },
  };
  const c = colorClasses[color] || colorClasses.emerald;

  const mockContent: Record<string, React.ReactElement> = {
    frontdesk: (
      <div className="p-4">
        <div className="text-xs font-bold text-gray-700 mb-3">🏨 Denah Kamar — Lantai 1</div>
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {['101','102','103','104','105','106','107','108','109','110'].map((r, i) => (
            <div key={r} className={`rounded-lg p-2 text-center text-xs font-bold ${
              [0,2,4,7].includes(i) ? 'bg-red-100 text-red-600 border border-red-200' :
              [3].includes(i) ? 'bg-amber-100 text-amber-600 border border-amber-200' :
              'bg-emerald-100 text-emerald-600 border border-emerald-200'
            }`}>{r}</div>
          ))}
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded" />Kosong (6)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded" />Terisi (4)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded" />Cleaning (1)</span>
        </div>
      </div>
    ),
    booking: (
      <div className="p-4">
        <div className="text-xs font-bold text-gray-700 mb-3">📅 Booking Online Hari Ini</div>
        {[
          { name: 'Dewi Kusuma', room: '205', amount: 'Rp 350.000', time: '08:30', status: 'Baru' },
          { name: 'Ahmad Fauzi', room: '301', amount: 'Rp 500.000', time: '11:15', status: 'Konfirmasi' },
          { name: 'Siti Rahayu', room: '102', amount: 'Rp 280.000', time: '14:45', status: 'Baru' },
        ].map((b, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <div className="text-xs font-semibold text-gray-800">{b.name}</div>
              <div className="text-[10px] text-gray-500">Kamar {b.room} · {b.time}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-emerald-600">{b.amount}</div>
              <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${b.status === 'Baru' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{b.status}</div>
            </div>
          </div>
        ))}
      </div>
    ),
    payment: (
      <div className="p-4">
        <div className="text-xs font-bold text-gray-700 mb-3">💳 Metode Pembayaran</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'QRIS', icon: '⬛', active: true },
            { label: 'Bank Transfer', icon: '🏦', active: true },
            { label: 'GoPay', icon: '💚', active: true },
            { label: 'OVO', icon: '💜', active: true },
            { label: 'Dana', icon: '💙', active: true },
            { label: 'ShopeePay', icon: '🧡', active: false },
          ].map((m, i) => (
            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${m.active ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
              <span className="text-base">{m.icon}</span>
              <div>
                <div className="text-xs font-semibold text-gray-700">{m.label}</div>
                <div className={`text-[10px] ${m.active ? 'text-emerald-600' : 'text-gray-400'}`}>{m.active ? 'Aktif' : 'Non-aktif'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    staff: (
      <div className="p-4">
        <div className="text-xs font-bold text-gray-700 mb-3">👥 Daftar Karyawan</div>
        {[
          { name: 'Eko Prasetyo', role: 'Resepsionis', status: 'Hadir', gaji: 'Rp 3,5Jt' },
          { name: 'Dewi Lestari', role: 'Housekeeping', status: 'Hadir', gaji: 'Rp 2,8Jt' },
          { name: 'Budi Santoso', role: 'Security', status: 'Izin', gaji: 'Rp 3,2Jt' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">{s.name[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-800 truncate">{s.name}</div>
              <div className="text-[10px] text-gray-500">{s.role}</div>
            </div>
            <div className="text-right">
              <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${s.status === 'Hadir' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{s.status}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{s.gaji}</div>
            </div>
          </div>
        ))}
      </div>
    ),
    report: (
      <div className="p-4">
        <div className="text-xs font-bold text-gray-700 mb-3">📊 Laporan Bulan Ini</div>
        <div className="space-y-2">
          {[
            { label: 'Total Pendapatan', value: 'Rp 48,5Jt', pct: 92, color: 'bg-emerald-400' },
            { label: 'Pengeluaran', value: 'Rp 12,3Jt', pct: 30, color: 'bg-red-400' },
            { label: 'Laba Bersih', value: 'Rp 36,2Jt', pct: 75, color: 'bg-blue-400' },
            { label: 'Occupancy Rate', value: '82%', pct: 82, color: 'bg-purple-400' },
          ].map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{r.label}</span>
                <span className="font-bold text-gray-800">{r.value}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <button className="mt-3 w-full py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600">Export PDF / Excel</button>
      </div>
    ),
    whatsapp: (
      <div className="p-4">
        <div className="text-xs font-bold text-gray-700 mb-3">📱 Template WhatsApp Otomatis</div>
        <div className="bg-green-50 rounded-xl p-3 border border-green-200">
          <div className="space-y-2">
            {[
              { msg: '✅ Booking Anda dikonfirmasi!\nKamar 205, Check-in: 20 Jan 2026\nTotal: Rp 350.000', time: '08:31', auto: true },
              { msg: '⏰ Reminder: Besok check-in pukul 14.00 di Villa Kencana. Siapkan KTP ya!', time: '13:00', auto: true },
            ].map((m, i) => (
              <div key={i} className="flex justify-end">
                <div className="bg-green-500 text-white text-[10px] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                  <div className="whitespace-pre-line">{m.msg}</div>
                  <div className="text-green-200 text-[8px] text-right mt-1">{m.time} · {m.auto ? '🤖 Otomatis' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    offline: (
      <div className="p-4">
        <div className="text-xs font-bold text-gray-700 mb-3">📡 Status Koneksi</div>
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">📡</div>
          <div>
            <div className="text-xs font-bold text-amber-700">Mode Offline Aktif</div>
            <div className="text-[10px] text-amber-600">Semua fitur tetap berjalan normal</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {['Check-in tamu ✓', 'Input pembayaran ✓', 'Catat booking baru ✓', 'Sinkron otomatis saat online ✓'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-emerald-500">●</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    ai: (
      <div className="p-4">
        <div className="text-xs font-bold text-gray-700 mb-3">🤖 Asisten AI STAY</div>
        <div className="space-y-2">
          <div className="flex justify-end">
            <div className="bg-emerald-500 text-white text-[10px] rounded-2xl rounded-tr-sm px-3 py-2">
              Kamar mana yang kosong minggu depan?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-700 text-[10px] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
              🏨 Minggu depan (20-27 Jan), kamar yang kosong adalah: 102, 203, 205, 208, 301, 305. Total 6 kamar tersedia. Mau saya buatkan penawaran spesial untuk kamar-kamar ini?
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-emerald-500 text-white text-[10px] rounded-2xl rounded-tr-sm px-3 py-2">
              Buatkan laporan pendapatan bulan ini
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-700 text-[10px] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
              📊 Laporan Januari 2026 sudah siap! Pendapatan: Rp 48,5Jt (+30% vs Desember). Mau export ke PDF atau Excel?
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className={`${c.bg} px-4 py-3 flex items-center gap-2`}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 bg-white/30 rounded-full" />
          <div className="w-2.5 h-2.5 bg-white/30 rounded-full" />
          <div className="w-2.5 h-2.5 bg-white/30 rounded-full" />
        </div>
        <div className="flex-1 bg-white/20 rounded-md h-5 flex items-center px-2">
          <span className="text-white text-[10px]">stay.monefyi.com</span>
        </div>
      </div>
      {mockContent[type] || mockContent.frontdesk}
    </div>
  );
};

interface Props { isEditMode?: boolean; }

const FeaturesSection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.05);

  return (
    <section id="fitur" className="py-24 bg-gray-50" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            ✨ Fitur Lengkap untuk Semua Kebutuhan
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
            contentEditable={isEditMode}
            suppressContentEditableWarning
          >
            Semua yang Anda Butuhkan, Dalam Satu Genggaman
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tidak perlu beli banyak aplikasi. Semua ada di STAY. Hemat biaya, hemat waktu, hemat energi.
          </p>
        </div>

        <div className="space-y-20">
          {features.map((f, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={i}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center transition-all duration-700 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={isEven ? '' : 'lg:order-2'}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border mb-4 ${colorMap[f.color]}`}>
                    {f.emoji} Fitur {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className={`text-2xl sm:text-3xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
                    contentEditable={isEditMode} suppressContentEditableWarning>
                    {f.title}
                  </h3>
                  <p
                    contentEditable={isEditMode} suppressContentEditableWarning
                    className={`text-gray-600 leading-relaxed mb-5 ${isEditMode ? 'inline-editable' : ''}`}
                  >
                    {f.desc}
                  </p>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">✅ Manfaat untuk Anda</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{f.benefit}</p>
                  </div>
                </div>
                <div className={isEven ? '' : 'lg:order-1'}>
                  <MockDashboard type={f.mock} color={f.color} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
