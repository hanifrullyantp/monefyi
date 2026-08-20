"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, RotateCcw, Edit3, Info, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export default function KontenPage() {
  const { content, save, updateSection } = useContentStore();
  const [activeTab, setActiveTab] = useState("Hero & video");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [heroData, setHeroData] = useState({
    badge: "WOCENSA",
    titleLine1: "Waterproof",
    titleAccent: "Kitchen Set",
    subtitle: "1x buat, pakai selamanya",
    description: "Kitchen set tahan air = dapur bunda bebas rayap, warna awet, dan tahan lama",
    primaryCta: "KONSULTASI WA",
    secondaryCta: "LIHAT KEUNGGULAN",
    primaryCtaHref: "/pricelist",
    secondaryCtaHref: "#solusi",
    videoUrl: "https://youtube.com/shorts/Vlw6rBtOkC8",
  });

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 500);
  };

  const tabs = ["Hero & video", "Problem", "Solusi", "Galeri proyek", "Detail produk", "Proses (5 step)", "Bonus", "Harga & promo", "CTA & sticky"];

  return (
    <div className="max-w-6xl pb-20">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-3xl font-extrabold text-slate-900">Konten landing (visual)</h2>
      </div>
      <p className="text-slate-500 text-sm mb-8 leading-relaxed">
        Edit seperti CMS: unggah gambar, tempel URL YouTube, tanpa menyentuh JSON. Untuk tabel perbandingan, urgency HTML, dan halaman kompleks lainnya gunakan <Link href="/admin/konten-json" className="text-blue-600 font-bold hover:underline">mode JSON lanjutan</Link>.
      </p>

      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleSave} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg">Simpan perubahan</button>
        <button className="text-slate-400 hover:text-slate-600 text-sm underline decoration-slate-200">tutup pesan</button>
        <SaveIndicator status={saveStatus} className="ml-auto" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
              activeTab === t ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm">
        {activeTab === "Hero & video" && (
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">BADGE ATAS</label>
              <input type="text" value={heroData.badge} onChange={e => setHeroData({...heroData, badge: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">JUDUL BARIS 1</label>
                <input type="text" value={heroData.titleLine1} onChange={e => setHeroData({...heroData, titleLine1: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">JUDUL AKSEN (WARNA EMAS)</label>
                <input type="text" value={heroData.titleAccent} onChange={e => setHeroData({...heroData, titleAccent: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">SUBJUDUL</label>
              <input type="text" value={heroData.subtitle} onChange={e => setHeroData({...heroData, subtitle: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">DESKRIPSI</label>
              <textarea value={heroData.description} onChange={e => setHeroData({...heroData, description: e.target.value})} rows={3} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">TOMBOL UTAMA</label>
                <input type="text" value={heroData.primaryCta} onChange={e => setHeroData({...heroData, primaryCta: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">TOMBOL SEKUNDER</label>
                <input type="text" value={heroData.secondaryCta} onChange={e => setHeroData({...heroData, secondaryCta: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">LINK TOMBOL UTAMA (HREF)</label>
              <input type="text" value={heroData.primaryCtaHref} onChange={e => setHeroData({...heroData, primaryCtaHref: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
              <p className="text-[10px] text-slate-400 mt-2">Disarankan: https://www.intero.id/#bonus (tab sama). Hanya #bonus/#harga = scroll di halaman ini. wa.me = scroll ke harga. URL luar: tab baru.</p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">LINK TOMBOL SEKUNDER (HREF)</label>
              <input type="text" value={heroData.secondaryCtaHref} onChange={e => setHeroData({...heroData, secondaryCtaHref: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">VIDEO HERO (YOUTUBE ATAU TIKTOK)</label>
              <input type="text" value={heroData.videoUrl} onChange={e => setHeroData({...heroData, videoUrl: e.target.value})} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
              <p className="text-[10px] text-slate-400 mt-2">YouTube: watch / Shorts. TikTok: URL halaman video (bukan vm.tiktok.com). Kosongkan bila hanya gambar.</p>
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">TEKS KECIL DI BAWAH VIDEO / THUMBNAIL</label>
              <input type="text" placeholder="Masukkan teks kecil..." className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
