import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { mockPayments } from '../data/mockData';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
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
  const { bookings, updateBooking } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<typeof bookings[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const unpaidBookings = bookings.filter(b =>
    (b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial') &&
    b.status !== 'cancelled'
  );

  const filtered = unpaidBookings.filter(b =>
    !search ||
    b.guest?.name.toLowerCase().includes(search.toLowerCase()) ||
    b.bookingCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevToday = mockPayments.reduce((sum, p) => sum + p.amount, 0);

  const handlePayment = async () => {
    if (!selectedBooking || !payAmount) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));

    const amount = parseInt(payAmount.replace(/\D/g, ''));
    const newPaid = selectedBooking.paidAmount + amount;
    const isPaid = newPaid >= selectedBooking.totalAmount;

    updateBooking(selectedBooking.id, {
      paidAmount: newPaid,
      paymentStatus: isPaid ? 'paid' : 'partial',
    });

    setSuccessMsg(`Pembayaran ${formatCurrency(amount)} berhasil dicatat!`);
    setLoading(false);
    setTimeout(() => {
      setSuccessMsg('');
      setShowModal(false);
    }, 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manajemen Pembayaran</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola tagihan dan pembayaran tamu</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{unpaidBookings.filter(b => b.paymentStatus === 'unpaid').length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Belum Bayar</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{unpaidBookings.filter(b => b.paymentStatus === 'partial').length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Sebagian</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-lg font-bold text-emerald-500">{formatCurrency(totalRevToday)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Diterima Hari Ini</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama tamu atau kode booking..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Unpaid bookings */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3">Tagihan Belum Lunas</h3>
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-300 mb-3" />
              <p className="text-slate-500 font-medium">Semua tagihan sudah lunas! 🎉</p>
            </div>
          ) : (
            filtered.map(booking => {
              const remaining = booking.totalAmount - booking.paidAmount;
              return (
                <div key={booking.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">{booking.guest?.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{booking.guest?.name}</p>
                        <p className="text-xs text-slate-400">{booking.bookingCode} · Kamar {booking.room?.number}</p>
                      </div>
                    </div>
                    <Badge variant={booking.paymentStatus === 'unpaid' ? 'danger' : 'warning'}>
                      {booking.paymentStatus === 'unpaid' ? 'Belum Bayar' : 'Sebagian'}
                    </Badge>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Total Tagihan</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(booking.totalAmount)}</span>
                    </div>
                    {booking.paidAmount > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Sudah Dibayar</span>
                        <span className="text-emerald-600">{formatCurrency(booking.paidAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5 mt-1.5">
                      <span className="text-red-600">Sisa Tagihan</span>
                      <span className="text-red-600">{formatCurrency(remaining)}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-emerald-400 h-2 rounded-full transition-all"
                        style={{ width: `${(booking.paidAmount / booking.totalAmount) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{Math.round((booking.paidAmount / booking.totalAmount) * 100)}% terbayar</p>
                  </div>

                  <Button
                    className="w-full"
                    icon={<CreditCard className="h-4 w-4" />}
                    onClick={() => {
                      setSelectedBooking(booking);
                      setPayAmount(remaining.toString());
                      setShowModal(true);
                    }}
                  >
                    Catat Pembayaran
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3">Pembayaran Terbaru</h3>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {mockPayments.slice(0, 6).map((payment, idx) => {
            const booking = bookings.find(b => b.id === payment.bookingId);
            return (
              <div key={payment.id} className={cn('flex items-center gap-3 p-4', idx < mockPayments.length - 1 && 'border-b border-slate-50')}>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{booking?.guest?.name || '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', methodColors[payment.method])}>
                      {methodLabel[payment.method]}
                    </span>
                    {payment.referenceNumber && (
                      <span className="text-xs text-slate-400">{payment.referenceNumber}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(payment.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSuccessMsg(''); }}
        title="Catat Pembayaran"
        size="md"
        footer={
          !successMsg ? (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
              <Button
                onClick={handlePayment}
                loading={loading}
                disabled={!payAmount}
                className="flex-1"
                icon={<Receipt className="h-4 w-4" />}
              >
                Konfirmasi
              </Button>
            </div>
          ) : undefined
        }
      >
        {successMsg ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="font-bold text-slate-800 text-lg">Berhasil!</p>
            <p className="text-slate-500 mt-1">{successMsg}</p>
          </div>
        ) : selectedBooking && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-700">{selectedBooking.guest?.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{selectedBooking.bookingCode} · Kamar {selectedBooking.room?.number}</p>
              <div className="mt-3 flex justify-between">
                <span className="text-sm text-slate-500">Sisa Tagihan</span>
                <span className="text-lg font-bold text-red-500">
                  {formatCurrency(selectedBooking.totalAmount - selectedBooking.paidAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Jumlah Pembayaran</label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(methodLabel) as [PaymentMethod, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left',
                      paymentMethod === m
                        ? 'bg-sky-500 text-white border-sky-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
