import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatUpdateAgeLabel } from '../../../lib/estimatorListDashboard';
import type { EstimationFormDraft } from '../../../types/estimator';

type Props = {
  open: boolean;
  onToggle: () => void;
  draft: EstimationFormDraft;
  updatedAt?: string | null;
  isReadOnly: boolean;
  children?: ReactNode;
};

function displayOrEmpty(value: string | null | undefined): { filled: boolean; text: string } {
  const text = value?.trim() ?? '';
  return text ? { filled: true, text } : { filled: false, text: 'Belum diisi' };
}

export default function EstimationDetailProjectCard({
  open,
  onToggle,
  draft,
  updatedAt,
  isReadOnly: _isReadOnly,
  children,
}: Props) {
  const phone = displayOrEmpty(draft.customer_phone);
  const address = displayOrEmpty(draft.customer_address);
  const notes = displayOrEmpty(draft.notes);

  return (
    <section className="bg-white border border-[#E5EAE8] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full min-h-11 flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-slate-800">Detail Project</span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        inert={open ? undefined : true}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-3 border-t border-[#E5EAE8] pt-3">
            <InfoRow label="Kontak klien" value={phone.text} muted={!phone.filled} />
            <InfoRow label="Alamat" value={address.text} muted={!address.filled} />
            <InfoRow label="Catatan" value={notes.text} muted={!notes.filled} />
            <InfoRow label="Update terakhir" value={formatUpdateAgeLabel(updatedAt)} />
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Follow-up berikutnya</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm text-slate-400">Belum diisi</p>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center min-h-11 px-3 rounded-full border border-[#E5EAE8] text-xs font-bold text-slate-400"
                >
                  Atur follow-up
                </button>
              </div>
            </div>

            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm ${muted ? 'text-slate-400' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
