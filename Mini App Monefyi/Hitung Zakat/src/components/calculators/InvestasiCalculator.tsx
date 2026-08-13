'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RupiahInput } from '@/components/ui/RupiahInput';
import { InfoBox } from '@/components/ui/InfoBox';
import { ZakatResult } from '@/components/shared/ZakatResult';
import { calculateZakatInvestasi } from '@/lib/calculators';
import { Calculator, TrendingUp, AlertTriangle } from 'lucide-react';
import type { InvestasiInput, InvestasiResult } from '@/types/zakat';

export function InvestasiCalculator() {
  const [sahamSyariah, setSahamSyariah] = useState(0);
  const [reksadanaSyariah, setReksadanaSyariah] = useState(0);
  const [sukuk, setSukuk] = useState(0);
  const [depositoSyariah, setDepositoSyariah] = useState(0);
  const [p2pSyariah, setP2pSyariah] = useState(0);
  const [emasDigital, setEmasDigital] = useState(0);
  const [propertiInvestasi, setPropertiInvestasi] = useState(0);
  const [sahamKonvensional, setSahamKonvensional] = useState(0);
  const [reksadanaKonvensional, setReksadanaKonvensional] = useState(0);
  const [result, setResult] = useState<InvestasiResult | null>(null);

  const handleCalculate = () => {
    const input: InvestasiInput = {
      sahamSyariah,
      reksadanaSyariah,
      sukuk,
      depositoSyariah,
      p2pSyariah,
      emasDigital,
      propertiInvestasi,
      sahamKonvensional,
      reksadanaKonvensional,
    };

    const calculatedResult = calculateZakatInvestasi(input);
    setResult(calculatedResult);
  };

  const handleShare = () => {
    if (!result) return;
    
    const text = `🌙 Hasil Perhitungan Zakat Investasi Saya

Total Zakat: Rp ${result.jumlahZakat.toLocaleString('id-ID')}

Hitung zakatmu juga di:
https://zakat.monefyi.com

#ZakatMonefyi #KalkulatorZakat`;

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Investasi Syariah */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Investasi Syariah</h3>
        </div>
        <div className="space-y-4">
          <RupiahInput
            label="Saham syariah (ISSI)"
            value={sahamSyariah}
            onChange={setSahamSyariah}
            hint="Nilai portofolio saat ini"
          />
          <RupiahInput
            label="Reksadana syariah"
            value={reksadanaSyariah}
            onChange={setReksadanaSyariah}
          />
          <RupiahInput
            label="Sukuk (obligasi syariah)"
            value={sukuk}
            onChange={setSukuk}
          />
          <RupiahInput
            label="Deposito syariah"
            value={depositoSyariah}
            onChange={setDepositoSyariah}
          />
          <RupiahInput
            label="P2P Lending syariah"
            value={p2pSyariah}
            onChange={setP2pSyariah}
          />
          <RupiahInput
            label="Emas digital"
            value={emasDigital}
            onChange={setEmasDigital}
            hint="Tokopedia Emas, Pegadaian Digital, dll"
          />
          <RupiahInput
            label="Properti investasi"
            value={propertiInvestasi}
            onChange={setPropertiInvestasi}
            hint="Properti untuk disewakan/dijual (bukan rumah tinggal)"
          />
        </div>
      </Card>

      {/* Investasi Non-Syariah */}
      <Card className="border-amber-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Investasi Non-Syariah</h3>
            <p className="text-xs text-amber-400">Sebaiknya dihindari atau dimigrasikan ke syariah</p>
          </div>
        </div>
        <div className="space-y-4">
          <RupiahInput
            label="Saham konvensional"
            value={sahamKonvensional}
            onChange={setSahamKonvensional}
          />
          <RupiahInput
            label="Reksadana konvensional"
            value={reksadanaKonvensional}
            onChange={setReksadanaKonvensional}
          />
        </div>
      </Card>

      {/* Info */}
      <InfoBox title="Panduan Zakat Investasi">
        <ul className="space-y-1">
          <li>• Nisab: 85 gram emas</li>
          <li>• Zakat: 2.5% dari total nilai investasi</li>
          <li>• Haul: sudah dimiliki 1 tahun</li>
          <li>• Yang dihitung: nilai saat ini (bukan harga beli)</li>
        </ul>
      </InfoBox>

      <InfoBox variant="warning" title="Investasi Properti">
        <ul className="space-y-1">
          <li>• Untuk disewakan: 2.5% dari hasil sewa (setelah 1 tahun)</li>
          <li>• Untuk dijual: 2.5% dari nilai jual</li>
          <li>• Rumah tinggal sendiri: TIDAK wajib zakat</li>
        </ul>
      </InfoBox>

      {/* Calculate Button */}
      <Button
        onClick={handleCalculate}
        className="w-full"
        size="lg"
        leftIcon={<Calculator className="w-5 h-5" />}
      >
        Hitung Zakat Investasi
      </Button>

      {/* Result */}
      {result && (
        <ZakatResult
          isWajib={result.isWajibZakat}
          jumlahZakat={result.jumlahZakat}
          breakdown={[
            { label: 'Investasi Syariah', value: result.totalInvestasiSyariah },
            { label: 'Investasi Konvensional', value: result.totalInvestasiKonvensional },
            { label: 'Total Investasi', value: result.totalInvestasi },
            { label: 'Nisab (85 gram emas)', value: result.nisab },
            { label: 'Zakat 2.5%', value: result.jumlahZakat },
          ]}
          gapKeNisab={result.isWajibZakat ? undefined : result.nisab - result.totalInvestasi}
          nisab={result.nisab}
          zakatType="Zakat Investasi"
          onShare={handleShare}
        />
      )}
    </div>
  );
}
