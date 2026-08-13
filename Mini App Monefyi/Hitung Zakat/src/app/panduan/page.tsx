import { BookOpen, Users, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Card } from '@/components/ui/Card';
import { DalilQuote } from '@/components/shared/DalilQuote';
import { ZakatChannels } from '@/components/shared/ZakatChannels';
import { MonefyiCTA } from '@/components/shared/MonefyiCTA';
import { getGeneralDalil } from '@/data/dalil';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panduan Zakat Lengkap 2026 - Hukum, Syarat, Nisab | Monefyi',
  description: 'Panduan lengkap tentang zakat: hukum, syarat wajib, nisab, 8 golongan penerima, jenis-jenis zakat. Sesuai fatwa MUI.',
};

const syaratWajib = [
  'Muslim',
  'Merdeka (bukan budak)',
  'Baligh dan berakal',
  'Harta milik penuh (bukan pinjaman)',
  'Mencapai nisab (batas minimum)',
  'Berlalu haul (1 tahun kepemilikan)',
];

const asnaf = [
  {
    name: 'Fakir',
    description: 'Orang yang tidak memiliki harta dan tidak mampu bekerja',
  },
  {
    name: 'Miskin',
    description: 'Orang yang memiliki harta tapi tidak mencukupi kebutuhan',
  },
  {
    name: 'Amil',
    description: 'Pengelola/pengumpul zakat yang ditunjuk',
  },
  {
    name: 'Mualaf',
    description: 'Orang yang baru masuk Islam dan membutuhkan penguatan iman',
  },
  {
    name: 'Riqab',
    description: 'Budak yang ingin memerdekakan diri',
  },
  {
    name: 'Gharim',
    description: 'Orang yang terlilit utang untuk kebutuhan halal',
  },
  {
    name: 'Fisabilillah',
    description: 'Orang yang berjuang di jalan Allah',
  },
  {
    name: 'Ibnu Sabil',
    description: 'Musafir yang kehabisan bekal dalam perjalanan',
  },
];

const jenisZakat = [
  {
    name: 'Zakat Fitrah',
    description: 'Wajib dibayar setiap muslim di bulan Ramadhan',
    nisab: '2.5 kg beras per jiwa',
    haul: 'Sebelum sholat Idul Fitri',
  },
  {
    name: 'Zakat Maal',
    description: 'Zakat harta simpanan (uang, emas, perak)',
    nisab: '85 gram emas',
    haul: '1 tahun',
  },
  {
    name: 'Zakat Penghasilan',
    description: 'Zakat dari gaji dan penghasilan profesi',
    nisab: '85 gram emas per tahun',
    haul: '1 tahun (bisa bulanan)',
  },
  {
    name: 'Zakat Perdagangan',
    description: 'Zakat dari aset bisnis',
    nisab: '85 gram emas',
    haul: '1 tahun',
  },
  {
    name: 'Zakat Pertanian',
    description: 'Zakat hasil panen',
    nisab: '653 kg gabah',
    haul: 'Setiap panen',
  },
  {
    name: 'Zakat Emas & Perak',
    description: 'Zakat logam mulia',
    nisab: '85g emas / 595g perak',
    haul: '1 tahun',
  },
  {
    name: 'Zakat Investasi',
    description: 'Zakat saham, reksadana syariah',
    nisab: '85 gram emas',
    haul: '1 tahun',
  },
];

