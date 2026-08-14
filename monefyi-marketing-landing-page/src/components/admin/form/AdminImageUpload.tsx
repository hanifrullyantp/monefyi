/** src/components/admin/form/AdminImageUpload.tsx */
import React, { useEffect, useState } from 'react';
import { Upload, Trash2, Image as ImageIcon, Link2 } from 'lucide-react';
import { AdminInput } from './AdminInput';

interface AdminImageUploadProps {
  label: string;
  currentUrl?: string;
  onChange: (url: string) => void;
  helperText?: string;
  maxSizeKb?: number;
  showUrlInput?: boolean;
}

export function AdminImageUpload({
  label,
  currentUrl,
  onChange,
  helperText,
  maxSizeKb = 2048,
  showUrlInput = false,
}: AdminImageUploadProps) {
  const [preview, setPreview] = useState(currentUrl || '');

  useEffect(() => {
    setPreview(currentUrl || '');
  }, [currentUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeKb * 1024) {
      alert(`File terlalu besar! Maksimal ${maxSizeKb >= 1024 ? `${Math.round(maxSizeKb / 1024)}MB` : `${maxSizeKb}KB`}.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
  };

  const urlValue = preview.startsWith('data:') ? '' : preview;

  return (
    <div className="space-y-3 w-full">
      <label className="text-sm font-medium text-slate-300 block">{label}</label>
      {helperText && <p className="text-xs text-slate-500 mb-2">{helperText}</p>}

      {showUrlInput && (
        <AdminInput
          label="Atau paste URL gambar"
          value={urlValue}
          onChange={(v) => {
            setPreview(v);
            onChange(v);
          }}
          placeholder="https://.../screenshot.png"
        />
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-24 h-24 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden relative group shrink-0">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={32} className="text-slate-700" />
          )}
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 uppercase tracking-widest">
          <Upload size={14} />
          {preview ? 'Ganti Gambar' : 'Upload Gambar'}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>

      {showUrlInput && (
        <p className="text-[10px] text-slate-600 flex items-center gap-1">
          <Link2 size={10} /> PNG/JPG/WebP · max {maxSizeKb >= 1024 ? `${Math.round(maxSizeKb / 1024)}MB` : `${maxSizeKb}KB`}
        </p>
      )}
    </div>
  );
}
