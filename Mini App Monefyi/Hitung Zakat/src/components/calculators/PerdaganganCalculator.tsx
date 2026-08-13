'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RupiahInput } from '@/components/ui/RupiahInput';
import { InfoBox } from '@/components/ui/InfoBox';
import { ZakatResult } from '@/components/shared/ZakatResult';
import { calculateZakatPerdagangan } from '@/lib/calculators';
import { Calculator, Building2, TrendingDown } from 'lucide-react';
import type { PerdaganganInput, PerdaganganResult } from '@/types/zakat';

export function PerdaganganCalculator() {
  const [modalKerja, setModalKerja] = useState(0);
  const [kas, setKas] = useState(0);
  const [persediaan, setPersediaan] = useState(0);
  const [piutangUsaha, setPiutangUsaha] = useState(0);
  const [investasiBisnis, setInvestasiBisnis] = useState(0);
  const [utangUsaha, setUtangUsaha] = useState(0);
  const [pajakBelumBayar, setPajakBelumBayar] = useState(0);
  const [gajiKaryawan, setGajiKaryawan] = useState(0);
  const [result, setResult] = useState<PerdaganganResult | null>(null);

  const handleCalculate = () => {
    const input: PerdaganganInput = {
      modalKerja,
      kas,
      persediaan,
      piutangUsaha,
      investasiBisnis,
      utangUsaha,
      pajakBelumBayar,
      gajiKaryawan,
    };

    const calculatedResult = calculateZakatPerdagangan(input);
    setResult(calculatedResult);
  };

  const handleShare = () => {
    if (!result) return;
    
    const text = `🌙 Hasil Perhitungan Zakat Perdagangan Saya

Total Zakat: Rp ${result.jumlahZakat.toLocaleString('id-ID')}

Hitung zakatmu juga di:
https://zakat.monefyi.com

#ZakatMonefyi #KalkulatorZakat`;

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Aset Lancar */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Aset Lancar</h3>
        </div>
        <div className="space-y-4">
          <RupiahInput
            label="Modal kerja"
            value={modalKerja}
            onChange={setModalKerja}
            hint="Dana operasional bisnis"
          />
          <RupiahInput
            label="Kas"
            value={kas}
            onChange={setKas}
            hint="Uang tunai di kasir/brankas"
          />
          <RupiahInput
            label="Persediaan barang"
            value={persediaan}
            onChange={setPersediaan}
            hint="Nilai stok barang dagangan"
          />
          <RupiahInput
            label="Piutang usaha"
            value={piutangUsaha}
            onChange={setPiutangUsaha}
            hint="Tagihan yang belum dibayar pelanggan"
          />
        </div>
      </Card>

      {/* Investasi Bisnis */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Aset Investasi Bisnis</h3>
        <RupiahInput
          label="Investasi/saham anak perusahaan"
          value={investasiBisnis}
          onChange={setInvestasiBisnis}
        />
      </Card>

      {/* Kewajiban */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Kewajiban (Pengurang)</h3>
        </div>
        <div className="space-y-4">
          <RupiahInput
            label="Utang usaha jangka pendek"
            value={utangUsaha}
            onChange={setUtangUsaha}
            hint="Utang ke supplier yang jatuh tempo"
          />
          <RupiahInput
            label="Pajak yang belum dibayar"
            value={pajakBelumBayar}
            onChange={setPajakBelumBayar}
          />
          <RupiahInput
            label="Gaji karyawan yang belum dibayar"
            value={gajiKaryawan}
            onChange={setGajiKaryawan}
          />
        </div>
      </Card>

      {/* Info */}
      <InfoBox title="Rumus Zakat Perdagangan">
        <p className="mb-2">(Aset Lancar + Investasi) - (Kewajiban) × 2.5%</p>
        <ul className="space-y-1 text-xs">
          <li>• Aset tetap (gedung, kendaraan operasional) TIDAK termasuk</li>
          <li>• Yang dihitung adalah barang untuk diperjual-belikan</li>
        </ul>
      </InfoBox>

      {/* Calculate Button */}
      <Button
        onClick={handleCalculate}
        className="w-full"
        size="lg"
        leftIcon={<Calculator className="w-5 h-5" />}
      >
        Hitung Zakat Perdagangan
      </Button>

      {/* Result */}
      {result && (
        <ZakatResult
          isWajib={result.isWajibZakat}
          jumlahZakat={result.jumlahZakat}
          breakdown={[
            { label: 'Total Aset', value: result.totalAset },
            { label: 'Total Kewajiban', value: -result.totalKewajiban },
            { label: 'Aset Bersih', value: result.asetBersih },
            { label: 'Nisab (85 gram emas)', value: result.nisab },
            { label: 'Zakat 2.5%', value: result.jumlahZakat },
          ]}
          gapKeNisab={result.isWajibZakat ? undefined : result.nisab - result.asetBersih}
          nisab={result.nisab}
          zakatType="Zakat Perdagangan"
          onShare={handleShare}
        />
      )}
    </div>
  );
}
