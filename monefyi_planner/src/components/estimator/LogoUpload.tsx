import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { uploadCompanyAsset } from '../../services/companyAssetService';

type Props = {
  orgId: string;
  kind: 'logo' | 'signature';
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onError?: (message: string) => void;
  previewClassName?: string;
};

export default function LogoUpload({
  orgId,
  kind,
  label,
  value,
  onChange,
  onError,
  previewClassName = 'w-24 h-24',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadCompanyAsset(orgId, kind, file);
      onChange(url);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Gagal mengunggah gambar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className="text-xs text-slate-500 block mb-2">{label}</span>
      {value ? (
        <div className="flex items-start gap-3">
          <img
            src={value}
            alt={label}
            className={`${previewClassName} object-contain rounded-xl border border-slate-200 bg-white`}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Ganti {kind === 'logo' ? 'Logo' : 'Gambar'}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" /> Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
          ) : (
            <>
              <ImagePlus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Pilih file atau drag & drop</p>
              <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, WebP · maks 2MB</p>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
