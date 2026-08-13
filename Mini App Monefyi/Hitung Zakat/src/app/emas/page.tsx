import { Gem } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmasCalculator } from '@/components/calculators/EmasCalculator';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { getDalilByType } from '@/data/dalil';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kalkulator Zakat Emas & Perak 2026 | Monefyi',
  description: 'Hitung zakat emas dan perak dengan mudah. Nisab emas 85 gram, perak 595 gram. Zakat 2.5%. Sesuai fatwa MUI.',
};

export default function ZakatEmasPage() {
  const dalil = getDalilByType('emas');
  const hadits = 'hadits' in dalil && dalil.hadits && !Array.isArray(dalil.hadits) ? dalil.hadits : undefined;

  return (
    <>
      <PageHeader
        title="Zakat Emas & Perak"
        description="Zakat emas batangan dan perhiasan yang disimpan"
        icon={<Gem className="w-8 h-8 text-white" />}
      />

      <Container size="md" className="py-12">
        <EmasCalculator />

        {/* Dalil Section */}
        <section className="mt-12 space-y-6">
          <h2 className="text-xl font-bold text-white">Dalil & Ketentuan</h2>
          
          {hadits && (
            <DalilQuote type="hadits" hadits={hadits} />
          )}

          <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Ketentuan Zakat Emas & Perak</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Nisab emas: 85 gram (20 dinar)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Nisab perak: 595 gram (200 dirham)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Kadar zakat: 2.5% dari nilai total</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Haul: sudah dimiliki selama 1 tahun</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>Perhiasan yang dipakai sehari-hari tidak wajib dizakati</span>
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
