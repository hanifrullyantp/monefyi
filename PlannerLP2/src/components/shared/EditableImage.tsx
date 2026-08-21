"use client";
import { useState } from "react";
import { useUIStore } from "@/lib/store/uiStore";
import { useContentStore } from "@/lib/store/contentStore";
import { useMediaStore } from "@/lib/store/mediaStore";
import { Image as ImageIcon, Check, X, Camera, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SiteContent } from "@/lib/types/content";

interface EditableImageProps {
  section: keyof SiteContent;
  field: string;
  src: string;
  alt: string;
  className?: string;
}

export function EditableImage({
  section,
  field,
  src,
  alt,
  className,
}: EditableImageProps) {
  const { isEditMode, isAdmin } = useUIStore();
  const { updateField } = useContentStore();
  const { files } = useMediaStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempSrc, setTempSrc] = useState(src);
  const [tab, setTab] = useState<"library" | "url">("library");

  if (!isAdmin || !isEditMode) {
    return <img src={src} alt={alt} className={cn("object-cover", className)} />;
  }

  const handleSave = () => {
    updateField(section, field, tempSrc);
    setIsEditing(false);
  };

  return (
    <div className={cn("relative group cursor-pointer", className)}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      
      <div className="absolute inset-0 bg-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none ring-4 ring-emerald-500 ring-inset">
        <div className="pointer-events-auto p-4 bg-white text-emerald-600 rounded-2xl shadow-2xl flex items-center gap-3 scale-90 group-hover:scale-100 transition-transform">
          <Camera className="w-6 h-6" />
          <span className="font-black text-xs uppercase tracking-widest">Ganti Gambar</span>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-auto" onClick={() => setIsEditing(true)} />

      {isEditing && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md pointer-events-auto">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden relative">
            <button 
               onClick={() => setIsEditing(false)}
               className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-[18px] bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Media Library</h3>
                <p className="text-sm text-slate-500 font-bold">Pilih gambar untuk <span className="text-emerald-600">{field}</span></p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
              <button 
                onClick={() => setTab("library")}
                className={cn("flex-1 py-2 rounded-xl text-xs font-black transition-all", tab === "library" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
              >
                LIBRARY
              </button>
              <button 
                onClick={() => setTab("url")}
                className={cn("flex-1 py-2 rounded-xl text-xs font-black transition-all", tab === "url" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
              >
                CUSTOM URL
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto mb-8 pr-2 custom-scrollbar">
              {tab === "library" ? (
                <div className="grid grid-cols-3 gap-4">
                  {files.map((file) => (
                    <div 
                      key={file.id} 
                      onClick={() => setTempSrc(file.url)}
                      className={cn(
                        "aspect-square rounded-2xl overflow-hidden border-4 transition-all cursor-pointer relative group/item",
                        tempSrc === file.url ? "border-emerald-500 shadow-glow" : "border-transparent hover:border-slate-200"
                      )}
                    >
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      {tempSrc === file.url && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="aspect-square rounded-2xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all cursor-pointer">
                    <Plus className="w-6 h-6 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={tempSrc}
                    onChange={(e) => setTempSrc(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Masukkan URL gambar (https://...)"
                  />
                  <div className="aspect-video rounded-[24px] overflow-hidden border border-slate-100 shadow-inner bg-slate-50">
                    <img src={tempSrc} alt="Preview" className="w-full h-full object-cover opacity-80" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
