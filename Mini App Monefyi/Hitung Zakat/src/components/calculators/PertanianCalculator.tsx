'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NumberInput } from '@/components/ui/NumberInput';
import { RupiahInput } from '@/components/ui/RupiahInput';
import { Select } from '@/components/ui/Select';
import { InfoBox } from '@/components/ui/InfoBox';
import { ZakatResult } from '@/components/shared/ZakatResult';
import { calculateZakatPertanian } from '@/lib/calculators';
import { formatRupiah, formatKilogram } from '@/lib/formatters';
import { Calculator, Wheat, Droplets } from 'lucide-react';
import type { PertanianInput, PertanianResult } from '@/types/zakat';

const jenisHasilOptions = [
  { value: 'padi', label: 'Padi/Beras' },
  { value: 'gandum', label: 'Gandum' },
  { value: 'jagung', label: 'Jagung' },
  { value: 'kurma', label: 'Kurma' },
  { value: 'anggur', label: 'Anggur' },
  { value: 'lainnya', label: 'Lainnya' },
];

const metodePengairanOptions = [
  { value: 'hujan', label: 'Air Hujan (10%)' },
  { value: 'irigasi', label: 'Air Irigasi/Pompa (5%)' },
  { value: 'kombinasi', label: 'Kombinasi (7.5%)' },
];

export function PertanianCalculator() {
  const [jenisHasil, setJenisHasil] = useState('padi');
  const [hasilPanenKg, setHasilPanenKg] = useState(0);
  const [hargaPerKg, setHargaPerKg] = useState(10000);
  const [metodePengairan, setMetodePengairan] = useState<'hujan' | 'irigasi' | 'kombinasi'>('hujan');
  const [result, setResult] = useState<PertanianResult | null>(null);

  const handleCalculate = () => {
    const input: PertanianInput = {
      hasilPanenKg,
      hargaPerKg,
      metodePengairan,
    };

    const calculatedResult = calculateZakatPertanian(input);
    setResult(calculatedResult);
  };

  const handleShare = () => {
    if (!result) return;
    
    const text = `🌙 Hasil Perhitungan Zakat Pertanian Saya

Hasil Panen: ${result.hasilPanenKg} kg
Zakat: ${result.jumlahZakatKG} kg
Atau: ${formatRupiah(result.jumlahZakatIDR)}

Hitung zakatmu juga di:
https://zakat.monefyi.com

#ZakatMonefyi #KalkulatorZakat`;

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Jenis Hasil */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
            <Wheat className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Hasil Panen</h3>
        </div>
        <div className="space-y-4">
          <Select
            label="Jenis hasil panen"
            options={jenisHasilOptions}
            value={jenisHasil}
            onChange={setJenisHasil}
          />
          <NumberInput
            label="Total hasil panen"
            value={hasilPanenKg}
            onChange={setHasilPanenKg}
            suffix="kg"
            hint="Berat total hasil panen dalam kilogram"
          />
          <RupiahInput
            label="Harga per kg saat ini"
            value={hargaPerKg}
            onChange={setHargaPerKg}
          />
        </div>
      </Card>

      {/* Metode Pengairan */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Metode Pengairan</h3>
        </div>
        <Select
          label="Pilih metode pengairan"
          options={metodePengairanOptions}
          value={metodePengairan}
          onChange={(v) => setMetodePengairan(v as 'hujan' | 'irigasi' | 'kombinasi')}
          hint="Metode pengairan mempengaruhi persentase zakat"
        />
      </Card>

      {/* Info */}
      <InfoBox title="Ketentuan Zakat Pertanian">
        <ul className="space-y-1">
          <li>• Nisab: 5 wasaq = 653 kg gabah</li>
          <li>• Air hujan/mata air: 10% (usyur)</li>
          <li>• Air irigasi/pompa: 5% (nisf usyur)</li>
          <li>• Kombinasi: 7.5%</li>
          <li>• Dikeluarkan setiap panen (tidak perlu haul)</li>
        </ul>
      </InfoBox>

      {/* Calculate Button */}
      <Button
        onClick={handleCalculate}
        className="w-full"
        size="lg"
        leftIcon={<Calculator className="w-5 h-5" />}
      >
        Hitung Zakat Pertanian
      </Button>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <ZakatResult
            isWajib={result.isWajibZakat}
            jumlahZakat={result.jumlahZakatIDR}
            breakdown={[
              { label: `Hasil Panen (${result.hasilPanenKg} kg)`, value: result.nilaiTotalPanen },
              { label: 'Nisab (653 kg)', value: 653 * hargaPerKg },
              { label: `Zakat ${result.ratePersen}%`, value: result.jumlahZakatIDR },
            ]}
            gapKeNisab={result.isWajibZakat ? undefined : (653 - result.hasilPanenKg) * hargaPerKg}
            nisab={653 * hargaPerKg}
            zakatType="Zakat Pertanian"
            onShare={handleShare}
          />

          {result.isWajibZakat && (
            <Card className="bg-green-500/10 border-green-500/30">
              <p className="text-sm text-green-100/80">
                <span className="font-semibold text-white">Dalam bentuk hasil panen:</span>
                <br />
                Zakat kamu = <span className="text-green-400 font-bold">{formatKilogram(result.jumlahZakatKG)}</span> dari hasil panen
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
