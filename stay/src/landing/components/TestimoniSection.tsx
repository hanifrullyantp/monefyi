import React, { useEffect, useRef, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const stats = [
  { value: 500, suffix: '+', label: 'Penginapan Aktif' },
  { value: 50000, suffix: '+', label: 'Booking Berhasil', format: true },
  { value: 15, suffix: 'M+', label: 'Transaksi Diproses', prefix: 'Rp ' },
  { value: 4.9, suffix: '/5', label: 'Rating Kepuasan' },
];

const testimonials = [
  {
    quote: 'Dulu saya catat manual, sering salah. Sejak pakai STAY, pendapatan naik 40% karena banyak tamu booking online. Saya juga jadi lebih tenang.',
    name: 'Ibu Sri Hartati',
    place: 'Villa Kencana, Bandung',
    avatar: 'SH',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    quote: 'Anak saya yang install-in, tapi saya yang pakai tiap hari. Gampang banget. Sekarang saya bisa lihat pendapatan dari HP sambil ngopi.',
    name: 'Pak Herman Wijaya',
    place: 'Homestay Merapi, Yogyakarta',
    avatar: 'HW',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    quote: 'Fitur WhatsApp otomatis game changer. Tamu-tamu bilang pelayanan kami profesional, padahal saya cuma pakai STAY. Rekomendasi banget!',
    name: 'Rina Kusuma',
    place: 'Guest House Kota Tua, Jakarta',
    avatar: 'RK',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    quote: 'Laporan keuangan yang tadinya makan waktu setengah hari, sekarang cuma 5 menit. Owner bisa lihat real-time dari luar kota. Alhamdulillah banget.',
    name: 'Pak Budi Santoso',
    place: 'Hotel Melati, Surabaya',
    avatar: 'BS',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    quote: 'QRIS-nya benar-benar membantu. Tamu tidak perlu repot transfer manual, langsung scan bayar. Pendapatan lebih lancar, tidak ada piutang.',
    name: 'Dewi Lestari',
    place: 'Kost Harian Bintang, Semarang',
    avatar: 'DL',
    color: 'bg-rose-100 text-rose-700',
  },
  {
    quote: 'Yang paling saya suka itu mode offline-nya. Internet di sini sering mati, tapi STAY tetap jalan. Tamu tidak pernah kecewa.',
    name: 'Ahmad Fauzi',
    place: 'Penginapan Nusantara, Lombok',
    avatar: 'AF',
    color: 'bg-teal-100 text-teal-700',
  },
];

const logos = [
  'Villa Kencana', 'Homestay Merapi', 'Guest House Kota Tua', 'Hotel Melati',
  'Kost Bintang', 'Penginapan Nusantara', 'Villa Emerald', 'Homestay Sejuk',
  'Hotel Bintang 3', 'Villa Panorama', 'Resort Mini Bali', 'Griya Santoso',
];

function AnimatedCounter({ target, suffix, prefix, format }: { target: number; suffix: string; prefix?: string; format?: boolean }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        const duration = 1500;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(current));
          }
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, started]);

  const display = format ? (count >= 1000 ? `${Math.floor(count / 1000)}K` : count.toString()) : count.toString();

  return (
    <span ref={ref}>
      {prefix}{target < 10 ? count.toFixed(1) : display}{suffix}
    </span>
  );
}

interface Props { isEditMode?: boolean; }

const TestimoniSection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.1);

  return (
    <section id="testimoni" className="py-24 bg-gray-50" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            ⭐ Dipercaya Ratusan Pemilik Penginapan
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
            contentEditable={isEditMode}
            suppressContentEditableWarning
          >
            Sudah 500+ Pemilik Penginapan Mempercayai STAY
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Mereka sudah merasakan manfaatnya. Sekarang giliran Anda.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`text-center bg-white rounded-2xl py-8 px-4 shadow-sm border border-gray-100 transition-all duration-700 ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 mb-1">
                <AnimatedCounter target={s.value} suffix={s.suffix} prefix={s.prefix} format={s.format} />
              </div>
              <div className="text-sm text-gray-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover relative transition-all duration-700 ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${200 + i * 80}ms` }}
            >
              <Quote className="w-8 h-8 text-emerald-200 mb-4" />
              <p className="text-gray-700 leading-relaxed mb-6 italic text-sm">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full ${t.color} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.place}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mt-3">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-current" />)}
              </div>
            </div>
          ))}
        </div>

        {/* Logo carousel */}
        <div className={`transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-center text-sm text-gray-400 font-medium mb-6">Dan ratusan penginapan lainnya di seluruh Indonesia</p>
          <div className="relative overflow-hidden">
            <div
              className="flex gap-6 items-center"
              style={{
                animation: 'marquee 20s linear infinite',
                width: 'max-content',
              }}
            >
              {[...logos, ...logos].map((logo, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-6 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-500 font-semibold whitespace-nowrap"
                >
                  🏨 {logo}
                </div>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
};

export default TestimoniSection;
