"use client";

import { useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import {
  ShoppingBag,
  TrendingUp,
  MessageCircle,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  Activity,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function FunnelAovPanel() {
  const {
    orderBumpConfig,
    updateOrderBumpConfig,
    upsellConfig,
    updateUpsellConfig,
    abandonedLeads,
    markLeadFollowedUp,
    capiStatus,
  } = useMarketingStore();

  const [savingNotice, setSavingNotice] = useState<string | null>(null);

  const showSaved = (msg: string) => {
    setSavingNotice(msg);
    setTimeout(() => setSavingNotice(null), 3000);
  };

  const handleSendWaFollowup = (phone: string, name: string, product: string, leadId: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);

    const text = encodeURIComponent(
      `Halo ${name}, saya dari tim Monefyi Estimator. Kami melihat Anda sempat membuka penawaran paket ${product} tapi proses checkoutnya belum selesai.\n\nApakah ada kendala pembayaran atau ada pertanyaan seputar fitur yang ingin didiskusikan? Lisensi promo khusus Anda masih kami amankan hari ini.`
    );

    window.open(`https://wa.me/${clean}?text=${text}`, "_blank");
    markLeadFollowedUp(leadId);
  };

  return (
    <div className="space-y-6">
      {/* Scale Banner Header */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SCALE.CO.ID BEST PRACTICE
              </span>
              <span className="text-xs text-slate-400">
                AOV Multiplier &amp; Zero Tracking Loss
              </span>
            </div>
            <h2 className="text-lg font-black text-white">
              Lipatgandakan Profit &amp; Amankan Konversi Tanpa Naikkan Biaya Iklan
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Saat CPP (Cost Per Purchase) Meta Ads melonjak, strategi terbaik adalah
              menaikkan <strong>Average Order Value (AOV)</strong> lewat Order Bump &amp; OTO
              serta menekan kebocoran data dengan <strong>Meta Conversions API (CAPI)</strong>.
            </p>
          </div>
        </div>

        {savingNotice && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            {savingNotice}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Order Bump Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Order Bump di Checkout
                </h3>
                <p className="text-[11px] text-slate-400">
                  Add-on 1 klik centang di formulir pembayaran
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={orderBumpConfig.enabled}
                onChange={(e) => {
                  updateOrderBumpConfig({ enabled: e.target.checked });
                  showSaved("Status Order Bump diperbarui");
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Judul Penawaran Bump (Call-out)
              </label>
              <input
                type="text"
                value={orderBumpConfig.headline}
                onChange={(e) => updateOrderBumpConfig({ headline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Deskripsi Singkat Manfaat
              </label>
              <textarea
                rows={2}
                value={orderBumpConfig.description}
                onChange={(e) => updateOrderBumpConfig({ description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Harga Add-on (IDR)
                </label>
                <input
                  type="number"
                  value={orderBumpConfig.price}
                  onChange={(e) =>
                    updateOrderBumpConfig({ price: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Harga Normal Coret (IDR)
                </label>
                <input
                  type="number"
                  value={orderBumpConfig.originalPrice}
                  onChange={(e) =>
                    updateOrderBumpConfig({
                      originalPrice: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Live Checkout Preview */}
            <div className="mt-3 p-3 bg-amber-950/30 border-2 border-dashed border-amber-600/60 rounded-2xl">
              <div className="text-[10px] uppercase font-black tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live Preview Tampilan di Halaman Checkout:
              </div>
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 mt-0.5 accent-amber-500 rounded"
                />
                <div>
                  <div className="text-xs font-extrabold text-white">
                    {orderBumpConfig.headline}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {orderBumpConfig.description}
                  </div>
                  <div className="text-xs font-black text-amber-400 mt-1">
                    Hanya +Rp {orderBumpConfig.price.toLocaleString("id-ID")}{" "}
                    <span className="line-through text-slate-500 text-[10px] font-normal">
                      Rp {orderBumpConfig.originalPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Post-Purchase Upsell / OTO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Post-Purchase Upsell (OTO)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ditawarkan otomatis tepat setelah pembayaran pertama sukses
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={upsellConfig.enabled}
                onChange={(e) => {
                  updateUpsellConfig({ enabled: e.target.checked });
                  showSaved("Status Upsell diperbarui");
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Headline OTO
              </label>
              <input
                type="text"
                value={upsellConfig.headline}
                onChange={(e) => updateUpsellConfig({ headline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Produk Upsell
              </label>
              <input
                type="text"
                value={upsellConfig.productName}
                onChange={(e) => updateUpsellConfig({ productName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Harga Upsell Spesial (IDR)
                </label>
                <input
                  type="number"
                  value={upsellConfig.price}
                  onChange={(e) =>
                    updateUpsellConfig({ price: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Harga Asli Coret (IDR)
                </label>
                <input
                  type="number"
                  value={upsellConfig.originalPrice}
                  onChange={(e) =>
                    updateUpsellConfig({ originalPrice: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-purple-300">
                Fitur Eksklusif OTO:
              </span>
              <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                {upsellConfig.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Meta Conversions API (CAPI) & Redundancy Health */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-black text-white">
                Meta Conversions API (CAPI) Health &amp; Server-Side Redundancy
              </h3>
              <p className="text-[11px] text-slate-400">
                Mengirimkan sinyal ganda (Browser + Server) untuk mengatasi iOS 14 &amp; AdBlock
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              CAPI Aktif: EMQ {capiStatus.eventMatchQuality}/10 (Excellent)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">Pixel ID Terpasang</div>
            <div className="font-mono text-xs font-bold text-white mt-0.5">
              {capiStatus.pixelId}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">Event Server (24 Jam)</div>
            <div className="font-mono text-xs font-bold text-emerald-400 mt-0.5">
              {capiStatus.serverEvents24h} Events
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">Event Browser (24 Jam)</div>
            <div className="font-mono text-xs font-bold text-blue-400 mt-0.5">
              {capiStatus.browserEvents24h} Events
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">Data Redundancy Rate</div>
            <div className="font-mono text-xs font-bold text-purple-400 mt-0.5">
              {capiStatus.redundancyRate}% (Anti Bocor)
            </div>
          </div>
        </div>
      </div>

      {/* 4. Abandoned Checkout Recovery */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-black text-white">
                Penyelamat Transaksi Gagal (Abandoned Checkout Recovery)
              </h3>
              <p className="text-[11px] text-slate-400">
                Calon pembeli yang sudah mengisi kontak di checkout tapi belum bayar
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {abandonedLeads.filter((l) => l.followUpStatus === "pending").length} Tertunda
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Nama Pembeli</th>
                <th className="py-2.5 px-3">Produk Diminati</th>
                <th className="py-2.5 px-3">Potensi Omset</th>
                <th className="py-2.5 px-3">Waktu Drop-off</th>
                <th className="py-2.5 px-3">Status Follow-up</th>
                <th className="py-2.5 px-3">Aksi Pemulihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {abandonedLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3">
                    <div className="font-bold text-white">{lead.name}</div>
                    <div className="text-[10px] text-slate-400">{lead.phone}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-200">
                    {lead.product}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                    Rp {lead.potentialValue.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-3 text-slate-400">{lead.timestamp}</td>
                  <td className="py-3 px-3">
                    {lead.followUpStatus === "recovered" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ✅ Pulih (Sudah Bayar)
                      </span>
                    ) : lead.followUpStatus === "sent" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        📩 Pesan Terkirim
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        ⏳ Menunggu Follow-up
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() =>
                        handleSendWaFollowup(
                          lead.phone,
                          lead.name,
                          lead.product,
                          lead.id
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-sm"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Follow-up WA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

