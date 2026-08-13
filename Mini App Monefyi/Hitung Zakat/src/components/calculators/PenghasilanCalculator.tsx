'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RupiahInput } from '@/components/ui/RupiahInput';
import { Toggle } from '@/components/ui/Toggle';
import { InfoBox } from '@/components/ui/InfoBox';
import { ZakatResult } from '@/components/shared/ZakatResult';
import { calculateZakatPenghasilan } from '@/lib/calculators';
import { Calculator } from 'lucide-react';
import type { PenghasilanInput, PenghasilanResult } from '@/types/zakat';

export function PenghasilanCalculator() {
  const [periode, setPeriode] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [metode, setMetode] = useState<'bruto' | 'netto'>('bruto');
  const [penghasilan, setPenghasilan] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [kebutuhan, setKebutuhan] = useState(0);
  const [cicilan, setCicilan] = useState(0);
  const [result, setResult] = useState<PenghasilanResult | null>(null);

  const handleCalculate = () => {
    const penghasilanBulanan = periode === 'bulanan' ? penghasilan : penghasilan / 12;
    
    const input: PenghasilanInput = {
      penghasilanBulanan,
      bonusTahunan: bonus,
      kebutuhanBulanan: kebutuhan,
      cicilanBulanan: cicilan,
      metode,
    };

    const calculatedResult = calculateZakatPenghasilan(input);
    setResult(calculatedResult);
  };

  const handleShare = () => {
    if (!result) return;
    
    const text = `🌙 Hasil Perhitungan Zakat Penghasilan Saya

Total: Rp ${result.jumlahZakatTahunan.toLocaleString('id-ID')}/tahun
(Rp ${result.jumlahZakatBulanan.toLocaleString('id-ID')}/bulan)

Hitung zakatmu juga di:
https://zakat.monefyi.com

#ZakatMonefyi #KalkulatorZakat`;

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <div className="space-y-6">
          {/* Periode Toggle */}
          <div>
            <label className="block text-sm font-medium text-green-100 mb-3">
              Periode Perhitungan
            </label>
            <Toggle
              options={[
                { value: 'bulanan', label: 'Per Bulan' },
                { value: 'tahunan', label: 'Per Tahun' },
              ]}
              value={periode}
              onChange={(v) => setPeriode(v as 'bulanan' | 'tahunan')}
            />
          </div>

          {/* Penghasilan */}
          <RupiahInput
            label={`Penghasilan ${periode === 'bulanan' ? 'per bulan' : 'per tahun'}`}
            value={penghasilan}
            onChange={setPenghasilan}
            hint="Total gaji/honor sebelum pajak"
          />

          {/* Bonus */}
          <RupiahInput
            label="Bonus/THR (opsional)"
            value={bonus}
            onChange={setBonus}
            hint="Total bonus tahunan termasuk THR"
          />

          {/* Metode Toggle */}
          <div>
            <label className="block text-sm font-medium text-green-100 mb-3">
              Metode Perhitungan
            </label>
            <Toggle
              options={[
                { value: 'bruto', label: 'Dari Bruto' },
                { value: 'netto', label: 'Dari Netto' },
              ]}
              value={metode}
              onChange={(v) => setMetode(v as 'bruto' | 'netto')}
            />
            <p className="mt-2 text-xs text-green-100/50">
              {metode === 'bruto'
                ? 'Zakat dihitung dari total penghasilan (lebih aman)'
                : 'Zakat dihitung setelah dikurangi kebutuhan pokok'}
            </p>
          </div>

          {/* Pengurang (if netto) */}
          {metode === 'netto' && (
            <>
              <RupiahInput
                label="Kebutuhan pokok per bulan"
                value={kebutuhan}
                onChange={setKebutuhan}
                hint="Makan, tempat tinggal, pendidikan anak, dll"
              />
              <RupiahInput
                label="Cicilan/utang wajib per bulan"
                value={cicilan}
                onChange={setCicilan}
                hint="KPR, cicilan kendaraan, dll"
              />
            </>
          )}

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            className="w-full"
            size="lg"
            leftIcon={<Calculator className="w-5 h-5" />}
          >
            Hitung Zakat Saya
          </Button>
        </div>
      </Card>

      {/* Info Box */}
      <InfoBox title="Perbedaan Bruto vs Netto">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Bruto:</strong> Dari total penghasilan, lebih aman dan dianjurkan mayoritas ulama</li>
          <li><strong>Netto:</strong> Setelah dikurangi kebutuhan pokok, sesuai pendapat sebagian ulama</li>
        </ul>
      </InfoBox>

      {/* Result */}
      {result && (
        <ZakatResult
          isWajib={result.isWajibZakat}
          jumlahZakat={result.jumlahZakatTahunan}
          jumlahZakatBulanan={result.jumlahZakatBulanan}
          breakdown={result.breakdown}
          gapKeNisab={result.gapKeNisab}
          nisab={result.nisabTahunan}
          zakatType="Zakat Penghasilan"
          onShare={handleShare}
        />
      )}
    </div>
  );
}
