import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ShieldCheck, MapPin, Calendar, CreditCard, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { pricingData } from '../../data/pricing-data';
import { formatRupiah } from '../../lib/formatters';
import { UserData, CheckoutStep, PricingPlan } from '../../types';
import { getPlanCheckoutUrl } from '../../data/checkout-urls';

interface CheckoutFunnelProps {
  open: boolean;
  onClose: () => void;
  initialPlanId: string;
}

export function CheckoutFunnel({ open, onClose, initialPlanId }: CheckoutFunnelProps) {
  const [step, setStep] = useState<CheckoutStep>('data');
  const [plan, setPlan] = useState<PricingPlan>(() => (pricingData.plans.find(p => p.id === initialPlanId) as any) || pricingData.plans[1]);
  const [userData, setUserData] = useState<UserData>({
    nama: '',
    noHp: '',
    domisili: '',
    tanggalLahir: '',
  });

  const handleDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plan.id === 'gratis' || plan.id === 'lifetime') {
      setStep('upsell');
    } else {
      setStep('payment');
    }
  };

  const handleUpsell = (newPlanId: string) => {
    const newPlan = pricingData.plans.find(p => p.id === newPlanId) as any;
    if (newPlan) {
      setPlan(newPlan);
    }
    setStep('payment');
  };

  const resetFunnel = () => {
    setStep('data');
    onClose();
  };

  return (
    <Modal open={open} onClose={resetFunnel} maxWidth="max-w-xl">
      <div className="p-8">
        <AnimatePresence mode="wait">
          {step === 'data' && (
            <motion.div
              key="data"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Data Diri Pengguna</h3>
                <p className="text-slate-400 text-sm">Lengkapi data untuk mengaktifkan akun <span className="text-green-400 font-bold">{plan.name}</span> Anda.</p>
              </div>

              <form onSubmit={handleDataSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><User size={12}/> Nama Lengkap</label>
                  <input
                    required
                    value={userData.nama}
                    onChange={e => setUserData({...userData, nama: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><ShieldCheck size={12}/> Nomor WhatsApp</label>
                  <input
                    required
                    type="tel"
                    value={userData.noHp}
                    onChange={e => setUserData({...userData, noHp: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                    placeholder="0812xxxx"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><MapPin size={12}/> Domisili</label>
                    <input
                      required
                      value={userData.domisili}
                      onChange={e => setUserData({...userData, domisili: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                      placeholder="Jakarta"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Calendar size={12}/> Tanggal Lahir</label>
                    <input
                      required
                      type="date"
                      value={userData.tanggalLahir}
                      onChange={e => setUserData({...userData, tanggalLahir: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
                <Button fullWidth size="lg" className="mt-6" type="submit">
                  Lanjutkan <ArrowRight size={18} />
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'upsell' && (
            <motion.div
              key="upsell"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center"
            >
              {plan.id === 'gratis' ? (
                <>
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                    <Sparkles size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4">Penawaran Terbatas!</h3>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    Kenapa tidak ambil <span className="text-green-400 font-bold">Lifetime Access</span> sekarang?
                    Cukup bayar sekali Rp 99.000, dapat 4 Bonus Aplikasi & Update Selamanya.
                  </p>
                  <div className="space-y-3">
                    <Button fullWidth onClick={() => handleUpsell('lifetime')}>
                      Ambil Lifetime — Rp 99.000
                    </Button>
                    <button onClick={() => setStep('payment')} className="text-slate-500 text-xs font-bold hover:text-slate-300 transition-colors">
                      Tetap lanjutkan dengan Paket Gratis
                    </button>
                  </div>
                </>
              ) : plan.id === 'lifetime' ? (
                <>
                  <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-500">
                    <Heart size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4">Makin Hemat Berdua!</h3>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    Tingkatkan ke <span className="text-purple-400 font-bold">Couple Pack</span>. Hanya Rp 149.000 dapat 2 Akun Lifetime. 
                    Sempurna untuk mengelola keuangan bersama pasangan.
                  </p>
                  <div className="space-y-3">
                    <Button fullWidth variant="primary" className="bg-gradient-to-r from-purple-500 to-indigo-600" onClick={() => handleUpsell('pro')}>
                      Ambil Couple Pack — Rp 149.000
                    </Button>
                    <button onClick={() => setStep('payment')} className="text-slate-500 text-xs font-bold hover:text-slate-300 transition-colors">
                      Tidak, saya ambil Personal saja
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Ringkasan Pesanan</h3>
                <p className="text-slate-400 text-sm">Pembayaran aman via <b>Lynk.id</b> — VA, QRIS, e-wallet.</p>
              </div>

              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-300 font-medium">{plan.name}</span>
                    <span className="text-white font-black">{formatRupiah(plan.price.amount)}</span>
                 </div>
                 <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
                    <span className="text-white font-bold">Total Bayar</span>
                    <span className="text-2xl font-black text-green-400">{formatRupiah(plan.price.amount)}</span>
                 </div>
              </div>

              <div className="space-y-4">
                <Button fullWidth size="lg" className="h-14 text-lg" onClick={() => {
                  const url = getPlanCheckoutUrl(plan.id);
                  window.location.href = url;
                }}>
                  <CreditCard size={20} /> {plan.price.amount > 0 ? 'Bayar Sekarang' : 'Buka Aplikasi Gratis'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
