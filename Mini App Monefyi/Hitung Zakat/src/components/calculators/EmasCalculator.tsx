'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NumberInput } from '@/components/ui/NumberInput';
import { RupiahInput } from '@/components/ui/RupiahInput';
import { InfoBox } from '@/components/ui/InfoBox';
import { ZakatResult } from '@/components/shared/ZakatResult';
import { calculateZakatEmas } from '@/lib/calculators';
import { HARGA_EMAS_PER_GRAM, HARGA_PERAK_PER_GRAM } from '@/data/nisab';
import { Calculator, Gem } from 'lucide-react';
import type { EmasInput, EmasResult } from '@/types/zakat';

export function EmasCalculator() {
  const [emasGram, setEmasGram] = useState(0);
  const [perhiasanDisimpan, setPerhiasanDisimpan] = useState(0);
  const [perakGram, setPerakGram] = useState(0);
  const [hargaEmas, setHargaEmas] = useState(HARGA_EMAS_PER_GRAM);
  const [hargaPerak, setHargaPerak] = useState(HARGA_PERAK_PER_GRAM);
  const [result, setResult] = useState<EmasResult | null>(null);

  const handleCalculate = () => {
    const input: EmasInput = {
      emasGram,
      perhiasanDisimpan,
      perakGram,
      hargaEmasPerGram: hargaEmas,
      hargaPerakPerGram: hargaPerak,
    };

    const calculatedResult = calculateZakatEmas(input);
    setResult(calculatedResult);
  };

  const handleShare = () => {
    if (!result) return;
    
    const text = `🌙 Hasil Perhitungan Zakat Emas Saya

Total Zakat: Rp ${result.jumlahZakat.toLocaleString('id-ID')}

Hitung zakatmu juga di:
https://zakat.monefyi.com

#ZakatMonefyi #KalkulatorZakat`;

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Emas */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
            <Gem className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Emas</h3>
        </div>
        <div className="space-y-4">
          <NumberInput
            label="Emas batangan"
            value={emasGram}
            onChange={setEmasGram}
            suffix="gram"
            hint="Emas murni untuk investasi"
          />
          <NumberInput
            label="Perhiasan emas yang disimpan"
            value={perhiasanDisimpan}
            onChange={setPerhiasanDisimpan}
            suffix="gram"
            hint="Perhiasan yang tidak dipakai sehari-hari"
          />
        </div>
      </Card>

      {/* Perak */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-400/20 to-gray-500/10 flex items-center justify-center">
            <Gem className="w-5 h-5 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-white">Perak</h3>
        </div>
        <NumberInput
          label="Perak (batangan/perhiasan disimpan)"
          value={perakGram}
          onChange={setPerakGram}
          suffix="gram"
        />
      </Card>

      {/* Harga */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Harga Saat Ini</h3>
        <p className="text-sm text-green-100/60 mb-4">
          Sesuaikan dengan harga pasar terkini
        </p>
        <div className="space-y-4">
          <RupiahInput
            label="Harga emas per gram"
            value={hargaEmas}
            onChange={setHargaEmas}
          />
          <RupiahInput
            label="Harga perak per gram"
            value={hargaPerak}
            onChange={setHargaPerak}
          />
        </div>
      </Card>

      {/* Info */}
      <InfoBox title="Yang Perlu Diketahui">
        <ul className="space-y-1">
          <li>• Nisab emas: 85 gram</li>
          <li>• Nisab perak: 595 gram</li>
          <li>• Zakat: 2.5% dari total nilai</li>
          <li>• Perhiasan yang sering dipakai TIDAK wajib dizakati</li>
        </ul>
      </InfoBox>

      {/* Calculate Button */}
      <Button
        onClick={handleCalculate}
        className="w-full"
        size="lg"
        leftIcon={<Calculator className="w-5 h-5" />}
      >
        Hitung Zakat Emas
      </Button>

      {/* Result */}
      {result && (
        <ZakatResult
          isWajib={result.isWajibZakat}
          jumlahZakat={result.jumlahZakat}
          breakdown={[
            { label: `Total Emas (${result.totalEmasGram} gram)`, value: result.nilaiEmas },
            { label: `Total Perak (${result.totalPerakGram} gram)`, value: result.nilaiPerak },
            { label: 'Total Nilai', value: result.totalNilai },
            { label: 'Zakat 2.5%', value: result.jumlahZakat },
          ]}
          gapKeNisab={result.isWajibZakat ? undefined : (85 - result.totalEmasGram) * hargaEmas}
          nisab={85 * hargaEmas}
          zakatType="Zakat Emas & Perak"
          onShare={handleShare}
        />
      )}
    </div>
  );
}
