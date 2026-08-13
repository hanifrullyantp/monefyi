import { Moon } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { FitrahCalculator } from '@/components/calculators/FitrahCalculator';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { getDalilByType } from '@/data/dalil';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kalkulator Zakat Fitrah 1447 H / 2026 - BAZNAS Update | Monefyi',
  description: 'Hitung zakat fitrah keluarga dengan mudah. 2.5 kg beras atau setara per jiwa. Dibayar sebelum Idul Fitri.',
};

export default function ZakatFitrahPage() {
  const dalil = getDalilByType('fitrah');
  const hadits = 'hadits' in dalil && dalil.hadits && !Array.isArray(dalil.hadits) ? dalil.hadits : undefined;

  return (
    <>
      <PageHeader
        title="Zakat Fitrah"
        description="Zakat wajib di bulan Ramadhan untuk setiap muslim"
        icon={<Moon className="w-8 h-8 text-white" />}
        showNisab={false}
      />

      <Container size="md" className="py-12">
        <FitrahCalculator />

        {/* Dalil Section */}
        <section className="mt-12 space-y-6">
          <h2 className="text-xl font-bold text-white">Dalil & Ketentuan</h2>
          
          {hadits && (
            <DalilQuote type="hadits" hadits={hadits} />
          )}

          <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Ketentuan Zakat Fitrah</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Wajib bagi setiap muslim (bayi, anak, dewasa)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Besaran: 1 sha (2.5 kg beras) per jiwa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Bisa diganti dengan uang senilai beras</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>Waktu: sebelum sholat Idul Fitri</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Kepala keluarga membayar untuk semua tanggungan</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-amber-950/30 to-amber-900/20 border border-amber-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Waktu Pembayaran</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span><strong>Wajib:</strong> Sebelum sholat Idul Fitri</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span><strong>Sunnah:</strong> Di awal Ramadhan agar bisa segera disalurkan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span><strong>Makruh:</strong> Setelah sholat Idul Fitri (menjadi sedekah biasa)</span>
              </li>
            </ul>
          </div>
        </section>

        <ZakatChannels />
        <MonefyiCTA />
      </Container>
    </>
  );
}
