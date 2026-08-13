import { Coins } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { MaalCalculator } from '@/components/calculators/MaalCalculator';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { getDalilByType } from '@/data/dalil';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kalkulator Zakat Maal 2026 - Hitung Zakat Harta | Monefyi',
  description: 'Hitung zakat maal (harta) dengan mudah. Termasuk tabungan, emas, investasi. Nisab 85 gram emas. Sesuai fatwa MUI.',
};

export default function ZakatMaalPage() {
  const dalil = getDalilByType('maal');

  return (
    <>
      <PageHeader
        title="Zakat Maal"
        description="Zakat harta simpanan, emas, investasi, dan aset lainnya"
        icon={<Coins className="w-8 h-8 text-white" />}
      />

      <Container size="md" className="py-12">
        <MaalCalculator />

        {/* Dalil Section */}
        <section className="mt-12 space-y-6">
          <h2 className="text-xl font-bold text-white">Dalil & Ketentuan</h2>
          
          {'quran' in dalil && dalil.quran && (
            <DalilQuote type="quran" quran={dalil.quran} />
          )}

          <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Ketentuan Zakat Maal</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Nisab: setara 85 gram emas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Kadar zakat: 2.5% dari total harta</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Haul: harta sudah dimiliki selama 1 tahun</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Utang jangka pendek dapat mengurangi harta yang dizakati</span>
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
