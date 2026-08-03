import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowRight, Shield, Zap, CreditCard } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const trustBadges = [
  { icon: Shield, label: 'Data aman & terenkripsi' },
  { icon: Zap, label: 'Setup dalam 10 menit' },
  { icon: CreditCard, label: 'Tanpa kartu kredit' },
];

function useCountdown(targetHours = 23, targetMinutes = 47, targetSeconds = 0) {
  const [time, setTime] = useState({
    h: targetHours,
    m: targetMinutes,
    s: targetSeconds,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 23, m: 59, s: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

interface Props { isEditMode?: boolean; }

const FinalCTASection: React.FC<Props> = ({ isEditMode }) => {
  const [ref, inView] = useInView(0.1);
  const time = useCountdown();

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <section id="cta" className="py-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 relative overflow-hidden" ref={ref as React.RefObject<HTMLElement>}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="absolute inset-0 hero-pattern opacity-20" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Countdown timer */}
        <div className={`inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-3 mb-8 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-white/80 text-sm font-medium">⏰ Promo Gratis 14 Hari berakhir dalam:</span>
          <div className="flex items-center gap-1 font-black text-white">
            <span className="bg-white/20 rounded-lg px-2 py-1 text-sm">{pad(time.h)}</span>
            <span>:</span>
            <span className="bg-white/20 rounded-lg px-2 py-1 text-sm">{pad(time.m)}</span>
            <span>:</span>
            <span className="bg-white/20 rounded-lg px-2 py-1 text-sm">{pad(time.s)}</span>
          </div>
        </div>

        <h2
          className={`text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${isEditMode ? 'inline-editable' : ''}`}
          contentEditable={isEditMode}
          suppressContentEditableWarning
        >
          Berhenti Kerja Keras.
          <br />
          Mulai Kerja Cerdas.
        </h2>

        <p
          className={`text-xl text-white/85 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${isEditMode ? 'inline-editable' : ''}`}
          contentEditable={isEditMode}
          suppressContentEditableWarning
        >
          Setiap hari Anda menunda, adalah hari di mana kompetitor Anda unggul. Mulai hari ini, gratis 14 hari, tanpa risiko.
        </p>

        {/* CTA buttons */}
        <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-10 transition-all duration-700 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <button className="group flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-emerald-700 font-black rounded-xl text-lg transition-all duration-200 shadow-2xl">
            Daftar Gratis Sekarang
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/40 hover:border-white hover:bg-white/10 text-white font-bold rounded-xl text-lg transition-all duration-200">
            <MessageCircle className="w-5 h-5" />
            Chat dengan Tim Kami
          </button>
        </div>

        {/* Trust badges */}
        <div className={`flex flex-wrap justify-center gap-4 sm:gap-8 transition-all duration-700 delay-400 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {trustBadges.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-white/80">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-lg">🇮🇩</span>
            <span className="text-sm font-medium">Support Bahasa Indonesia</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
