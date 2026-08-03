import React, { useState } from 'react';
import { Check, Star, Zap, Building2 } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const plans = [
  {
    name: 'Starter',
    tagline: 'Untuk yang baru mulai',
    price: 'GRATIS',
    priceNote: 'Selamanya',
    icon: Zap,
    color: 'gray',
    popular: false,
    features: [
      'Maksimal 5 kamar',
      'Dashboard & booking manual',
      'Front desk digital',
      'Manajemen tamu dasar',
      '1 pengguna',
      'Support via email',
      'Laporan dasar',
      'Denah kamar visual',
    ],
    cta: 'Mulai Gratis',
    ctaStyle: 'border-2 border-gray-300 text-gray-700 hover:border-emerald-400 hover:text-emerald-600',
  },
  {
    name: 'Profesional',
    tagline: 'Paling banyak dipilih',
    price: 'Rp 299.000',
    priceNote: '/bulan',
    priceAnnual: 'Rp 239.200/bulan (hemat 20%)',
    icon: Star,
    color: 'emerald',
    popular: true,
    features: [
      'Maksimal 20 kamar',
      'Semua fitur Starter',
      'Booking online publik',
      'Pembayaran QRIS, VA, E-Wallet',
      'WhatsApp otomatis',
      'Manajemen staff & payroll',
      'Housekeeping management',
      'Laporan lengkap + export',
      '5 pengguna',
      'Support prioritas WhatsApp',
    ],
    cta: 'Coba 14 Hari Gratis',
    ctaStyle: 'bg-emerald-500 text-white hover:bg-emerald-600',
  },
  {
    name: 'Enterprise',
    tagline: 'Untuk skala lebih besar',
    price: 'Rp 799.000',
    priceNote: '/bulan',
    priceAnnual: 'Rp 639.200/bulan (hemat 20%)',
    icon: Building2,
    color: 'blue',
    popular: false,
    features: [
      'Kamar unlimited',
      'Semua fitur Profesional',
      'Multi-property',
      'Channel Manager (OTA)',
      'Dynamic Pricing AI',
      'AI Assistant 24 jam',
      'Custom domain',
      'Loyalty program',
      'Accounting module',
      'Pengguna unlimited',
      'Dedicated account manager',
      'API access',
    ],
    cta: 'Hubungi Sales',
    ctaStyle: 'border-2 border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50',
  },
];

interface Props { isEditMode?: boolean; }

const PricingSection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.1);
  const [annual, setAnnual] = useState(false);

  return (
    <section id="harga" className="py-24 bg-gray-50" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            💰 Harga Transparan, Tanpa Biaya Tersembunyi
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black text-gray-900 mb-4 ${isEditMode ? 'inline-editable' : ''}`}
            contentEditable={isEditMode}
            suppressContentEditableWarning
          >
            Harga Bersahabat, Manfaat Luar Biasa
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Mulai gratis. Naik paket kapan saja Anda siap. Tidak ada biaya tersembunyi.
          </p>

          {/* Toggle annual/monthly */}
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}
            >
              Tahunan
              <span className="bg-amber-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">Hemat 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <div
                key={i}
                className={`relative rounded-3xl transition-all duration-700 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                } ${plan.popular ? 'ring-2 ring-emerald-500 shadow-2xl shadow-emerald-100 scale-105' : 'shadow-sm border border-gray-200'} bg-white`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    ⭐ PALING POPULER
                  </div>
                )}

                <div className="p-7">
                  {/* Plan header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.color === 'emerald' ? 'bg-emerald-100' :
                      plan.color === 'blue' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        plan.color === 'emerald' ? 'text-emerald-600' :
                        plan.color === 'blue' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <div className="font-black text-gray-900">{plan.name}</div>
                      <div className="text-xs text-gray-500">{plan.tagline}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-5 mb-6">
                    <div className={`text-4xl font-black ${
                      plan.color === 'emerald' ? 'text-emerald-600' :
                      plan.color === 'blue' ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {annual && plan.price !== 'GRATIS'
                        ? plan.price.replace('299.000', '239.200').replace('799.000', '639.200')
                        : plan.price}
                      <span className="text-lg font-medium text-gray-500 ml-1">{plan.priceNote}</span>
                    </div>
                    {annual && plan.priceAnnual && (
                      <div className="text-xs text-emerald-600 font-semibold mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded-full">
                        Tagihan tahunan
                      </div>
                    )}
                  </div>

                  {/* CTA button */}
                  <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 mb-6 ${plan.ctaStyle}`}>
                    {plan.cta}
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-100 mb-5" />

                  {/* Features list */}
                  <ul className="space-y-3">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          plan.color === 'emerald' ? 'text-emerald-500' :
                          plan.color === 'blue' ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        <span className="text-sm text-gray-600">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        <div className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center text-sm text-gray-600 transition-all duration-700 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center gap-2">🎁 <span>Diskon 20% untuk pembayaran tahunan</span></div>
          <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center gap-2">💚 <span>Tidak ada biaya setup atau kontrak</span></div>
          <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center gap-2">🔄 <span>Upgrade atau downgrade kapan saja</span></div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
