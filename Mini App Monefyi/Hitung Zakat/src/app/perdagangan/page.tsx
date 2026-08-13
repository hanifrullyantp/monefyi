import { Building2 } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { PerdaganganCalculator } from '@/components/calculators/PerdaganganCalculator';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { getDalilByType } from '@/data/dalil';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kalkulator Zakat Perdagangan 2026 - Hitung Zakat Bisnis | Monefyi',
  description: 'Hitung zakat perdagangan/bisnis dengan mudah. Zakat 2.5% dari aset bersih bisnis. Sesuai fatwa MUI.',
};

export default function ZakatPerdaganganPage() {
  const dalil = getDalilByType('perdagangan');
  const hadits = 'hadits' in dalil && dalil.hadits && !Array.isArray(dalil.hadits) ? dalil.hadits : undefined;

  return (
    <>
      <PageHeader
        title="Zakat Perdagangan"
        description="Zakat dari aset bisnis dan usaha perdagangan"
        icon={<Building2 className="w-8 h-8 text-white" />}
      />

      <Container size="md" className="py-12">
        <PerdaganganCalculator />

        {/* Dalil Section */}
        <section className="mt-12 space-y-6">
          <h2 className="text-xl font-bold text-white">Dalil & Ketentuan</h2>
          
          {hadits && (
            <DalilQuote type="hadits" hadits={hadits} />
          )}

          <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Ketentuan Zakat Perdagangan</h3>
            <ul className="space-y-2 text-sm text-green-100/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Nisab: setara 85 gram emas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Kadar zakat: 2.5% dari aset bersih</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Haul: 1 tahun sejak bisnis berjalan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Dihitung di akhir tahun buku</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>Aset tetap (gedung, kendaraan operasional) tidak termasuk</span>
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
