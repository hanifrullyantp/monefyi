import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Zap, Clock, TrendingUp } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';

const REASONS = [
  { icon: Shield, title: 'Keamanan Data Banking', desc: 'Kami tidak meminta akses ke rekening bank Anda. Privasi 100% terjaga.' },
  { icon: Clock, title: 'Hemat Waktu 10 Jam/Bulan', desc: 'Otomatisasi pencatatan dan analisis AI menghemat waktu berharga Anda.' },
  { icon: Zap, title: 'Instant Peace of Mind', desc: 'Tidak ada lagi rasa takut saat membuka aplikasi saldo. Anda selalu tau posisi Anda.' },
  { icon: TrendingUp, title: 'ROI 100x Lipat', desc: 'Dengan Rp 99rb, potensi penghematan jutaan rupiah tiap bulan adalah investasi terbaik.' },
  { icon: Lock, title: 'Akses Selamanya', desc: 'Sekali beli, akses fitur dan update gratis seumur hidup. Tanpa langganan bulanan.' },
];

export function WhyBuyNow() {
  return (
    <SectionWrapper background="alt">
      <SectionHeader
        eyebrow="WHY MONEFYI"
        title="Kenapa Beli"
        highlight="Sekarang?"
        subtitle="Masa depan finansial Anda dimulai dari keputusan kecil hari ini."
      />

      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          {REASONS.map((reason, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-6 p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-slate-700 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0 group-hover:bg-green-500 group-hover:text-white transition-all">
                <reason.icon size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">{reason.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{reason.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
