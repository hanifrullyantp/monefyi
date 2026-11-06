type Props = {
  status: string;
  className?: string;
};

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  // Proyek
  active: { label: 'Aktif', bg: '#ECFDF5', color: '#047857' },
  planning: { label: 'Planning', bg: '#EFF6FF', color: '#1D4ED8' },
  on_hold: { label: 'Ditunda', bg: '#FFFBEB', color: '#B45309' },
  completed: { label: 'Selesai', bg: '#F1F5F9', color: '#334155' },
  archived: { label: 'Arsip', bg: '#F1F5F9', color: '#64748B' },
  draft: { label: 'Draft', bg: '#F8FAFC', color: '#64748B' },

  // Estimasi pipeline
  wa: { label: 'WA', bg: '#E0F2FE', color: '#0369A1' },
  survei: { label: 'Survei', bg: '#EDE9FE', color: '#6D28D9' },
  penawaran: { label: 'Penawaran', bg: '#F3E8FF', color: '#7E22CE' },
  closing: { label: 'Closing', bg: '#FEF3C7', color: '#B45309' },
  proses: { label: 'Proses', bg: '#ECFDF5', color: '#047857' },
  finishing: { label: 'Finishing', bg: '#CCFBF1', color: '#0F766E' },
  selesai: { label: 'Selesai', bg: '#F1F5F9', color: '#334155' },
  rejected: { label: 'Ditolak', bg: '#FFE4E6', color: '#BE123C' },
  converted: { label: 'Jadi Proyek', bg: '#DCFCE7', color: '#15803D' },
};

export default function StatusPill({ status, className = '' }: Props) {
  const norm = status?.toLowerCase() || '';
  const item = STATUS_MAP[norm] || {
    label: status || '—',
    bg: '#F1F5F9',
    color: '#475569',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-extrabold shrink-0 ${className}`}
      style={{ backgroundColor: item.bg, color: item.color }}
    >
      {item.label}
    </span>
  );
}