export default function PanduanPage() {
  const generalDalil = getGeneralDalil();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-950 to-slate-950 border-b border-green-500/10">
        <Container className="py-12 md:py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Panduan Zakat Lengkap
              </h1>
              <p className="text-green-100/70 text-lg">
                Semua yang perlu kamu ketahui tentang zakat
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container size="md" className="py-12">
        {/* Table of Contents */}
        <Card className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Daftar Isi</h2>
          <nav className="space-y-2">
            {[
              'Apa Itu Zakat?',
              'Dalil Kewajiban Zakat',
              'Syarat Wajib Zakat',
              '8 Golongan Penerima Zakat',
              'Jenis-Jenis Zakat',
              'Waktu Membayar Zakat',
              'Kesalahan Umum',
            ].map((item, index) => (
              <a
                key={item}
                href={`#section-${index + 1}`}
                className="block text-green-400 hover:text-green-300 transition-colors"
              >
                {index + 1}. {item}
              </a>
            ))}
          </nav>
        </Card>

        {/* Section 1: Apa Itu Zakat */}
        <section id="section-1" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">1. Apa Itu Zakat?</h2>
          <Card>
            <p className="text-green-100/80 leading-relaxed mb-4">
              <strong className="text-white">Zakat</strong> secara bahasa berarti{' '}
              <em>tumbuh, berkembang, suci, dan berkah</em>. Secara istilah syariat,
              zakat adalah harta tertentu yang wajib dikeluarkan oleh setiap muslim
              yang memenuhi syarat kepada golongan yang berhak menerimanya.
            </p>
            <p className="text-green-100/80 leading-relaxed mb-4">
              Zakat merupakan <strong className="text-white">rukun Islam ke-3</strong>{' '}
              setelah syahadat dan sholat. Hukumnya <strong className="text-amber-400">wajib</strong>{' '}
              bagi setiap muslim yang memenuhi syarat.
            </p>
            <p className="text-green-100/80 leading-relaxed">
              Hikmah zakat antara lain: membersihkan harta dan jiwa, membantu sesama,
              mengurangi kesenjangan sosial, dan mendapat keberkahan dari Allah SWT.
            </p>
          </Card>
        </section>

        {/* Section 2: Dalil */}
        <section id="section-2" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">2. Dalil Kewajiban Zakat</h2>
          <div className="space-y-6">
            <DalilQuote type="quran" quran={generalDalil.quran} />
            <DalilQuote type="hadits" hadits={generalDalil.hadits[0]} />
          </div>
        </section>

        {/* Section 3: Syarat Wajib */}
        <section id="section-3" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">3. Syarat Wajib Zakat</h2>
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {syaratWajib.map((syarat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-green-100/80">{syarat}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Section 4: 8 Asnaf */}
        <section id="section-4" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">
            4. 8 Golongan Penerima Zakat (Mustahik)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {asnaf.map((item, index) => (
              <Card key={item.name} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <p className="text-sm text-green-100/60">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 5: Jenis Zakat */}
        <section id="section-5" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">5. Jenis-Jenis Zakat</h2>
          <div className="space-y-4">
            {jenisZakat.map((jenis) => (
              <Card key={jenis.name} className="p-5">
                <h3 className="font-semibold text-white mb-2">{jenis.name}</h3>
                <p className="text-sm text-green-100/70 mb-3">{jenis.description}</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full">
                    Nisab: {jenis.nisab}
                  </span>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full">
                    Haul: {jenis.haul}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 6: Waktu */}
        <section id="section-6" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">6. Waktu Membayar Zakat</h2>
          <Card>
            <div className="flex items-start gap-4">
              <Calendar className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div className="space-y-4 text-green-100/80">
                <div>
                  <h3 className="font-semibold text-white mb-1">Zakat Maal</h3>
                  <p>Dibayar saat harta mencapai nisab dan sudah berlalu 1 tahun (haul)</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Zakat Fitrah</h3>
                  <p>Wajib dibayar sebelum sholat Idul Fitri. Sunnah dibayar di awal Ramadhan.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Zakat Pertanian</h3>
                  <p>Dibayar setiap panen (tidak perlu menunggu haul)</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-xl">
                  <p className="text-sm">
                    <strong className="text-white">Tips:</strong> Banyak ulama menganjurkan
                    membayar zakat di bulan Ramadhan karena pahalanya berlipat ganda.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Section 7: Kesalahan Umum */}
        <section id="section-7" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">7. Kesalahan Umum</h2>
          <Card>
            <div className="space-y-4">
              {[
                'Menunda pembayaran zakat padahal sudah wajib',
                'Tidak menghitung harta secara lengkap',
                'Memberikan zakat kepada orang yang bukan mustahik',
                'Menganggap infaq/sedekah sudah menggugurkan kewajiban zakat',
                'Tidak memperbarui perhitungan sesuai harga emas terbaru',
              ].map((kesalahan, index) => (
                <div key={index} className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-green-100/80">{kesalahan}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <ZakatChannels />
        <MonefyiCTA />
      </Container>
    </>
  );
}
