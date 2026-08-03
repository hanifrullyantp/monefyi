import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Gift } from 'lucide-react';
import { LOGIN_PATH } from '../LoginLink';

const ExitIntentPopup: React.FC = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    try {
      if (sessionStorage.getItem('exit_popup_dismissed')) return;
    } catch {}

    let triggered = false;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !triggered && !dismissed) {
        triggered = true;
        setTimeout(() => setShow(true), 200);
      }
    };

    // Also show on mobile after 60s of scrolling
    const mobileTrigger = setTimeout(() => {
      if (!triggered && !dismissed) {
        triggered = true;
        // Only on mobile/touch devices
        if ('ontouchstart' in window) {
          setShow(true);
        }
      }
    }, 60000);

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(mobileTrigger);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    try { sessionStorage.setItem('exit_popup_dismissed', '1'); } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleDismiss();
    navigate(LOGIN_PATH);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-all z-10"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Top gradient */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 pt-8 pb-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🎁
          </div>
          <div className="text-sm font-semibold bg-white/20 rounded-full px-4 py-1 inline-block mb-3">
            Tunggu dulu! Ada hadiah untuk Anda 🎉
          </div>
          <h2 className="text-2xl font-black leading-tight">
            Dapatkan 30 Hari Trial GRATIS!
          </h2>
          <p className="text-emerald-100 text-sm mt-2">
            Khusus untuk Anda yang masih mempertimbangkan — kami extend trial dari 14 ke 30 hari!
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {!submitted ? (
            <>
              <div className="space-y-3 mb-6">
                {[
                  '30 hari trial, bukan 14 hari',
                  'Akses semua fitur Profesional',
                  'Onboarding 1-on-1 dengan tim kami',
                  'Diskon 25% jika lanjut berlangganan',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600 text-xs">✓</span>
                    </div>
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email Anda untuk klaim penawaran"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Gift className="w-5 h-5" />
                  Klaim 30 Hari Gratis Sekarang
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <button onClick={handleDismiss} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 underline">
                Tidak tertarik, saya lebih suka bayar mahal
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Yeay! Penawaran Berhasil!</h3>
              <p className="text-gray-600 text-sm">
                Cek email Anda untuk link aktivasi 30 hari trial gratis. Tim kami akan menghubungi dalam 1 jam!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
