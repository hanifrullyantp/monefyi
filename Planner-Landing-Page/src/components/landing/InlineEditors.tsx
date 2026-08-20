"use client";
import { useState, useEffect, useRef } from "react";
import { useUiStore } from "@/lib/store/uiStore";
import { useContentStore } from "@/lib/store/contentStore";
import { cn } from "@/lib/utils/cn";
import { Check, X, Edit3, Image as ImageIcon } from "lucide-react";

interface InlineTextProps {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  multiline?: boolean;
}

export function InlineText({ value, onSave, className, multiline = false }: InlineTextProps) {
  const { inlineEditMode } = useUiStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempData] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (!inlineEditMode) return <span className={className}>{value}</span>;

  if (isEditing) {
    const commonProps = {
      ref: inputRef as any,
      value: tempValue,
      onChange: (e: any) => setTempData(e.target.value),
      className: cn(
        "w-full bg-white text-slate-900 border-2 border-emerald-500 rounded-lg p-2 focus:outline-none focus:ring-0 z-50 relative",
        className
      ),
      onKeyDown: (e: any) => {
        if (e.key === "Enter" && !e.shiftKey && !multiline) {
          onSave(tempValue);
          setIsEditing(false);
        }
        if (e.key === "Escape") {
          setTempData(value);
          setIsEditing(false);
        }
      }
    };

    return (
      <div className="relative group/inline inline-block w-full">
        {multiline ? (
          <textarea {...commonProps} rows={4} />
        ) : (
          <input {...commonProps} type="text" />
        )}
        <div className="absolute -bottom-10 right-0 flex gap-1 z-[60]">
          <button
            onClick={() => { onSave(tempValue); setIsEditing(false); }}
            className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-lg hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setTempData(value); setIsEditing(false); }}
            className="p-1.5 bg-slate-500 text-white rounded-lg shadow-lg hover:bg-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-emerald-50 hover:ring-2 hover:ring-emerald-200 transition-all rounded-md px-1 -mx-1",
        className
      )}
      title="Klik untuk edit teks"
    >
      {value}
    </span>
  );
}

interface InlineImageProps {
  src: string;
  onSave: (val: string) => void;
  className?: string;
  alt?: string;
}

export function InlineImage({ src, onSave, className, alt }: InlineImageProps) {
  const { inlineEditMode } = useUiStore();
  const [showUploader, setShowUploader] = useState(false);
  const [tempUrl, setTempUrl] = useState(src);

  if (!inlineEditMode) return <img src={src} className={className} alt={alt} />;

  return (
    <div className={cn("relative group/img-edit inline-block overflow-hidden", className)}>
      <img src={src} className="w-full h-full object-cover" alt={alt} />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img-edit:opacity-100 transition-all flex items-center justify-center p-4">
        <button
          onClick={() => { setTempUrl(src); setShowUploader(true); }}
          className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all transform translate-y-2 group-hover/img-edit:translate-y-0"
        >
          <ImageIcon className="w-4 h-4" />
          Ganti Gambar
        </button>
      </div>

      {showUploader && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeInUp">
          <div className="bg-white rounded-[2rem] shadow-2xl p-10 max-w-lg w-full border border-slate-200">
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Ganti Gambar</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">Tempel URL gambar (JPG, PNG, WebP) atau unggah ke server.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-widest">Image URL</label>
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-slate-900 outline-none transition-all font-medium"
                  placeholder="https://fctrxjanqegjmhoklnje.supabase.co/..."
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                  <img src={tempUrl} className="w-full h-full object-cover" alt="Preview" onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=Invalid+URL")} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Preview</p>
                  <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[200px]">{tempUrl}</p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUploader(false)}
                  className="flex-1 py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() => { onSave(tempUrl); setShowUploader(false); }}
                  className="flex-1 py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 text-sm"
                >
                  Simpan perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
