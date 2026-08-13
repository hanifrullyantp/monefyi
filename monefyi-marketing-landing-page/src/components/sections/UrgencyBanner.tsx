import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Zap } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { EditableText } from '../admin/EditableText';

export function UrgencyBanner() {
  // Start from 18 minutes 30 seconds (1110 seconds)
  const [timeLeft, setTimeLeft] = useLocalStorage('monefyi_timer_v2', 18 * 60 + 30); 

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, setTimeLeft]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <SectionWrapper background="dark" className="py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 rounded-[3rem] p-8 md:p-16 text-center relative overflow-hidden">
          
          <motion.div 
            animate={{ opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-red-600 pointer-events-none"
          />

          <div className="relative z-10">
            {/* Header Text */}
            <h3 className="text-red-500 text-sm md:text-lg font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
              <Zap size={20} fill="currentColor" /> <EditableText id="urgency_h3" defaultValue="Jangan Sampai Menyesal" />
            </h3>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter">
              <EditableText id="urgency_h2_1" defaultValue="Harga Launch" /> <br className="hidden md:block" />
              <span className="text-red-500">
                <EditableText id="urgency_h2_2" defaultValue="Segera Berakhir" />
              </span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl font-bold mb-12">
              <EditableText id="urgency_p_1" defaultValue="Hanya Untuk" />{' '}
              <span className="text-white">
                <EditableText id="urgency_p_2" defaultValue="10 Orang Tercepat" />
              </span>{' '}
              <EditableText id="urgency_p_3" defaultValue="Saja" />
            </p>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
              
              {/* Slot Side */}
              <div className="flex flex-col items-center bg-slate-950/50 p-8 rounded-[2.5rem] border border-white/5">
                 <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-4">Tersisa</p>
                 <div className="relative">
                    <div className="text-8xl md:text-9xl font-black text-white leading-none">3</div>
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -top-4 -right-10 bg-red-600 text-white text-xs px-3 py-1.5 rounded-xl font-black shadow-xl"
                    >
                      SLOT!
                    </motion.div>
                 </div>
              </div>

              {/* Timer Side */}
              <div className="flex flex-col items-center">
                 <div className="flex gap-3 md:gap-4 items-center">
                    <TimerBox value={hours} label="JAM" />
                    <div className="text-2xl font-black text-slate-800">:</div>
                    <TimerBox value={minutes} label="MENIT" />
                    <div className="text-2xl font-black text-slate-800">:</div>
                    <TimerBox value={seconds} label="DETIK" color="text-red-500" />
                 </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="pt-8 border-t border-white/5 inline-flex flex-col items-center">
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Harga Promo Aplikasi</p>
               <div className="flex flex-col gap-1 mb-6">
                  <span className="text-slate-600 text-xl font-bold line-through decoration-red-500/50">Rp 299.000</span>
                  <span className="text-slate-600 text-xl font-bold line-through decoration-red-500/50">Rp 199.000</span>
               </div>
               <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-6xl md:text-8xl font-black text-green-400 tracking-tighter"
                  >
                    GRATIS!!
                  </motion.div>
                  <div className="absolute -top-6 -right-10 bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded-md rotate-12">
                    LIMITED
                  </div>
               </div>
            </div>

            <div className="mt-16 flex items-center justify-center gap-2 text-red-500/80 text-[10px] md:text-xs font-black uppercase tracking-widest">
               <AlertCircle size={14} />
               <span>Promo Berakhir Jika Waktu Habis</span>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

function TimerBox({ value, label, color = "text-white" }: { value: number; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-20 md:w-20 md:h-24 bg-slate-950 rounded-3xl border border-white/10 flex items-center justify-center text-3xl md:text-4xl font-black shadow-inner">
        <span className={color}>{value.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-widest">{label}</span>
    </div>
  );
}
