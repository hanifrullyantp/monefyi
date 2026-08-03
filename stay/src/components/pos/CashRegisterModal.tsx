import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatCurrency } from '../../utils/format';
import type { PosSession } from '../../types/pos';

interface CashRegisterModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'open' | 'close';
  session: PosSession | null;
  expectedBalance?: number;
  onOpen: (balance: number) => void;
  onCloseSession: (actual: number, notes: string, denomination?: Record<string, number>) => void;
}

const DENOM_KEYS = ['100000', '50000', '20000', '10000', '5000', '2000', '1000'];

export default function CashRegisterModal({
  open,
  onClose,
  mode,
  session,
  expectedBalance = 0,
  onOpen,
  onCloseSession,
}: CashRegisterModalProps) {
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [denom, setDenom] = useState<Record<string, number>>({});

  const denomTotal = Object.entries(denom).reduce((s, [k, v]) => s + Number(k) * v, 0);
  const actual = parseFloat(balance) || denomTotal || 0;
  const variance = actual - expectedBalance;

  return (
    <Modal open={open} onClose={onClose} title={mode === 'open' ? 'Buka Kas' : 'Tutup Kas'} size="md">
      <div className="space-y-4">
        {mode === 'open' ? (
          <>
            <Input label="Modal Awal Kas" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} />
            <Button className="w-full" onClick={() => { onOpen(parseFloat(balance) || 0); onClose(); }}>
              Buka Shift
            </Button>
          </>
        ) : (
          <>
            <div className="bg-slate-100 rounded-xl p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Seharusnya</span><span className="font-bold">{formatCurrency(expectedBalance)}</span></div>
            </div>
            <p className="text-sm font-medium text-slate-700">Hitung per denominasi (opsional)</p>
            <div className="grid grid-cols-2 gap-2">
              {DENOM_KEYS.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="text-xs w-16">{formatCurrency(Number(d))}</span>
                  <input
                    type="number"
                    min={0}
                    value={denom[d] || ''}
                    onChange={(e) => setDenom({ ...denom, [d]: Number(e.target.value) })}
                    className="flex-1 px-2 py-1 rounded-lg border text-sm"
                  />
                </div>
              ))}
            </div>
            {denomTotal > 0 && <p className="text-sm">Total denominasi: <strong>{formatCurrency(denomTotal)}</strong></p>}
            <Input label="Kas Fisik Dihitung" type="number" value={balance || (denomTotal || '')} onChange={(e) => setBalance(e.target.value)} />
            {actual > 0 && (
              <p className={`text-sm font-bold ${variance === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Selisih: {formatCurrency(variance)}
              </p>
            )}
            {variance !== 0 && (
              <Input label="Catatan Selisih (wajib)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            )}
            <Button
              className="w-full"
              disabled={actual <= 0 || (variance !== 0 && !notes)}
              onClick={() => { onCloseSession(actual, notes, Object.keys(denom).length ? denom : undefined); onClose(); }}
            >
              Tutup Shift
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
