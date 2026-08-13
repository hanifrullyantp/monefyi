import React, { useState } from 'react';
import { Edit } from 'lucide-react';
import { useAdminMode } from '../../hooks/useAdminMode';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Modal } from '../ui/Modal';

export interface PhoneScreenData {
  balance: string;
  income: string;
  expense: string;
  safeAmount: string;
  statusLabel: string;
  aiMessage: string;
}

const DEFAULT_DATA: PhoneScreenData = {
  balance: '2.461.000',
  income: '5.000.000',
  expense: '2.539.000',
  safeAmount: '78.000',
  statusLabel: 'AMAN',
  aiMessage: 'Semua tagihan tetap sudah dibayar. Fokus jaga pengeluaran fleksibel minggu ini.',
};

export function usePhoneScreenData(): PhoneScreenData {
  const [data] = useLocalStorage<PhoneScreenData>('monefyi_lp_phone_screen', DEFAULT_DATA);
  return data;
}

export function EditablePhoneScreen(): React.ReactElement | null {
  const isAdmin = useAdminMode();
  const [data, setData] = useLocalStorage<PhoneScreenData>('monefyi_lp_phone_screen', DEFAULT_DATA);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PhoneScreenData>(data);

  if (!isAdmin) return null;

  const handleSave = () => {
    setData(form);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setForm(data); }}
        className="absolute top-2 right-2 z-50 bg-amber-400 text-amber-950 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg"
      >
        <Edit size={10} /> Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} maxWidth="max-w-md">
        <div className="p-6">
          <h3 className="text-white font-bold text-lg mb-4">Edit Phone Screen Data</h3>
          <div className="space-y-3">
            {(Object.keys(DEFAULT_DATA) as (keyof PhoneScreenData)[]).map(key => (
              <div key={key}>
                <label className="text-slate-400 text-xs mb-1 block capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                <input
                  value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            ))}
          </div>
          <button onClick={handleSave} className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-700 text-white font-semibold py-2 rounded-xl">
            Simpan
          </button>
        </div>
      </Modal>
    </>
  );
}
