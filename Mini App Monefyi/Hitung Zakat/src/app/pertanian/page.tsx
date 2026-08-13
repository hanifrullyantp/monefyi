import { Wheat } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { PertanianCalculator } from '@/components/calculators/PertanianCalculator';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { getDalilByType } from '@/data/dalil';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kalkulator Zakat Pertanian 2026 - Hitung Zakat Hasil Panen | Monefyi',
  description: 'Hitung zakat pertanian dengan mudah. Zakat 5-10% dari hasil panen. Nisab 653 kg. Sesuai fatwa MUI.',
};

export default function ZakatPertanianPage() {
  const dalil = getDalilByType('pertanian');
  const quran = 'quran' in dalil && dalil.quran ? dalil.quran : undefined;
  const hadits = 'hadits' in dalil && dalil.hadits && !Array.isArray(dalil.hadits) ? dalil.hadits : undefined;

  return (
    <>
      <PageHeader
        title="Zakat Pertanian"
        description="Zakat hasil panen tanaman dan buah-buahan"
        icon={<Wheat className="w-8 h-8 text-white" />}
        showNisab={false}
      />

      <Container size="md" className="py-12">
        <PertanianCalculator />

        {/* Dalil Section */}
        <section className="mt-12 space-y-6">
          <h2 className="text-xl font-bold text-white">Dalil & Ketentuan</h2>
          
          {quran && (
            <DalilQuote type="quran" quran={quran} />
          )}
          
          {hadits && (
            <DalilQuote type="hadits" hadits={hadits} />
          )}

          <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Ketentuan Zakat Pertanian</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Nisab: 5 wasaq = 653 kg gabah</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Air hujan/sungai: 10% (usyur)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Air irigasi/pompa: 5% (nisf usyur)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Kombinasi: 7.5%</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>Dikeluarkan setiap panen (tidak perlu haul 1 tahun)</span>
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
