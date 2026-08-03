import React from 'react';
import { X, Check } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const rows = [
  { before: 'Buku catatan manual, sering hilang', after: 'Semua tersimpan digital, aman 24/7' },
  { before: 'Tamu telepon dulu untuk cek kamar', after: 'Tamu booking sendiri online, kapan saja' },
  { before: 'Hitung pendapatan pakai kalkulator', after: 'Laporan otomatis, cukup 1 klik' },
  { before: 'Absensi karyawan di kertas', after: 'Absensi digital dari HP, realtime' },
  { before: 'Bingung harga weekend berapa', after: 'Sistem sarankan harga optimal otomatis' },
  { before: 'Tamu tanya jam 2 pagi tak terbalas', after: 'WhatsApp balas otomatis 24 jam' },
  { before: 'Owner harus datang cek kondisi', after: 'Pantau semua dari HP, kapan saja' },
  { before: 'Pendapatan segitu-segitu saja', after: 'Rata-rata naik 30% dalam 3 bulan pertama' },
];

interface Props { isEditMode?: boolean; }

const ComparisonSection: React.FC<Props> = () => {
  const [ref, inView] = useInView(0.1);

  return (
    <section id="perbandingan" className="py-24 bg-white" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            ⚖️ Perbandingan Nyata
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            Lihat Perbedaannya Sendiri
          </h2>
          <p className="text-lg text-gray-600">
            Dua dunia yang berbeda. Pilihan ada di tangan Anda.
          </p>
        </div>

        <div className={`transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Header */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-4 text-center">
              <span className="text-xl mb-1 block">😩</span>
              <div className="font-black text-red-700 text-lg">Tanpa STAY</div>
              <div className="text-sm text-red-500">Cara lama yang melelahkan</div>
            </div>
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl px-6 py-4 text-center">
              <span className="text-xl mb-1 block">🎉</span>
              <div className="font-black text-emerald-700 text-lg">Dengan STAY</div>
              <div className="text-sm text-emerald-600">Cara cerdas masa kini</div>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-2 gap-4 transition-all duration-500 ${
                  inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
                style={{ transitionDelay: `${300 + i * 60}ms` }}
              >
                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">{row.before}</span>
                </div>
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 font-medium">{row.after}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-10 text-center">
            <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-lg transition-all duration-200 shadow-lg shadow-emerald-200">
              Mulai Pakai STAY Sekarang 🚀
            </button>
            <p className="mt-2 text-sm text-gray-500">Gratis 14 hari. Tidak perlu kartu kredit.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
