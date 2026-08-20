"use client";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Image as ImageIcon, Plus, Trash2, Search, ExternalLink, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const mockImages = [
  { id: 1, url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800", name: "hero-mockup.png", size: "1.2 MB", type: "image/png" },
  { id: 2, url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", name: "dashboard.jpg", size: "850 KB", type: "image/jpeg" },
  { id: 3, url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", name: "analytics-chart.png", size: "420 KB", type: "image/png" },
  { id: 4, url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800", name: "estimator-visual.jpg", size: "1.5 MB", type: "image/jpeg" },
];

export default function MediaPage() {
  const [images, setImages] = useState(mockImages);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filtered = images.filter(img => img.name.toLowerCase().includes(search.toLowerCase()));

  const handleCopy = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Kelola semua gambar dan aset visual"
        actions={
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
            <Plus className="w-4 h-4" />
            Upload Baru
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari gambar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((img) => (
          <div key={img.id} className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <div className="aspect-square overflow-hidden bg-slate-100">
              <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-slate-900 truncate" title={img.name}>{img.name}</p>
              <p className="text-[10px] text-slate-400 mt-1">{img.size} · {img.type.split("/")[1].toUpperCase()}</p>
            </div>

            {/* Overlays */}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handleCopy(img.url, img.id)}
                className="p-2 bg-white text-slate-900 rounded-lg shadow-lg hover:bg-emerald-500 hover:text-white transition-all"
                title="Copy URL"
              >
                {copiedId === img.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white text-slate-900 rounded-lg shadow-lg hover:bg-slate-100 transition-all"
                title="Lihat Full"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => setImages(images.filter(i => i.id !== img.id))}
                className="p-2 bg-white text-red-600 rounded-lg shadow-lg hover:bg-red-50 transition-all"
                title="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
