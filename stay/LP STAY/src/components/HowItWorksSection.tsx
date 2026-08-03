import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const steps = [
  {
    step: '01',
    emoji: '✍️',
    title: 'Daftar Gratis',
    desc: 'Isi nama penginapan, email, dan nomor HP. Klik daftar. Selesai dalam 2 menit. Tidak perlu kartu kredit.',
    color: 'emerald',
    detail: 'Langsung aktif, tidak perlu verifikasi panjang',
  },
  {
    step: '02',
    emoji: '🏠',
    title: 'Setup Kamar Anda',
    desc: 'Kami pandu Anda langkah demi langkah menambahkan kamar, harga, dan foto. Sudah ada template siap pakai untuk homestay, hotel, dan villa.',
    color: 'blue',
    detail: 'Template tersedia: Homestay, Hotel, Villa, Guest House, Kost',
  },
  {
    step: '03',
    emoji: '🎉',
    title: 'Mulai Terima Tamu',
    desc: 'Link booking Anda langsung aktif. Bagikan ke WhatsApp, Instagram, Google Business. Tamu mulai berdatangan!',
    color: 'purple',
    detail: 'Rata-rata sudah ada booking pertama dalam 24 jam',
  },
];

interface Props { isEditMode?: boolean; }

const HowItWorksSection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.1);

  return (
    <section id="cara-kerja" className="py-24 bg-white" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            🚀 Proses Sederhana, Hasil Luar Biasa
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
            contentEditable={isEditMode}
            suppressContentEditableWarning
          >
            Mulai Dalam 10 Menit, Tidak Perlu Ahli IT
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Kami sudah pikirkan semuanya agar Anda tinggal pakai. Serius, sesederhana ini.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-20 left-1/2 -translate-x-1/2 w-[70%] h-0.5 bg-gradient-to-r from-emerald-200 via-blue-200 to-purple-200" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`relative text-center transition-all duration-700 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Step number bubble */}
                <div className="flex justify-center mb-6">
                  <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${
                    s.color === 'emerald' ? 'bg-emerald-500 shadow-emerald-200' :
                    s.color === 'blue' ? 'bg-blue-500 shadow-blue-200' :
                    'bg-purple-500 shadow-purple-200'
                  }`}>
                    <span>{s.emoji}</span>
                    <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full text-xs font-black text-white flex items-center justify-center border-2 border-white ${
                      s.color === 'emerald' ? 'bg-emerald-700' :
                      s.color === 'blue' ? 'bg-blue-700' :
                      'bg-purple-700'
                    }`}>
                      {s.step}
                    </div>
                  </div>
                </div>

                {/* Arrow between steps (mobile) */}
                {i < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-2">
                    <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />
                  </div>
                )}

                <h3
                  className={`text-xl font-black text-gray-900 mb-3 ${isEditMode ? 'inline-editable' : ''}`}
                  contentEditable={isEditMode}
                  suppressContentEditableWarning
                >
                  {s.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-3">{s.desc}</p>
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                  s.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                  s.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  ✓ {s.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`text-center mt-16 transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-3xl p-10">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Siap Mulai Perjalanan Anda?</h3>
            <p className="text-gray-600 mb-6">Setup 10 menit, transformasi bisnis selamanya.</p>
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-lg transition-all duration-200 shadow-lg shadow-emerald-200">
              Mulai Sekarang, Gratis 14 Hari
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-3 text-sm text-gray-500">Tidak puas? Uninstall kapan saja, tanpa pertanyaan.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
