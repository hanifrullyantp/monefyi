import { FileText, Palette, Shield } from 'lucide-react';
import { deriveOrgBrandPalette, MONEFYI_ONLY_SURFACES, ORG_BRAND_SURFACES } from '../../lib/orgBrand';

interface Props {
  brandColor: string;
  syncPdf: boolean;
  onSyncPdfChange: (v: boolean) => void;
}

export default function BrandIdentityPanel({ brandColor, syncPdf, onSyncPdfChange }: Props) {
  const palette = deriveOrgBrandPalette(brandColor);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div
          className="h-16 flex items-end p-4"
          style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.dark})` }}
        >
          <span className="text-sm font-bold" style={{ color: palette.onPrimary }}>
            Preview brand organisasi
          </span>
        </div>
        <div className="p-4 bg-white grid grid-cols-3 gap-2 text-center text-[10px]">
          {[
            { label: 'Utama', color: palette.primary },
            { label: 'Aksen', color: palette.accent },
            { label: 'Gelap', color: palette.dark },
          ].map(s => (
            <div key={s.label}>
              <div className="h-8 rounded-lg border border-slate-100 mb-1" style={{ backgroundColor: s.color }} />
              <span className="text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-org-primary" style={{ color: palette.primary }} />
            <h4 className="text-sm font-bold text-slate-800">Mengikuti warna brand Anda</h4>
          </div>
          <ul className="space-y-2">
            {ORG_BRAND_SURFACES.map(s => (
              <li key={s.id} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="text-emerald-600 mt-0.5">✓</span>
                {s.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-bold text-slate-800">Tetap identitas Monefyi</h4>
          </div>
          <ul className="space-y-2">
            {MONEFYI_ONLY_SURFACES.map(s => (
              <li key={s.id} className="flex items-start gap-2 text-xs text-slate-500">
                <span className="mt-0.5">—</span>
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
        <input
          type="checkbox"
          checked={syncPdf}
          onChange={e => onSyncPdfChange(e.target.checked)}
          className="mt-1 rounded border-slate-300 accent-org"
          style={{ accentColor: palette.primary }}
        />
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileText className="w-4 h-4" />
            Sinkronkan ke PDF estimasi default
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Warna utama PDF penawaran mengikuti brand. Anda masih bisa ubah per-estimasi di Estimator → Pengaturan PDF.
          </p>
        </div>
      </label>
    </div>
  );
}
