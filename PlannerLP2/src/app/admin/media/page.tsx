"use client";
import { useState } from "react";
import { Upload, Image as ImageIcon, Trash2, Copy, Search, Link as LinkIcon, Plus } from "lucide-react";
import { useMediaStore, MediaFile } from "@/lib/store/mediaStore";
import { cn } from "@/lib/utils/cn";

export default function MediaPage() {
  const { files, addFile, removeFile } = useMediaStore();
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAddUrl = () => {
    if (!newUrl) return;
    const name = newUrl.split('/').pop() || 'image.jpg';
    addFile({
      id: Date.now().toString(),
      url: newUrl,
      name: name,
      type: "image/jpeg",
      size: "External",
    });
    setNewUrl("");
    setIsUrlModalOpen(false);
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Media Library</h1>
          <p className="text-slate-500 font-medium mt-1">Kelola aset gambar dan ikon untuk landing page</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsUrlModalOpen(true)}
            className="bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <LinkIcon className="w-5 h-5" /> Add from URL
          </button>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
            <Upload className="w-5 h-5" /> Upload File
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm mb-10">
         <div className="relative mb-8">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari media..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
            />
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filtered.map((item) => (
              <div key={item.id} className="group relative bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden hover:border-emerald-500 hover:shadow-2xl transition-all aspect-square">
                <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 p-4 backdrop-blur-sm">
                  <p className="text-white text-[10px] font-black uppercase tracking-widest text-center truncate w-full mb-1">{item.name}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copy(item.url)} 
                      className="p-3 bg-white text-slate-900 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                    >
                      {copied === item.url ? <Plus className="w-5 h-5 rotate-45" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => { if(confirm("Hapus?")) removeFile(item.id); }}
                      className="p-3 bg-white text-rose-600 rounded-2xl hover:bg-rose-50 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="aspect-square rounded-[32px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all cursor-pointer group">
              <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">New Media</span>
            </div>
         </div>
      </div>

      {isUrlModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-6">Add from URL</h3>
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold mb-6 focus:ring-4 focus:ring-emerald-500/10 outline-none"
              placeholder="https://..."
            />
            <div className="flex gap-4">
               <button onClick={() => setIsUrlModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
               <button onClick={handleAddUrl} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20">Add Media</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
