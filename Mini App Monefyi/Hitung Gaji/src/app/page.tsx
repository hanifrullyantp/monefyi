'use client'

import React, { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { TabGroup, Tab } from '@/components/ui/TabGroup'
import { ToastContainer } from '@/components/ui/Toast'
import { KPRCalculator } from '@/components/calculator/KPRCalculator'
import { KKBCalculator } from '@/components/calculator/KKBCalculator'
import { KTACalculator } from '@/components/calculator/KTACalculator'
import { KreditBarangCalculator } from '@/components/calculator/KreditBarangCalculator'
import { KomparatorCicilan } from '@/components/calculator/KomparatorCicilan'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useToast } from '@/hooks/useToast'
import { Home, Car, Wallet, ShoppingBag, GitCompare, CheckCircle, TrendingUp, Shield, AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TabId } from '@/types'

const tabs: Tab[] = [
  { id: 'kpr', label: 'KPR', icon: <Home className="h-4 w-4" /> },
  { id: 'kkb', label: 'Kredit Kendaraan', icon: <Car className="h-4 w-4" /> },
  { id: 'kta', label: 'KTA', icon: <Wallet className="h-4 w-4" /> },
  { id: 'barang', label: 'Kredit Barang', icon: <ShoppingBag className="h-4 w-4" /> },
  { id: 'komparator', label: 'Komparator', icon: <GitCompare className="h-4 w-4" /> },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useLocalStorage<TabId>('cicilan_active_tab', 'kpr')
  const { toasts, dismissToast } = useToast()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-hero border-b-2 border-green-900">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-4"
            >
              <span className="text-sm text-slate-400">Dipersembahkan oleh</span>
              <a 
                href="https://monefyi.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-bold text-green-400 hover:text-green-300 transition-colors"
              >
                Monefyi
              </a>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4"
            >
              Kalkulator Cicilan
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-300 mb-8"
            >
              Hitung cicilan, total bunga, dan jadwal angsuran untuk semua jenis pinjaman
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white">3 Metode Bunga</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white">Jadwal Angsuran</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white">Affordability Check</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <GitCompare className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white">Komparator</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 bg-slate-950">
        <div className="container mx-auto px-4 py-8">
          {/* Tab Navigation */}
          <div className="mb-8">
            <TabGroup
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as TabId)}
            />
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'kpr' && <KPRCalculator />}
              {activeTab === 'kkb' && <KKBCalculator />}
              {activeTab === 'kta' && <KTACalculator />}
              {activeTab === 'barang' && <KreditBarangCalculator />}
              {activeTab === 'komparator' && <KomparatorCicilan />}
            </motion.div>
          </AnimatePresence>

          {/* Riba Warning Section */}
          <section className="mt-16 max-w-4xl mx-auto">
            <div className="p-8 bg-gradient-to-br from-red-950/60 via-slate-900 to-amber-950/40 rounded-3xl border-2 border-red-800/50 shadow-2xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-red-900/50 rounded-xl flex items-center justify-center border-2 border-red-700">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-400 mb-2">Tujuan Aplikasi Ini: Membuka Mata Anda</h2>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Kalkulator ini <span className="font-bold text-white">BUKAN</span> untuk mendorong Anda berhutang. 
                    Sebaliknya, ini adalah alat untuk <span className="font-bold text-amber-400">menyadarkan</span> berapa banyak uang yang hilang ketika Anda memilih cicilan berbunga.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-5 bg-slate-900/80 rounded-xl border border-red-700">
                  <h3 className="text-lg font-bold text-red-400 mb-3">❌ Fakta Menyakitkan</h3>
                  <ul className="space-y-2.5 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 flex-shrink-0">•</span>
                      <span>Bunga kredit = <span className="font-bold text-red-300">uang Anda yang hilang</span> tanpa mendapat manfaat apapun</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 flex-shrink-0">•</span>
                      <span>Dalam Islam, riba adalah <span className="font-bold text-amber-400">dosa besar</span> yang diharamkan secara tegas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 flex-shrink-0">•</span>
                      <span>Tidak ada "bunga kecil" atau "bunga halal" - <span className="font-bold text-white">semua riba haram</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 flex-shrink-0">•</span>
                      <span>Hutang membuat Anda <span className="font-bold text-red-300">terjebak</span> dalam lingkaran pembayaran yang tidak berkesudahan</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 bg-green-950/30 rounded-xl border border-green-700">
                  <h3 className="text-lg font-bold text-green-400 mb-3">✓ Alternatif Bijak</h3>
                  <ul className="space-y-2.5 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 flex-shrink-0">•</span>
                      <span><span className="font-bold text-green-300">Nabung dulu</span>, beli cash - hemat uang, tenang hati</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 flex-shrink-0">•</span>
                      <span>Kalau butuh mendesak: pinjam dari keluarga <span className="font-bold text-white">tanpa bunga</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 flex-shrink-0">•</span>
                      <span>Gunakan <span className="font-bold text-green-300">pembiayaan syariah</span> (murabahah, ijarah) yang transparan</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 flex-shrink-0">•</span>
                      <span>Turunkan gaya hidup sementara, <span className="font-bold text-white">prioritaskan kebutuhan</span> vs keinginan</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-slate-900/90 rounded-xl border border-amber-700">
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="font-bold text-amber-400">Pesan untuk Anda:</span> Gunakan kalkulator ini untuk <span className="font-bold text-white">menghitung kerugian</span> jika Anda mengambil kredit, 
                  bukan untuk <span className="line-through text-slate-500">merencanakan cicilan</span>. 
                  Lihat angka bunga yang muncul, dan tanyakan pada diri sendiri: 
                  <span className="block mt-2 text-base font-semibold text-red-400 italic">
                    "Apakah saya rela uang sebesar ini hilang begitu saja hanya untuk 'kemudahan' cicilan?"
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Tips Section */}
          <section className="mt-12 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Panduan Finansial Sehat</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700">
                <h3 className="text-lg font-semibold text-green-400 mb-3">
                  Pahami Metode Bunga
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span><strong>Anuitas:</strong> Cicilan tetap tiap bulan, paling umum untuk KPR</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span><strong>Flat:</strong> Bunga dihitung dari pokok awal, umum untuk kredit kendaraan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span><strong>Efektif:</strong> Bunga dari sisa pokok, cicilan menurun tiap bulan</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700">
                <h3 className="text-lg font-semibold text-amber-400 mb-3">
                  Debt Service Ratio (DSR)
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>Cicilan ideal maksimal <strong>30%</strong> dari penghasilan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>Di atas 40% masuk zona berbahaya</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>Hitung semua cicilan yang ada (KPR, mobil, kartu kredit)</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">
                  Pelunasan Dipercepat
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Bayar ekstra di tahun-tahun awal untuk hemat bunga maksimal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Cek denda pelunasan dipercepat (biasanya 2-5%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Simulasikan dengan fitur "Pelunasan Dipercepat" di atas</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700">
                <h3 className="text-lg font-semibold text-red-400 mb-3">
                  Waspadai Biaya Tersembunyi
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Provisi, admin, notaris, appraisal (KPR bisa 3-5%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Asuransi jiwa dan kebakaran (wajib untuk KPR)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Promo "0% bunga" sering ada kenaikan harga atau biaya admin tinggi</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
