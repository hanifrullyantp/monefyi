import { Briefcase } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { PenghasilanCalculator } from '@/components/calculators/PenghasilanCalculator';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { getDalilByType } from '@/data/dalil';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kalkulator Zakat Penghasilan 2026 - Hitung Zakat Gaji | Monefyi',
  description: 'Hitung zakat penghasilan/profesi dengan mudah. Zakat 2.5% dari gaji, honor, atau penghasilan lainnya. Sesuai fatwa MUI.',
};

export default function ZakatPenghasilanPage() {
  const dalil = getDalilByType('penghasilan');

  return (
    <>
      <PageHeader
        title="Zakat Penghasilan"
        description="Zakat dari gaji, honor, atau penghasilan profesi lainnya"
        icon={<Briefcase className="w-8 h-8 text-white" />}
      />

      <Container size="md" className="py-12">
        <PenghasilanCalculator />

        {/* Dalil Section */}
        <section className="mt-12 space-y-6">
          <h2 className="text-xl font-bold text-white">Dalil & Ketentuan</h2>
          
          {'quran' in dalil && dalil.quran && (
            <DalilQuote type="quran" quran={dalil.quran} />
          )}

          <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Ketentuan Zakat Penghasilan</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Nisab: setara 85 gram emas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Kadar zakat: 2.5% dari penghasilan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Haul: 1 tahun (bisa dibayar per bulan)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Dasar: Fatwa MUI No. 3 Tahun 2003</span>
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
