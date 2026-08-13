'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatRupiah } from '@/lib/formatters';
import { CheckCircle, Info, Share2, ExternalLink, Heart } from 'lucide-react';

interface BreakdownItem {
  label: string;
  value: number;
}

interface ZakatResultProps {
  isWajib: boolean;
  jumlahZakat: number;
  jumlahZakatBulanan?: number;
  breakdown?: BreakdownItem[];
  gapKeNisab?: number;
  nisab: number;
  onShare?: () => void;
  zakatType: string;
}

export function ZakatResult({
  isWajib,
  jumlahZakat,
  jumlahZakatBulanan,
  breakdown,
  gapKeNisab,
  nisab,
  onShare,
  zakatType,
}: ZakatResultProps) {
  if (isWajib) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card variant="glow" className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Wajib Zakat</h3>
              <p className="text-green-100/70 text-sm">
                Alhamdulillah, hartamu sudah mencapai nisab
              </p>
            </div>
          </div>

          {/* Main Amount */}
          <div className="text-center py-6 border-y border-green-500/20">
            <p className="text-sm text-green-100/70 mb-2">{zakatType} Kamu:</p>
            <motion.p
              className="text-4xl md:text-5xl font-bold text-white"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              {formatRupiah(jumlahZakat)}
            </motion.p>
            <p className="text-green-100/50 mt-2">per tahun</p>
            {jumlahZakatBulanan && (
              <p className="text-green-400 mt-3 font-medium">
                Atau {formatRupiah(jumlahZakatBulanan)} per bulan
              </p>
            )}
          </div>

          {/* Breakdown */}
          {breakdown && breakdown.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-green-100/70 uppercase tracking-wider">
                Detail Perhitungan
              </h4>
              <div className="space-y-2">
                {breakdown.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-green-500/10 last:border-0"
                  >
                    <span className="text-green-100/80 text-sm">
                      {item.label}
                    </span>
                    <span
                      className={`font-medium ${
                        item.value < 0 ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {item.value < 0 ? '- ' : ''}
                      {formatRupiah(Math.abs(item.value))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="mt-6 p-4 bg-green-500/10 rounded-2xl">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-100/80">
                <p className="font-medium text-white mb-1">Rekomendasi:</p>
                <p>
                  Bayar per bulan lebih ringan, atau bayar sekaligus di bulan
                  Ramadhan untuk pahala berlipat.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              className="flex-1"
              leftIcon={<ExternalLink className="w-4 h-4" />}
              onClick={() => window.open('https://baznas.go.id', '_blank')}
            >
              Bayar via BAZNAS
            </Button>
            {onShare && (
              <Button
                variant="secondary"
                onClick={onShare}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Bagikan
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  // Not yet required to pay zakat
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-blue-500/20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
            <Info className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Belum Wajib Zakat</h3>
            <p className="text-green-100/70 text-sm">
              Hartamu belum mencapai nisab
            </p>
          </div>
        </div>

        {/* Gap Info */}
        <div className="py-6 border-y border-green-500/20 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-green-100/70">Nisab saat ini:</span>
            <span className="font-semibold text-white">
              {formatRupiah(nisab)}
            </span>
          </div>
          {gapKeNisab && (
            <div className="flex justify-between items-center">
              <span className="text-green-100/70">Selisih ke nisab:</span>
              <span className="font-semibold text-amber-400">
                {formatRupiah(gapKeNisab)}
              </span>
            </div>
          )}
        </div>

        {/* Encouragement */}
        <div className="mt-6 p-4 bg-green-500/10 rounded-2xl">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-100/80">
              <p className="font-medium text-white mb-1">
                Tapi kamu tetap bisa berbuat baik
              </p>
              <p>
                Sedekah tidak ada batasnya. Bahkan senyum pun sedekah (HR.
                Tirmidzi). Bersedekah semampunya sangat dianjurkan.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            className="flex-1"
            leftIcon={<Heart className="w-4 h-4" />}
            onClick={() => window.open('https://dompetdhuafa.org', '_blank')}
          >
            Sedekah via Dompet Dhuafa
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
