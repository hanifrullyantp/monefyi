import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, ShieldCheck, CreditCard, CloudOff } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { Button } from '../ui/Button';
import { GradientText } from '../ui/GradientText';
import { EditableText } from '../admin/EditableText';

export function FinalCTA() {
  return (
    <SectionWrapper background="green" className="py-24 md:py-32">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-tight">
            <EditableText id="final_cta_h2_1" defaultValue="Siap Berhenti" />{' '}
            <GradientText variant="red">
              <EditableText id="final_cta_h2_2" defaultValue="Tekor" />
            </GradientText>{' '}
            <EditableText id="final_cta_h2_3" defaultValue="dan Mulai Bangun" />{' '}
            <GradientText variant="green">
              <EditableText id="final_cta_h2_4" defaultValue="Kekayaan?" />
            </GradientText>
          </h2>
          
          <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
            <EditableText 
              id="final_cta_sub" 
              defaultValue="Bergabunglah dengan 3.847+ orang lainnya yang sudah mengambil kendali penuh atas uang mereka. Ambil Promo Launch hari ini sebelum harga naik!" 
              multiline 
            />
          </p>

          <div className="flex flex-col items-center gap-6">
            <Button size="xl" className="group px-12 py-6 text-xl shadow-green-glow animate-pulse hover:animate-none">
              <Rocket className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Dapatkan Akses Lifetime Sekarang
            </Button>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
              {[
                { icon: ShieldCheck, text: 'Data 100% Aman' },
                { icon: CreditCard, text: 'Tanpa Kartu Kredit' },
                { icon: CloudOff, text: 'Bisa Offline' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-500">
                  <item.icon size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
