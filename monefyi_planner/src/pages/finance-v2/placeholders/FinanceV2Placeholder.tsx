import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
}

export default function FinanceV2Placeholder({ title, description }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-10 text-center space-y-3">
      <Construction className="w-10 h-10 text-slate-500 mx-auto" />
      <h2 className="text-lg font-black text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        {description || 'Modul ini akan tersedia di fase berikutnya.'}
      </p>
    </div>
  );
}
