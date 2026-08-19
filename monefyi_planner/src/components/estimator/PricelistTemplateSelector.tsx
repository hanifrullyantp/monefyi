import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PRICELIST_TEMPLATES, type PricelistTemplate } from '../../services/pricelistTemplateService';

type Props = {
  onSelectTemplate: (templateId: string) => Promise<void>;
  onStartEmpty?: () => void;
  loading?: boolean;
  showEmptyOption?: boolean;
  compact?: boolean;
};

export default function PricelistTemplateSelector({
  onSelectTemplate,
  onStartEmpty,
  loading = false,
  showEmptyOption = true,
  compact = false,
}: Props) {
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleSelect = async (template: PricelistTemplate) => {
    const ok = window.confirm(
      `Muat ${template.itemCount} item dari template ${template.name}?`,
    );
    if (!ok) return;
    setImportingId(template.id);
    try {
      await onSelectTemplate(template.id);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <div>
        {!compact && (
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span aria-hidden>📦</span> Mulai dengan Template Pricelist
          </h2>
        )}
        <p className={`text-sm text-slate-500 ${compact ? '' : 'mt-1'}`}>
          Pilih tipe bisnis Anda untuk auto-populate pricelist dengan harga estimasi.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRICELIST_TEMPLATES.map(template => {
          const busy = importingId === template.id || loading;
          return (
            <article
              key={template.id}
              className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-emerald-200 hover:shadow-sm transition-all flex flex-col"
            >
              <div className="text-3xl mb-2" aria-hidden>{template.icon}</div>
              <h3 className="font-bold text-slate-900">{template.name}</h3>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">{template.itemCount} item</p>
              <p className="text-xs text-slate-500 mt-2 flex-1">{template.description}</p>
              <p className="text-[11px] text-slate-400 mt-2">
                {template.highlights.join(' · ')}
              </p>
              <button
                type="button"
                disabled={Boolean(importingId) || loading}
                onClick={() => handleSelect(template)}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Pilih
              </button>
            </article>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
        ℹ️ Harga template adalah estimasi Jabodetabek 2026. Sesuaikan dengan harga di area Anda setelah dimuat.
      </p>

      {showEmptyOption && onStartEmpty && (
        <button
          type="button"
          onClick={onStartEmpty}
          disabled={Boolean(importingId) || loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          📝 Kosong — Input Sendiri
        </button>
      )}
    </div>
  );
}
