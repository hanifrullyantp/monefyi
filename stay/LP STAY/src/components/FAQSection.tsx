import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const faqs = [
  {
    q: 'Apakah saya perlu paham teknologi untuk pakai STAY?',
    a: 'Tidak sama sekali. STAY dirancang agar bisa dipakai bahkan oleh orang tua yang baru pertama kali pakai aplikasi. Ada panduan langkah demi langkah dan tim support siap bantu 24/7.',
  },
  {
    q: 'Bagaimana jika saya tidak puas?',
    a: 'Uninstall kapan saja tanpa pertanyaan. Tidak ada kontrak jangka panjang. Data Anda bisa di-export sebelum berhenti. Kami sangat yakin Anda akan puas, tapi pilihan tetap di tangan Anda.',
  },
  {
    q: 'Apakah data tamu dan bisnis saya aman?',
    a: 'Sangat aman. Kami pakai enkripsi bank-level, backup otomatis harian, dan server terpercaya di Indonesia. Bahkan tim STAY pun tidak bisa akses data Anda tanpa izin eksplisit dari Anda.',
  },
  {
    q: 'Bisa dipakai di HP saja?',
    a: 'Bisa! STAY bekerja di HP, tablet, dan komputer. Bahkan bisa di-install seperti aplikasi asli (PWA — Progressive Web App). Data tersinkron otomatis di semua perangkat Anda.',
  },
  {
    q: 'Bagaimana jika internet mati?',
    a: 'Tenang, STAY punya mode offline canggih. Semua transaksi tetap bisa jalan — check-in tamu, input pembayaran, catat booking baru. Data otomatis tersinkron saat internet kembali tanpa perlu tindakan apapun dari Anda.',
  },
  {
    q: 'Berapa lama proses setup?',
    a: 'Rata-rata 10-15 menit sudah bisa mulai terima booking. Kami sediakan template siap pakai untuk homestay, hotel, villa, dan guest house. Tidak perlu konfigurasi rumit sama sekali.',
  },
  {
    q: 'Apakah bisa integrasi dengan Traveloka/Booking.com?',
    a: 'Bisa, tersedia di paket Enterprise. Sistem Channel Manager kami sinkron otomatis dengan Traveloka, Booking.com, Airbnb, dan OTA populer lainnya. Stok kamar ter-update realtime di semua platform.',
  },
  {
    q: 'Apakah ada biaya transaksi?',
    a: 'STAY tidak mengambil biaya transaksi sama sekali. Anda hanya membayar biaya payment gateway Xendit sesuai tarif mereka yang mulai dari 0.7% per transaksi. Transparan, tanpa biaya tersembunyi.',
  },
];

interface Props { isEditMode?: boolean; }

const FAQSection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.1);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-white" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            🤔 Pertanyaan yang Sering Ditanyakan
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
            contentEditable={isEditMode}
            suppressContentEditableWarning
          >
            Masih Ragu? Ini Jawaban Pertanyaan Umum
          </h2>
          <p className="text-lg text-gray-600">
            Tidak ketemu jawabannya? Chat dengan tim kami via WhatsApp!
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden transition-all duration-700 ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              } ${openIdx === i ? 'border-emerald-200 bg-emerald-50/30' : ''}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className={`font-semibold text-base ${openIdx === i ? 'text-emerald-700' : 'text-gray-900'}`}>
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 ml-4 transition-transform duration-300 ${
                    openIdx === i ? 'rotate-180 text-emerald-500' : 'text-gray-400'
                  }`}
                />
              </button>

              <div className={`accordion-content ${openIdx === i ? 'accordion-open' : 'accordion-closed'}`}>
                <div className="px-6 pb-5">
                  <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`mt-12 text-center transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-gray-600 mb-4">Masih ada pertanyaan? Tim kami siap membantu 24/7</p>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold rounded-xl transition-all">
            <span className="text-lg">📱</span>
            Chat via WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
