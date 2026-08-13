'use client';

import { Card } from '@/components/ui/Card';
import { BookOpen } from 'lucide-react';

interface QuranQuote {
  surat: string;
  ayat: number;
  arab?: string;
  terjemahan: string;
}

interface HaditsQuote {
  rawi: string;
  text: string;
}

interface DalilQuoteProps {
  type: 'quran' | 'hadits';
  quran?: QuranQuote;
  hadits?: HaditsQuote;
}

export function DalilQuote({ type, quran, hadits }: DalilQuoteProps) {
  if (type === 'quran' && quran) {
    return (
      <Card variant="gold" className="overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-3">
              QS. {quran.surat}: {quran.ayat}
            </div>
            {quran.arab && (
              <p className="text-xl md:text-2xl text-white leading-loose text-right mb-4 font-serif arabic-text">
                {quran.arab}
              </p>
            )}
            <p className="text-green-100/80 italic leading-relaxed">
              &ldquo;{quran.terjemahan}&rdquo;
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (type === 'hadits' && hadits) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-3">
              {hadits.rawi}
            </div>
            <p className="text-green-100/80 italic leading-relaxed">
              &ldquo;{hadits.text}&rdquo;
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
