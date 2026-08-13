'use client';

import { Hero } from '@/components/home/Hero';
import { NisabTracker } from '@/components/home/NisabTracker';
import { ZakatMenu } from '@/components/home/ZakatMenu';
import { FAQ } from '@/components/home/FAQ';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { Container } from '@/components/layout/Container';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { getGeneralDalil } from '@/data/dalil';

export default function HomePage() {
  const generalDalil = getGeneralDalil();

  return (
    <>
      <Hero />
      <NisabTracker />
      <ZakatMenu />
      
      {/* Dalil Section */}
      <section className="py-12 bg-gradient-to-b from-slate-950 to-green-950/30">
        <Container size="md">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Dalil Kewajiban Zakat
            </h2>
            <p className="text-green-100/70">
              Zakat adalah rukun Islam ke-3 yang wajib ditunaikan
            </p>
          </div>
          <DalilQuote type="quran" quran={generalDalil.quran} />
        </Container>
      </section>

      <Container>
        <ZakatChannels />
      </Container>
      
      <FAQ />
      
      <Container>
        <MonefyiCTA />
      </Container>
    </>
  );
}
