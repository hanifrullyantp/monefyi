import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { usePosStore } from '../store/posStore';
import { useAuthStore } from '../store/authStore';
import { useHrStore } from '../store/hrStore';
import { payPayrollFromPos } from '../store/posStore';
import PosCart, { PaymentMethodGrid, type PaymentChannelKey } from '../components/pos/PosCart';
import CashPaymentPanel from '../components/pos/CashPaymentPanel';
import TransferPaymentPanel from '../components/pos/TransferPaymentPanel';
import SplitPaymentPanel, { DepositPaymentPanel } from '../components/pos/SplitPaymentPanel';
import CashRegisterModal from '../components/pos/CashRegisterModal';
import ExpensePanel, { PayrollExpensePanel } from '../components/pos/ExpensePanel';
import ReceiptPreview from '../components/pos/ReceiptPreview';
import RefundModal from '../components/pos/RefundModal';
import XenditPaymentPanel from '../components/payments/XenditPaymentPanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Search, Lock, Unlock, Receipt } from 'lucide-react';
import { cn } from '../utils/cn';

export default function POSPage() {
  const location = useLocation();
  const { bookings, tenant } = useAppStore();
  const { user } = useAuthStore();
  const { payroll } = useHrStore();
  const pos = usePosStore();

  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [channel, setChannel] = useState<PaymentChannelKey | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  const [registerModal, setRegisterModal] = useState<'open' | 'close' | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [posTab, setPosTab] = useState<'sale' | 'expense'>('sale');

  const activeSession = pos.getActiveSession();
  const totals = pos.calculateTotals(tenant.taxPercent, tenant.serviceChargePercent);
  const selected = bookings.find((b) => b.id === selectedBookingId);

  useEffect(() => {
    if (tenant.id) pos.initializePos(tenant.id);
  }, [tenant.id]);

  useEffect(() => {
    if (location.state?.bookingId) {
      const bId = location.state.bookingId as string;
      setSelectedBookingId(bId);
      pos.loadBookingToCart(bId);
    }
  }, [location.state]);

  const pendingBookings = bookings.filter(
    (b) =>
      b.paymentStatus !== 'paid' &&
      b.status !== 'cancelled' &&
      (!search ||
        b.guest?.name.toLowerCase().includes(search.toLowerCase()) ||
        b.bookingCode.includes(search))
  );

  const selectBooking = (bId: string) => {
    setSelectedBookingId(bId);
    pos.loadBookingToCart(bId);
    setChannel(null);
  };

  const handleChannelSelect = (key: PaymentChannelKey) => {
    if (totals.grandTotal <= 0 && posTab === 'sale') return;
    if (key === 'cash' && !activeSession) {
      setRegisterModal('open');
      return;
    }
    setChannel(key);
    if (key === 'cash') setCashModal(true);
  };

  const handleCashConfirm = (received: number) => {
    if (!user) return;
    const tx = pos.checkoutCash(received, user.id, tenant.id);
    if (tx) {
      pos.createReceipt(tx, tenant.name);
      setShowReceipt(true);
    }
    setCashModal(false);
    setChannel(null);
  };

  const handleTransferConfirm = (ref: string) => {
    if (!user) return;
    const tx = pos.checkoutTransfer(ref, undefined, user.id, tenant.id);
    if (tx) {
      pos.createReceipt(tx, tenant.name);
      setShowReceipt(true);
    }
    setChannel(null);
  };

  const handleSplitConfirm = (splits: { methodCode: string; amount: number; cashReceived?: number }[]) => {
    if (!user) return;
    const tx = pos.checkoutSplit(splits, user.id, tenant.id);
    if (tx) {
      pos.createReceipt(tx, tenant.name);
      setShowReceipt(true);
    }
    setChannel(null);
  };

  const handleDepositConfirm = (percent: number, method: string) => {
    if (!user) return;
    pos.checkoutDeposit(percent, method, user.id, tenant.id);
    setChannel(null);
  };

  const handleExpense = (desc: string, amount: number, cat: string, method: 'cash' | 'transfer') => {
    if (!user) return;
    pos.createExpense(desc, amount, cat, method, user.id, tenant.id);
  };

  const expectedClose =
    (activeSession?.openingBalance ?? 0) +
    pos.transactions
      .filter((t) => t.sessionId === activeSession?.id && t.status === 'paid')
      .reduce((s, t) => s + t.grandTotal, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">KASIR / POS</h1>
          {selected && (
            <p className="text-sm text-slate-500">
              {selected.guest?.name} · {selected.bookingCode} · Kamar {selected.room?.number}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeSession ? (
            <Badge variant="success" className="gap-1">
              <Unlock className="h-3 w-3" /> Shift Aktif
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1">
              <Lock className="h-3 w-3" /> Kas Tutup
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => setRegisterModal(activeSession ? 'close' : 'open')}>
            {activeSession ? 'Tutup Kas' : 'Buka Kas'}
          </Button>
          {user?.name && <span className="text-xs text-slate-500">Kasir: {user.name}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* Left: booking list + cart */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tamu / kode booking..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {pendingBookings.slice(0, 6).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBooking(b.id)}
                className={cn(
                  'text-left p-3 rounded-xl border transition-all',
                  selectedBookingId === b.id ? 'border-emerald-500 bg-emerald-50' : 'bg-white hover:border-slate-300'
                )}
              >
                <p className="font-bold text-sm">{b.guest?.name}</p>
                <p className="text-xs text-slate-500">{b.bookingCode} · Kmr {b.room?.number}</p>
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            <PosCart
              items={pos.cart.items}
              totals={totals}
              taxPercent={tenant.taxPercent}
              servicePercent={tenant.serviceChargePercent}
              onUpdateQty={pos.updateCartItemQty}
              onRemove={pos.removeCartItem}
              onDiscountChange={pos.setCartDiscount}
              discountAmount={pos.cart.discountAmount}
              discountPercent={pos.cart.discountPercent}
            />
          </div>
        </div>

        {/* Right: payment actions */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['sale', 'expense'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setPosTab(t); pos.setPosMode(t); setChannel(null); }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-bold transition-all',
                  posTab === t ? 'bg-white shadow text-emerald-700' : 'text-slate-500'
                )}
              >
                {t === 'sale' ? 'Penjualan' : 'Pengeluaran'}
              </button>
            ))}
          </div>

          {posTab === 'sale' ? (
            <>
              {!channel && (
                <PaymentMethodGrid
                  selected={channel}
                  onSelect={handleChannelSelect}
                />
              )}
              {channel === 'transfer' && (
                <TransferPaymentPanel
                  grandTotal={totals.grandTotal}
                  bankAccounts={pos.bankAccounts}
                  guestName={selected?.guest?.name}
                  onConfirm={handleTransferConfirm}
                  onCancel={() => setChannel(null)}
                />
              )}
              {channel === 'split' && (
                <SplitPaymentPanel
                  grandTotal={totals.grandTotal}
                  onConfirm={handleSplitConfirm}
                  onCancel={() => setChannel(null)}
                />
              )}
              {channel === 'deposit' && (
                <DepositPaymentPanel
                  grandTotal={totals.grandTotal}
                  onConfirm={handleDepositConfirm}
                  onCancel={() => setChannel(null)}
                />
              )}
              {['qris', 'virtual_account', 'ewallet', 'credit_card'].includes(channel ?? '') && selectedBookingId && (
                <XenditPaymentPanel
                  bookingId={selectedBookingId}
                  amount={totals.grandTotal}
                  method={channel as 'qris' | 'virtual_account' | 'ewallet' | 'credit_card'}
                  onPaid={() => { setShowReceipt(true); setChannel(null); }}
                />
              )}
            </>
          ) : (
            <div className="space-y-4">
              <ExpensePanel onSubmit={handleExpense} />
              <div className="border-t pt-4">
                <p className="text-sm font-bold text-slate-700 mb-2">Bayar Gaji</p>
                <PayrollExpensePanel
                  payroll={payroll}
                  onPay={(id) => {
                    const entry = payroll.find((p) => p.id === id);
                    if (entry && user) payPayrollFromPos(id, entry.netPay, entry.userId, tenant.id, user.id);
                  }}
                />
              </div>
            </div>
          )}

          {pos.lastTransaction && (
            <Button variant="outline" icon={<Receipt className="h-4 w-4" />} onClick={() => setShowReceipt(true)}>
              Struk Terakhir
            </Button>
          )}
          {pos.lastTransaction && user?.role !== 'receptionist' && (
            <Button variant="ghost" size="sm" onClick={() => setRefundOpen(true)}>Refund</Button>
          )}
        </div>
      </div>

      <Modal open={cashModal} onClose={() => { setCashModal(false); setChannel(null); }} title="Pembayaran Tunai">
        <CashPaymentPanel grandTotal={totals.grandTotal} onConfirm={handleCashConfirm} onCancel={() => { setCashModal(false); setChannel(null); }} />
      </Modal>

      <CashRegisterModal
        open={registerModal !== null}
        onClose={() => setRegisterModal(null)}
        mode={registerModal ?? 'open'}
        session={activeSession}
        expectedBalance={expectedClose}
        onOpen={(bal) => user && pos.openSession(bal, user.id, tenant.id)}
        onCloseSession={(actual, notes, denom) => user && pos.closeSession(actual, user.id, notes, denom)}
      />

      <Modal open={showReceipt && !!pos.lastTransaction} onClose={() => setShowReceipt(false)} title="Struk Transaksi" size="sm">
        {pos.lastTransaction && (
          <ReceiptPreview
            transaction={pos.lastTransaction}
            tenantName={tenant.name}
            tenantAddress={tenant.address}
            tenantPhone={tenant.phone}
            cashierName={user?.name}
          />
        )}
      </Modal>

      {pos.lastTransaction && (
        <RefundModal
          open={refundOpen}
          onClose={() => setRefundOpen(false)}
          transactionId={pos.lastTransaction.id}
          maxAmount={pos.lastTransaction.grandTotal}
          bookingId={pos.lastTransaction.bookingId}
          onConfirm={(amount, reason) =>
            user && pos.createRefund(
              pos.lastTransaction!.id,
              amount,
              reason,
              false,
              user.id,
              tenant.id,
              pos.lastTransaction!.bookingId,
              selected?.bookingCode
            )
          }
        />
      )}
    </div>
  );
}
