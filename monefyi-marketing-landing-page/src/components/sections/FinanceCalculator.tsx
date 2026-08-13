import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Calendar, Receipt, Wallet, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { AppInputCurrency } from '../bonus-apps/shared/AppInputCurrency';
import { AppInputNumber } from '../bonus-apps/shared/AppInputNumber';
import { Button } from '../ui/Button';
import { checkFinanceCondition, FinanceCheckResult } from '../../lib/calculator-utils';
import { formatRupiah } from '../../lib/formatters';
import { cn } from '../../lib/cn';

export function FinanceCalculator() {
  const [pemasukan, setPemasukan] = useState(5000000);
  const [tglGajian, setTglGajian] = useState(25);
  const [tagihan, setTagihan] = useState(1500000);
  const [belanjaHarian, setBelanjaHarian] = useState(100000);
  const [result, setResult] = useState<FinanceCheckResult | null>(null);

  const handleCheck = () => {
    const res = checkFinanceCondition(pemasukan, tglGajian, tagihan, belanjaHarian);
    setResult(res);
  };

  return (
    <SectionWrapper id="calculator" background="default">
      <SectionHeader
        eyebrow="GRATIS, 30 DETIK"
        title="Cek Kondisi"
        highlight="Keuanganmu"
        subtitle="Masukkan data perkiraanmu dan lihat apakah kamu akan tekor bulan ini."
      />

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Form Card */}
        <div className="glass rounded-[2.5rem] p-8 border-green-500/20">
          <div className="space-y-6">
            <AppInputCurrency label="Pemasukan Bulanan" value={pemasukan} onChange={setPemasukan} />
            <AppInputNumber label="Tanggal Gajian" value={tglGajian} onChange={setTglGajian} min={1} max={31} suffix="Tgl" />
            <AppInputCurrency label="Total Tagihan Tetap" value={tagihan} onChange={setTagihan} />
            <AppInputCurrency label="Rata-rata Belanja Harian" value={belanjaHarian} onChange={setBelanjaHarian} />
            
            <Button fullWidth size="lg" onClick={handleCheck} className="mt-4">
              Cek Kondisi Saya
            </Button>
          </div>
        </div>

        {/* Result Card */}
        <div className="h-full">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/30"
              >
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6 text-slate-600">
                  <TrendingUp size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-400 mb-2">Hasil Analisis</h4>
                <p className="text-slate-500 text-sm">Isi data di samping untuk melihat kondisi keuanganmu.</p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "h-full rounded-[2.5rem] p-8 border flex flex-col items-center text-center",
                  result.status === 'safe' ? 'bg-green-950/40 border-green-500/30' : 
                  result.status === 'warning' ? 'bg-amber-950/40 border-amber-500/30' : 
                  'bg-red-950/40 border-red-500/30'
                )}
              >
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mb-6",
                  result.status === 'safe' ? 'bg-green-500/20 text-green-400' : 
                  result.status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 
                  'bg-red-500/20 text-red-400'
                )}>
                  {result.status === 'safe' ? <CheckCircle2 size={40} /> : 
                   result.status === 'warning' ? <AlertTriangle size={40} /> : 
                   <AlertCircle size={40} />}
                </div>

                <h4 className={cn(
                  "text-2xl font-black mb-2",
                  result.status === 'safe' ? 'text-green-400' : 
                  result.status === 'warning' ? 'text-amber-400' : 
                  'text-red-400'
                )}>
                  {result.status === 'safe' ? 'Keuanganmu AMAN' : 
                   result.status === 'warning' ? 'Hati-hati, Mulai Tipis' : 
                   'BAHAYA: Kamu Akan Tekor'}
                </h4>
                
                <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                  {result.status === 'safe' ? 'Kamu punya surplus yang cukup hingga gajian berikutnya. Pertahankan!' : 
                   result.status === 'warning' ? 'Saldo kamu sangat pas-pasan. Sedikit saja belanja berlebih, kamu akan tekor.' : 
                   'Pengeluaran harianmu melebihi sisa dana yang ada. Kamu butuh Monefyi segera.'}
                </p>

                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-slate-950/50 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Hari Lagi Gajian</p>
                    <p className="text-lg font-bold text-white">{result.hariSampaiGajian} Hari</p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Surplus/Defisit</p>
                    <p className={cn("text-lg font-bold", result.surplus >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {formatRupiah(result.surplus)}
                    </p>
                  </div>
                </div>

                <Button fullWidth onClick={() => window.location.hash = 'pricing'}>
                  Cegah Tekor dengan Monefyi
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SectionWrapper>
  );
}
