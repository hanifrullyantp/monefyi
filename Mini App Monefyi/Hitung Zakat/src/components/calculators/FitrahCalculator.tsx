'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NumberInput } from '@/components/ui/NumberInput';
import { RupiahInput } from '@/components/ui/RupiahInput';
import { Toggle } from '@/components/ui/Toggle';
import { calculateZakatFitrah } from '@/lib/calculators';
import { formatRupiah, formatKilogram } from '@/lib/formatters';
import { HARGA_BERAS_PER_KG } from '@/data/nisab';
import { Calculator, Moon, Users, ExternalLink, Share2 } from 'lucide-react';
import type { FitrahInput, FitrahResult } from '@/types/zakat';

export function FitrahCalculator() {
  const [ayah, setAyah] = useState(1);
  const [ibu, setIbu] = useState(1);
  const [anak, setAnak] = useState(0);
  const [orangTua, setOrangTua] = useState(0);
  const [lainnya, setLainnya] = useState(0);
  const [metodePembayaran, setMetodePembayaran] = useState<'beras' | 'uang'>('uang');
  const [hargaBeras, setHargaBeras] = useState(HARGA_BERAS_PER_KG);
  const [result, setResult] = useState<FitrahResult | null>(null);

  const handleCalculate = () => {
    const input: FitrahInput = {
      jumlahJiwa: {
        ayah,
        ibu,
        anak,
        orangTua,
        lainnya,
      },
      metodePembayaran,
      hargaBerasPerKg: hargaBeras,
    };

    const calculatedResult = calculateZakatFitrah(input);
    setResult(calculatedResult);
  };

  const handleShare = () => {
    if (!result) return;
    
    const text = `🌙 Zakat Fitrah Keluarga Saya

${result.totalJiwa} jiwa × ${formatRupiah(result.uangPerJiwa)}
= ${formatRupiah(result.totalUang)}

Atau: ${formatKilogram(result.totalBeras)} beras

Hitung zakatmu juga di:
https://zakat.monefyi.com

#ZakatFitrah #Ramadhan`;

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Jumlah Jiwa */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Jumlah Anggota Keluarga</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberInput
            label="Ayah"
            value={ayah}
            onChange={setAyah}
            suffix="jiwa"
          />
          <NumberInput
            label="Ibu"
            value={ibu}
            onChange={setIbu}
            suffix="jiwa"
          />
          <NumberInput
            label="Anak-anak"
            value={anak}
            onChange={setAnak}
            suffix="jiwa"
          />
          <NumberInput
            label="Orang tua yang ditanggung"
            value={orangTua}
            onChange={setOrangTua}
            suffix="jiwa"
          />
          <NumberInput
            label="Anggota keluarga lain"
            value={lainnya}
            onChange={setLainnya}
            suffix="jiwa"
            hint="Pembantu, dll yang ditanggung"
          />
        </div>

        <div className="mt-6 p-4 bg-green-500/10 rounded-xl">
          <p className="text-sm text-green-100/80">
            <span className="font-semibold text-white">Total:</span>{' '}
            <span className="text-green-400 font-bold text-lg">
              {ayah + ibu + anak + orangTua + lainnya} jiwa
            </span>
          </p>
        </div>
      </Card>

      {/* Metode & Harga */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Metode Pembayaran</h3>
        <div className="space-y-4">
          <Toggle
            options={[
              { value: 'uang', label: 'Uang' },
              { value: 'beras', label: 'Beras' },
            ]}
            value={metodePembayaran}
            onChange={(v) => setMetodePembayaran(v as 'beras' | 'uang')}
          />
          <RupiahInput
            label="Harga beras per kg"
            value={hargaBeras}
            onChange={setHargaBeras}
            hint="Sesuaikan dengan harga beras di daerahmu"
          />
        </div>
      </Card>

      {/* Calculate Button */}
      <Button
        onClick={handleCalculate}
        className="w-full"
        size="lg"
        leftIcon={<Calculator className="w-5 h-5" />}
      >
        Hitung Zakat Fitrah
      </Button>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card variant="glow" className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Moon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Zakat Fitrah Keluargamu</h3>
                <p className="text-green-100/70 text-sm">
                  Ramadhan 1447 H / 2026 M
                </p>
              </div>
            </div>

            {/* Main Amount */}
            <div className="text-center py-6 border-y border-green-500/20">
              <p className="text-sm text-green-100/70 mb-2">
                {result.totalJiwa} jiwa × {formatRupiah(result.uangPerJiwa)}
              </p>
              <motion.p
                className="text-4xl md:text-5xl font-bold text-white"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                {formatRupiah(result.totalUang)}
              </motion.p>
              <p className="text-green-400 mt-3 font-medium">
                Atau: {formatKilogram(result.totalBeras)} beras premium
              </p>
            </div>

            {/* Timing */}
            <div className="mt-6 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <div className="flex items-start gap-3">
                <Moon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-100/80">
                  <p className="font-medium text-white mb-1">Waktu Pembayaran:</p>
                  <p>
                    Sebelum Sholat Idul Fitri. Sebaiknya dibayar di awal Ramadhan agar
                    dapat disalurkan tepat waktu.
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
              <Button
                variant="secondary"
                onClick={handleShare}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Bagikan
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
