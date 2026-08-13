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
          title="Coba Alat Bantu"
          highlight="Finansial Gratis"
          subtitle="Gunakan kalkulator dan planner ini untuk mengambil keputusan cerdas sekarang juga."
          className="mb-0!"
        />
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
