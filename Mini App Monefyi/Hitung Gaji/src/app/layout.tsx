import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kalkulator Cicilan - Hitung Angsuran KPR, KKB, KTA & Kredit Barang | Monefyi',
  description: 'Kalkulator cicilan lengkap dengan jadwal amortisasi, komparator bunga, dan peringatan riba. Lihat berapa banyak uang yang hilang saat berhutang. By Monefyi - Platform edukasi keuangan syariah.',
  keywords: 'kalkulator cicilan, kalkulator KPR, kalkulator kredit, amortisasi, bunga anuitas, bunga flat, riba, monefyi, keuangan syariah',
  authors: [{ name: 'Monefyi', url: 'https://monefyi.com' }],
  creator: 'Monefyi',
  publisher: 'Monefyi',
  openGraph: {
    title: 'Kalkulator Cicilan - Sadar Berapa Uang yang Hilang | Monefyi',
    description: 'Lihat berapa banyak uang yang hilang ke bunga kredit. Alternatif: nabung dulu, beli cash!',
    url: 'https://monefyi.com',
    siteName: 'Kalkulator Cicilan by Monefyi',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
