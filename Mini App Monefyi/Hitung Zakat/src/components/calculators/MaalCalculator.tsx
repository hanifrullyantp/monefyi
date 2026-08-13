'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RupiahInput } from '@/components/ui/RupiahInput';
import { NumberInput } from '@/components/ui/NumberInput';
import { ZakatResult } from '@/components/shared/ZakatResult';
import { calculateZakatMaal } from '@/lib/calculators';
import { Calculator, Wallet, Gem, TrendingUp, FileText } from 'lucide-react';
import type { MaalInput, MaalResult } from '@/types/zakat';

export function MaalCalculator() {
  const [tabungan, setTabungan] = useState(0);
  const [cash, setCash] = useState(0);
  const [emasGram, setEmasGram] = useState(0);
  const [perakGram, setPerakGram] = useState(0);
  const [saham, setSaham] = useState(0);
  const [sukuk, setSukuk] = useState(0);
  const [propertiInvestasi, setPropertiInvestasi] = useState(0);
  const [piutang, setPiutang] = useState(0);
  const [utangJangkaPendek, setUtangJangkaPendek] = useState(0);
  const [kewajiban, setKewajiban] = useState(0);
  const [result, setResult] = useState<MaalResult | null>(null);

  const handleCalculate = () => {
    const input: MaalInput = {
      tabungan,
      cash,
      emasGram,
      perakGram,
      saham,
      sukuk,
      propertiInvestasi,
      piutang,
      utangJangkaPendek,
      kewajiban,
    };

    const calculatedResult = calculateZakatMaal(input);
    setResult(calculatedResult);
  };

  const handleShare = () => {
    if (!result) return;
    
    const text = `🌙 Hasil Perhitungan Zakat Maal Saya

Total Zakat: Rp ${result.jumlahZakat.toLocaleString('id-ID')}

Hitung zakatmu juga di:
https://zakat.monefyi.com

#ZakatMonefyi #KalkulatorZakat`;

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Uang Tunai */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Uang Tunai</h3>
        </div>
        <div className="space-y-4">
          <RupiahInput
            label="Tabungan/Deposito"
            value={tabungan}
            onChange={setTabungan}
            hint="Total saldo di semua rekening bank"
          />
          <RupiahInput
            label="Cash di rumah"
            value={cash}
            onChange={setCash}
            hint="Uang tunai yang disimpan"
          />
        </div>
      </Card>

      {/* Emas & Perak */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
            <Gem className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Emas & Perak</h3>
        </div>
        <p className="text-sm text-green-100/60 mb-4">
          Perhiasan yang sering dipakai tidak wajib dizakati
        </p>
        <div className="space-y-4">
          <NumberInput
            label="Emas (gram)"
            value={emasGram}
            onChange={setEmasGram}
            suffix="gram"
            hint="Emas batangan atau perhiasan yang disimpan"
          />
          <NumberInput
            label="Perak (gram)"
            value={perakGram}
            onChange={setPerakGram}
            suffix="gram"
          />
        </div>
      </Card>

      {/* Investasi */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Investasi</h3>
        </div>
        <div className="space-y-4">
          <RupiahInput
            label="Saham/Reksadana"
            value={saham}
            onChange={setSaham}
            hint="Nilai portofolio saat ini"
          />
          <RupiahInput
            label="Sukuk"
            value={sukuk}
            onChange={setSukuk}
          />
          <RupiahInput
            label="Properti untuk disewakan"
            value={propertiInvestasi}
            onChange={setPropertiInvestasi}
            hint="Nilai properti investasi (bukan rumah tinggal)"
          />
        </div>
      </Card>

      {/* Piutang & Utang */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Piutang & Utang</h3>
        </div>
        <div className="space-y-4">
          <RupiahInput
            label="Piutang (yang akan kembali)"
            value={piutang}
            onChange={setPiutang}
            hint="Uang yang dipinjamkan dan pasti dikembalikan"
          />
          <RupiahInput
            label="Utang jangka pendek (pengurang)"
            value={utangJangkaPendek}
            onChange={setUtangJangkaPendek}
            hint="Utang yang jatuh tempo dalam 1 tahun"
          />
          <RupiahInput
            label="Kewajiban lain (pengurang)"
            value={kewajiban}
            onChange={setKewajiban}
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
        Hitung Zakat Maal
      </Button>

      {/* Result */}
      {result && (
        <ZakatResult
          isWajib={result.isWajibZakat}
          jumlahZakat={result.jumlahZakat}
          breakdown={[
            { label: 'Total Harta', value: result.totalHarta },
            { label: 'Total Pengurang (utang)', value: -result.totalPengurang },
            { label: 'Harta Bersih', value: result.hartaBersih },
            { label: 'Nisab (85 gram emas)', value: result.nisab },
            { label: 'Zakat 2.5%', value: result.jumlahZakat },
          ]}
          gapKeNisab={result.isWajibZakat ? undefined : result.nisab - result.hartaBersih}
          nisab={result.nisab}
          zakatType="Zakat Maal"
          onShare={handleShare}
        />
      )}
    </div>
  );
}
