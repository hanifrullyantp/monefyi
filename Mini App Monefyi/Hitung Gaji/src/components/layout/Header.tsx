'use client'

import React from 'react'
import { Calculator, ExternalLink } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b-2 border-slate-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-green">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Kalkulator Cicilan</h1>
              <p className="text-xs text-slate-400">Hitung angsuran dengan akurat</p>
            </div>
          </div>
          
          <a
            href="https://monefyi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-green-600 rounded-xl transition-all group"
          >
            <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
              by <span className="font-bold text-green-400 group-hover:text-green-300">Monefyi</span>
            </span>
            <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-green-400 transition-colors" />
          </a>
        </div>
      </div>
    </header>
  )
}
