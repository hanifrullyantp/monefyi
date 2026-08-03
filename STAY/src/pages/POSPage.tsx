import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/format';
import { 
  CreditCard, Wallet, Smartphone, Search, 
  CheckCircle, Receipt, Printer, X, ArrowRight,
  User, ShieldCheck, Banknote
} from 'lucide-react';
import { cn } from '../utils/cn';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

type PaymentChannel = 'cash' | 'debit' | 'credit' | 'qris';

export default function POSPage() {
  const { bookings, updateBooking } = useAppStore();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [channel, setChannel] = useState<PaymentChannel>('cash');

  // Handle incoming selection from Front Desk
  useEffect(() => {
    if (location.state?.bookingId) {
      const bId = location.state.bookingId;
      setSelectedBookingId(bId);
      
      const b = bookings.find(item => item.id === bId);
      if (b) {
        setAmount((b.totalAmount - b.paidAmount).toString());
      }
    }
  }, [location.state, bookings]);
  const [amount, setAmount] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

  const pendingPayments = bookings.filter(b => 
    b.paymentStatus !== 'paid' && b.status !== 'cancelled' &&
    (!search || b.guest?.name.toLowerCase().includes(search.toLowerCase()) || b.bookingCode.includes(search))
  );

  const selected = bookings.find(b => b.id === selectedBookingId);
  const remaining = selected ? selected.totalAmount - selected.paidAmount : 0;

  const handleProcess = async () => {
    if (!selected || !amount) return;
    const paid = parseFloat(amount);
    
    const paymentData = {
      bookingCode: selected.bookingCode,
      guestName: selected.guest?.name,
      amount: paid,
      channel,
      refNumber,
      bankName,
      date: new Date().toISOString(),
    };

    updateBooking(selected.id, {
      paidAmount: selected.paidAmount + paid,
      paymentStatus: (selected.paidAmount + paid) >= selected.totalAmount ? 'paid' : 'partial'
    });

    setLastPayment(paymentData);
    setShowReceipt(true);
    
    // Reset form
    setAmount('');
    setRefNumber('');
    setBankName('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left: Booking List */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 tracking-tight text-center sm:text-left w-full">KASIR / POS</h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Nama Tamu, Kode Booking, atau No. Kamar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-10 pr-4 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none text-sm font-medium"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {pendingPayments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
                <ShieldCheck className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">Tidak ada tagihan</p>
                <p className="text-xs mt-1">Semua pembayaran aktif sudah lunas.</p>
              </div>
            ) : (
              pendingPayments.map(b => (
                <div 
                  key={b.id}
                  onClick={() => { setSelectedBookingId(b.id); setAmount((b.totalAmount - b.paidAmount).toString()); }}
                  className={cn(
                    "bg-white p-5 rounded-3xl border-2 transition-all cursor-pointer hover:shadow-xl group",
                    selectedBookingId === b.id ? "border-sky-500 bg-sky-50 shadow-sky-100" : "border-slate-100 shadow-slate-100"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                        selectedBookingId === b.id ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg group-hover:text-sky-600 transition-colors">{b.guest?.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{b.bookingCode} · Kamar {b.room?.number}</p>
                          {b.paidAmount > 0 && <Badge variant="warning" className="text-[8px] py-0 px-1.5">PARTIAL</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-rose-500">{formatCurrency(b.totalAmount - b.paidAmount)}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Sisa Tagihan</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Payment Terminal */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
          {selected ? (
            <div className="flex-1 flex flex-col p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                  <Receipt className="h-5 w-5 text-emerald-600" /> Payment Terminal
                </h3>
                <button onClick={() => setSelectedBookingId(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-[2rem] mb-8 relative overflow-hidden shadow-lg shadow-slate-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Outstanding</p>
                <p className="text-4xl font-black">{formatCurrency(remaining)}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{selected.guest?.name}</span>
                  <Badge className="bg-white/10 text-white border-none">{selected.bookingCode}</Badge>
                </div>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Metode Bayar</label>
                  <div className="grid grid-cols-2 gap-3">
                    <ChannelButton active={channel === 'cash'} icon={<Banknote className="h-5 w-5" />} label="Tunai" onClick={() => setChannel('cash')} />
                    <ChannelButton active={channel === 'debit'} icon={<CreditCard className="h-5 w-5" />} label="Debit" onClick={() => setChannel('debit')} />
                    <ChannelButton active={channel === 'credit'} icon={<CreditCard className="h-5 w-5" />} label="Kredit" onClick={() => setChannel('credit')} />
                    <ChannelButton active={channel === 'qris'} icon={<Smartphone className="h-5 w-5" />} label="QRIS" onClick={() => setChannel('qris')} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Nominal Bayar</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">Rp</span>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-2xl font-black focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {(channel === 'debit' || channel === 'credit') && (
                    <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-top-2 duration-200">
                      <input 
                        type="text" 
                        placeholder="Nama Bank (misal: BCA, Mandiri)"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Nomor Ref / Trace"
                        value={refNumber}
                        onChange={e => setRefNumber(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none"
                      />
                    </div>
                  )}

                  {channel === 'qris' && (
                    <input 
                      type="text" 
                      placeholder="Transaction ID / Ref"
                      value={refNumber}
                      onChange={e => setRefNumber(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none animate-in slide-in-from-top-2 duration-200"
                    />
                  )}
                </div>
              </div>

              <button 
                className="w-full h-16 rounded-[1.5rem] bg-emerald-600 text-white text-lg font-black shadow-2xl shadow-emerald-200 mt-8 flex items-center justify-center gap-3 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:shadow-none"
                onClick={handleProcess}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                KONFIRMASI BAYAR <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Wallet className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Pilih Reservasi</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-[200px] leading-relaxed">
                Silakan pilih salah satu tagihan di sebelah kiri untuk memproses pembayaran
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} size="sm">
        {lastPayment && (
          <div className="p-2 flex flex-col">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Pembayaran Sukses!</h2>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Struk Digital monefyi.com/stay</p>
            </div>

            <div className="border-t-2 border-dashed border-slate-200 pt-6 space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Booking</span>
                <span className="text-slate-800 font-black">{lastPayment.bookingCode}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Tamu</span>
                <span className="text-slate-800 font-black">{lastPayment.guestName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Metode</span>
                <span className="text-slate-800 font-black uppercase">{lastPayment.channel}</span>
              </div>
              {lastPayment.refNumber && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">Ref</span>
                  <span className="text-slate-800 font-black">{lastPayment.refNumber}</span>
                </div>
              )}
              <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase">Jumlah Bayar</span>
                <span className="text-xl font-black text-emerald-600">{formatCurrency(lastPayment.amount)}</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button className="flex-1 rounded-2xl h-12" variant="outline" onClick={() => setShowReceipt(false)}>Tutup</Button>
              <Button className="flex-1 rounded-2xl h-12" icon={<Printer className="h-4 w-4" />}>Cetak Struk</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ChannelButton({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-[0.95]",
        active 
          ? "border-sky-500 bg-sky-50 text-sky-600 shadow-lg shadow-sky-100/50" 
          : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-white"
      )}
    >
      <div className={cn("mb-2", active ? "text-sky-500" : "text-slate-300")}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
