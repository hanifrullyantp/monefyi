'use client'

import React from 'react'
import { AlertCircle, ExternalLink, Heart } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t-2 border-slate-800 bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          {/* Disclaimer */}
          <div className="max-w-3xl">
            <div className="flex items-center justify-center gap-2 text-amber-500 mb-3">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">Disclaimer</p>
            </div>
            <p className="text-sm text-slate-400">
              Hasil kalkulasi bersifat estimasi dan dapat berbeda dengan perhitungan aktual dari lembaga keuangan. 
              Selalu konfirmasi detail cicilan, bunga efektif, dan biaya-biaya lainnya langsung dengan bank atau leasing sebelum mengambil keputusan kredit.
            </p>
          </div>

          {/* Branding */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-sm">Dibuat dengan</span>
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              <span className="text-sm">oleh</span>
            </div>
            <a
              href="https://monefyi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-green hover:shadow-green-glow rounded-xl transition-all"
            >
              <span className="text-lg font-bold text-white">Monefyi</span>
              <ExternalLink className="h-4 w-4 text-white/80 group-hover:text-white transition-colors" />
            </a>
            <p className="text-xs text-slate-500">
              Platform edukasi keuangan dan kalkulator finansial
            </p>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t border-slate-800 w-full max-w-2xl">
            <p className="text-xs text-slate-500">
              © {currentYear} Kalkulator Cicilan by Monefyi. Semua kalkulasi dilakukan di browser Anda.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
