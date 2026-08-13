import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { GradientText } from '../ui/GradientText';
import { EditableText } from '../admin/EditableText';

export function Guarantee() {
  return (
    <SectionWrapper>
      <div className="max-w-4xl mx-auto bg-gradient-to-br from-green-900/40 to-slate-900 border border-green-500/30 rounded-[3rem] p-10 md:p-16 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-full bg-green-500 shadow-green-glow flex items-center justify-center text-white mx-auto mb-10">
            <ShieldCheck size={48} />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter">
            <EditableText id="guarantee_h2_1" defaultValue="Garansi 7 Hari" />{' '}
            <GradientText variant="green">
              <EditableText id="guarantee_h2_2" defaultValue="100% Uang Kembali" />
            </GradientText>
          </h2>

          <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-12 max-w-2xl mx-auto">
            <EditableText 
              id="guarantee_desc" 
              defaultValue="Kami sangat yakin Monefyi akan mengubah hidup Anda. Jika dalam 7 hari Anda merasa aplikasi ini tidak membantu, kami kembalikan uang Anda 100% tanpa potongan. Zero risk." 
              multiline 
            />
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
            {[
              'Sudah mulai pakai aplikasinya',
              'Proses refund < 24 jam',
              'Akses bonus tetap milik Anda',
              'Support responsif via WA'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                <Check size={18} className="text-green-500" />
                <EditableText id={`guarantee_item_${i}`} defaultValue={item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
