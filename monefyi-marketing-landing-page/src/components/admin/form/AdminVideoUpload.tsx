/** Upload / URL video untuk demo hero */
import React, { useEffect, useState } from 'react';
import { Upload, Trash2, Film, Link2 } from 'lucide-react';
import { AdminInput } from './AdminInput';

interface AdminVideoUploadProps {
  label: string;
  currentUrl?: string;
  onChange: (url: string) => void;
  helperText?: string;
  maxSizeMb?: number;
}

export function AdminVideoUpload({
  label,
  currentUrl,
  onChange,
  helperText,
  maxSizeMb = 15,
}: AdminVideoUploadProps) {
  const [preview, setPreview] = useState(currentUrl || '');

  useEffect(() => {
    setPreview(currentUrl || '');
  }, [currentUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`Video terlalu besar. Maksimal ${maxSizeMb}MB. Gunakan URL YouTube/Vimeo untuk file besar.`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setPreview(url);
      onChange(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3 w-full border-t border-slate-800 pt-4 first:border-0 first:pt-0">
      <label className="text-sm font-medium text-slate-300 block">{label}</label>
      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}

      <AdminInput
        label="URL Video (MP4, YouTube, Vimeo)"
        value={preview.startsWith('data:') ? '' : preview}
        onChange={(v) => {
          setPreview(v);
          onChange(v);
        }}
        placeholder="https://youtube.com/watch?v=... atau https://.../demo.mp4"
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-full sm:w-40 h-24 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden relative group">
          {preview ? (
            preview.includes('youtube') || preview.includes('youtu.be') || preview.includes('vimeo') ? (
              <Film size={32} className="text-green-500" />
            ) : (
              <video src={preview} className="w-full h-full object-cover" muted playsInline />
            )
          ) : (
            <Film size={32} className="text-slate-700" />
          )}
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview('');
                onChange('');
              }}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 uppercase tracking-widest">
          <Upload size={14} />
          Upload MP4/WebM
          <input
            type="file"
            className="hidden"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <p className="text-[10px] text-slate-600 flex items-center gap-1">
        <Link2 size={10} /> Rekomendasi: host di YouTube/Vimeo, paste URL di atas
      </p>
    </div>
  );
}
