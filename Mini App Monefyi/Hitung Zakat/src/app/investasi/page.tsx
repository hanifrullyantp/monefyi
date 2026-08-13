import { TrendingUp } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { InvestasiCalculator } from '@/components/calculators/InvestasiCalculator';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { getDalilByType } from '@/data/dalil';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kalkulator Zakat Investasi 2026 - Saham, Reksadana, Sukuk | Monefyi',
  description: 'Hitung zakat investasi saham syariah, reksadana, sukuk dengan mudah. Zakat 2.5% dari nilai investasi. Sesuai fatwa MUI.',
};

export default function ZakatInvestasiPage() {
  const dalil = getDalilByType('investasi');
  const quran = 'quran' in dalil && dalil.quran ? dalil.quran : undefined;

  return (
    <>
      <PageHeader
        title="Zakat Investasi"
        description="Zakat saham, reksadana, sukuk, dan instrumen investasi syariah"
        icon={<TrendingUp className="w-8 h-8 text-white" />}
      />

      <Container size="md" className="py-12">
        <InvestasiCalculator />

        {/* Dalil Section */}
        <section className="mt-12 space-y-6">
          <h2 className="text-xl font-bold text-white">Dalil & Ketentuan</h2>
          
          {quran && (
            <DalilQuote type="quran" quran={quran} />
          )}

          <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Ketentuan Zakat Investasi</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Nisab: setara 85 gram emas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Kadar zakat: 2.5% dari nilai investasi</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Haul: sudah dimiliki 1 tahun</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Yang dihitung: nilai saat ini (bukan harga beli)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>Prioritaskan investasi syariah sesuai ajaran Islam</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Instrumen Investasi Syariah</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span><strong>Saham Syariah:</strong> Terdaftar di ISSI (Indeks Saham Syariah Indonesia)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span><strong>Reksadana Syariah:</strong> Dikelola sesuai prinsip syariah</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span><strong>Sukuk:</strong> Obligasi syariah negara atau korporasi</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span><strong>Emas Digital:</strong> Investasi emas online</span>
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
