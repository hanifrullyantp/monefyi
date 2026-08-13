import React from 'react';
import { Sparkles } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { AppsGrid } from '../bonus-apps/AppsGrid';
import { Badge } from '../ui/Badge';
import { EditableText } from '../admin/EditableText';

export function BonusApps() {
  return (
    <SectionWrapper background="alt">
      <div className="flex flex-col items-center mb-12">
        <Badge variant="green" className="mb-4">
          <Sparkles size={12} /> EXTRA BONUSES
        </Badge>
        <SectionHeader
          title="Dapatkan 4 Aplikasi"
          highlight="Bonus Senilai Rp 796rb"
          subtitle="Gunakan alat bantu finansial nyata ini untuk mengambil keputusan cerdas sekarang juga."
          className="mb-0!"
        />
        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4">
           <div className="text-left">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Value</p>
              <p className="text-2xl font-black text-white line-through decoration-red-500/50">Rp 796.000</p>
           </div>
           <div className="w-px h-10 bg-slate-800" />
           <div className="text-left">
              <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">Special Price</p>
              <p className="text-2xl font-black text-green-400">GRATIS</p>
           </div>
        </div>
      </div>

      <AppsGrid />
      
      <div className="mt-12 text-center p-6 bg-slate-900/50 border border-slate-800 rounded-3xl">
         <p className="text-slate-500 text-xs">
           * Versi di atas adalah versi ringan (lite). Dapatkan versi <b>FULL & Terintegrasi</b> dengan fitur sinkronisasi otomatis di dalam paket Lifetime Monefyi.
         </p>
      </div>
    </SectionWrapper>
  );
}
