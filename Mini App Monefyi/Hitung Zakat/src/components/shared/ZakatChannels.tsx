'use client';

import { Card } from '@/components/ui/Card';
import { LEMBAGA_ZAKAT } from '@/data/lembaga-zakat';
import { ExternalLink, Star } from 'lucide-react';

export function ZakatChannels() {
  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Lembaga Zakat Terpercaya
        </h2>
        <p className="text-green-100/70">
          Salurkan zakatmu melalui lembaga resmi dan terpercaya
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LEMBAGA_ZAKAT.map((lembaga) => (
          <a
            key={lembaga.name}
            href={lembaga.website}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card hover className="h-full">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white truncate">
                      {lembaga.name}
                    </h3>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: lembaga.trustScore }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 text-amber-400 fill-amber-400"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-green-100/70 line-clamp-2">
                    {lembaga.description}
                  </p>
                </div>
                <ExternalLink className="w-5 h-5 text-green-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
