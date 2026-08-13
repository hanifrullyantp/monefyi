'use client';

import { Card } from '@/components/ui/Card';
import { Container } from '@/components/layout/Container';
import { formatRupiah, formatNumber } from '@/lib/formatters';
import { HARGA_EMAS_PER_GRAM, getNisabInRupiah } from '@/data/nisab';
import { Gem, RefreshCw, TrendingUp } from 'lucide-react';

export function NisabTracker() {
  const hargaEmas = HARGA_EMAS_PER_GRAM;
  const nisab = getNisabInRupiah();
  const nisabBulanan = Math.ceil(nisab / 12);

  return (
    <section className="py-8 -mt-8 relative z-10">
      <Container>
        <Card variant="glow" className="bg-gradient-to-r from-green-950/80 to-emerald-950/80">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Icon */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <Gem className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Harga Emas Hari Ini</h3>
                <p className="text-amber-400 text-xl font-bold">
                  {formatRupiah(hargaEmas)}/gram
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-16 bg-green-500/20" />

            {/* Nisab Info */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/5 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 uppercase tracking-wider">
                    Nisab Tahunan
                  </span>
                </div>
                <p className="text-xl font-bold text-white">
                  {formatRupiah(nisab)}
                </p>
                <p className="text-xs text-green-100/50">= 85 gram emas</p>
              </div>
              
              <div className="p-4 bg-green-500/5 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 uppercase tracking-wider">
                    Nisab Bulanan
                  </span>
                </div>
                <p className="text-xl font-bold text-white">
                  {formatRupiah(nisabBulanan)}
                </p>
                <p className="text-xs text-green-100/50">dibagi 12 bulan</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-green-100/40 text-center md:text-left">
            * Harga emas dapat berubah setiap saat. Update terakhir: {new Date().toLocaleDateString('id-ID')}
          </p>
        </Card>
      </Container>
    </section>
  );
}
