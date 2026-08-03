import React from 'react';
import { BookOpen, Calculator, Users, Globe, TrendingDown, MessageCircle } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const problems = [
  {
    icon: BookOpen,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    title: 'Buku Booking Manual',
    desc: '"Setiap hari harus buka buku catatan, coret-coret, sering hilang atau rusak. Kadang double booking karena lupa cek."',
  },
  {
    icon: Calculator,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
    title: 'Pusing Hitung Pendapatan',
    desc: '"Akhir bulan pusing rekap manual. Uang cash bercampur, tidak tahu pasti untung berapa. Laporan ke pemilik terlambat terus."',
  },
  {
    icon: Users,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-500',
    title: 'Staff Susah Diatur',
    desc: '"Absensi manual, gaji dihitung manual, kasbon lupa dicatat. Karyawan sering protes karena tidak transparan."',
  },
  {
    icon: Globe,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    title: 'Kehilangan Tamu Online',
    desc: '"Tamu sekarang cari penginapan lewat HP. Tanpa sistem booking online, Anda kehilangan puluhan tamu potensial setiap bulan."',
  },
  {
    icon: TrendingDown,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
    title: 'Kamar Kosong di Weekend',
    desc: '"Tidak tahu harga optimal. Weekend harusnya bisa naikkan harga, tapi bingung berapa. Akhirnya kamar kosong terus."',
  },
  {
    icon: MessageCircle,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
    title: 'Repot Balas Chat 24 Jam',
    desc: '"Tamu tanya kamar kosong tengah malam, harus balas manual. Kalau telat balas, tamu kabur ke tempat lain."',
  },
];

interface Props { isEditMode?: boolean; }

const ProblemSection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.1);

  return (
    <section id="masalah" className="py-24 bg-gray-50" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            😩 Masalah yang Bikin Pusing Setiap Hari
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
            contentEditable={isEditMode}
            suppressContentEditableWarning
          >
            Apakah Anda Merasakan Ini Juga?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Kami tahu betapa melelahkannya mengelola penginapan secara manual. Coba jawab jujur — berapa banyak yang Anda alami?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={i}
                className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover transition-all duration-700 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className={`w-12 h-12 ${p.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${p.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed italic">{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom callout */}
        <div className={`mt-12 text-center transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-block bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-8 py-5 max-w-2xl">
            <p className="text-gray-700 text-lg leading-relaxed">
              Jika <strong className="text-emerald-600">3 atau lebih</strong> dari daftar di atas Anda rasakan —{' '}
              <strong className="text-red-500">berhenti sekarang juga</strong>. Ada cara yang jauh lebih mudah. 👇
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
