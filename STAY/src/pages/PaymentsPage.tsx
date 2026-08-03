import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import XenditPaymentPanel from '../components/payments/XenditPaymentPanel';
import { useXenditPayment, isOnlinePaymentMethod } from '../hooks/useXenditPayment';
import { formatCurrency, formatDateTime } from '../utils/format';
import { CreditCard, Search, Receipt, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import type { PaymentMethod } from '../types';

const methodLabel: Record<PaymentMethod, string> = {
  cash: '💵 Tunai',
  transfer: '🏦 Transfer Bank',
  virtual_account: '🏧 Virtual Account',
  ewallet: '📱 E-Wallet',
  qris: '📷 QRIS',
  credit_card: '💳 Kartu Kredit',
};

const methodColors: Record<PaymentMethod, string> = {
  cash: 'bg-emerald-50 text-emerald-700',
  transfer: 'bg-blue-50 text-blue-700',
  virtual_account: 'bg-violet-50 text-violet-700',
  ewallet: 'bg-sky-50 text-sky-700',
  qris: 'bg-orange-50 text-orange-700',
  credit_card: 'bg-rose-50 text-rose-700',
};

export default function PaymentsPage() {
  const { bookings, payments, recordBookingPayment } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<(typeof bookings)[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const xendit = useXenditPayment(selectedBooking?.id ?? null);

  useEffect(() => {
    if (!showModal) xendit.reset();
  }, [showModal]);

  useEffect(() => {
    if (xendit.status === 'paid') {
      setSuccessMsg('Pembayaran Xendit berhasil dicatat!');
      setTimeout(() => {
        setSuccessMsg('');
        setShowModal(false);
        xendit.reset();
      }, 2000);
    }
  }, [xendit.status]);

  const today = new Date().toISOString().split('T')[0];
  const totalRevToday = payments
    .filter((p) => p.createdAt.startsWith(today) && p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const unpaidBookings = bookings.filter(
    (b) =>
      (b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial') &&
      b.status !== 'cancelled'
  );

  const filtered = unpaidBookings.filter(
    (b) =>
      !search ||
      b.guest?.name.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase())
  );

  const handlePayment = async () => {
    if (!selectedBooking || !payAmount) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const amount = parseInt(payAmount.replace(/\D/g, ''), 10);
    recordBookingPayment(selectedBooking.id, amount, paymentMethod);

    setSuccessMsg(`Pembayaran ${formatCurrency(amount)} berhasil dicatat!`);
    setLoading(false);
    setTimeout(() => {
      setSuccessMsg('');
      setShowModal(false);
    }, 2000);
  };

  const handleCreateXendit = () => {
    const amount = parseInt(payAmount.replace(/\D/g, ''), 10);
    if (amount > 0) void xendit.createInvoice(amount, paymentMethod);
  };

  const isOnline = isOnlinePaymentMethod(paymentMethod);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manajemen Pembayaran</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola tagihan dan pembayaran tamu</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">Diterima Hari Ini</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(totalRevToday)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">Tagihan Belum Lunas</p>
          <p className="text-xl font-black text-amber-600 mt-1">{unpaidBookings.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-400 font-medium">Total Transaksi</p>
          <p className="text-xl font-black text-slate-800 mt-1">{payments.length}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama tamu atau kode booking..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <Receipt className="h-10 w-10 mx-auto text-slate-200 mb-2" />
            <p className="text-slate-500 text-sm">Semua tagihan sudah lunas</p>
          </div>
        ) : (
          filtered.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-slate-800">{booking.guest?.name}</p>
                <p className="text-xs text-slate-400">
                  {booking.bookingCode} · Kamar {booking.room?.number}
                </p>
                <p className="text-sm font-bold text-slate-700 mt-1">
                  Sisa: {formatCurrency(booking.totalAmount - booking.paidAmount)}
                </p>
              </div>
              <Button
                size="sm"
                icon={<CreditCard className="h-4 w-4" />}
                onClick={() => {
                  setSelectedBooking(booking);
                  setPayAmount(String(booking.totalAmount - booking.paidAmount));
                  setPaymentMethod('cash');
                  setShowModal(true);
                }}
              >
                Bayar
              </Button>
            </div>
          ))
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">Riwayat Pembayaran Terbaru</h2>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {payments.slice(0, 6).map((payment, idx) => {
            const booking = bookings.find((b) => b.id === payment.bookingId);
            return (
              <div
                key={payment.id}
                className={cn('flex items-center gap-3 p-4', idx < payments.length - 1 && 'border-b border-slate-50')}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{booking?.guest?.name || 'Tamu'}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(payment.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">{formatCurrency(payment.amount)}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', methodColors[payment.method])}>
                    {methodLabel[payment.method]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Catat Pembayaran" size="sm">
        {selectedBooking && (
          <div className="space-y-4">
            {successMsg ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-emerald-700">{successMsg}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  {selectedBooking.guest?.name} · Sisa{' '}
                  {formatCurrency(selectedBooking.totalAmount - selectedBooking.paidAmount)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(methodLabel) as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m);
                        xendit.reset();
                      }}
                      className={cn(
                        'p-2 rounded-xl text-xs font-medium border transition-all',
                        paymentMethod === m
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200'
                      )}
                    >
                      {methodLabel[m]}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-bold"
                />

                {isOnline ? (
                  <XenditPaymentPanel
                    paymentUrl={xendit.paymentUrl}
                    status={xendit.status}
                    loading={xendit.loading}
                    error={xendit.error}
                    onCreate={handleCreateXendit}
                  />
                ) : (
                  <Button loading={loading} className="w-full" onClick={handlePayment}>
                    Konfirmasi Pembayaran
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
