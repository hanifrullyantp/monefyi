"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Home,
  Menu,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { formatCurrencyFull } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type DemoItem = {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
  unit: "m" | "unit";
  checked: boolean;
};

const PRESETS: Omit<DemoItem, "id" | "checked">[] = [
  { name: "Backsplash — Kitchen set", unitPrice: 600_000, qty: 4, unit: "m" },
  { name: "Kabinet Atas — Kitchen set", unitPrice: 7_500_000, qty: 1, unit: "unit" },
  { name: "Kabinet Bawah — Kitchen set", unitPrice: 8_400_000, qty: 1, unit: "unit" },
  { name: "Top table quartz", unitPrice: 8_200_000, qty: 1, unit: "unit" },
  { name: "Handle & aksesoris", unitPrice: 3_700_000, qty: 1, unit: "unit" },
];

const INITIAL_ITEMS: DemoItem[] = PRESETS.map((p, i) => ({
  ...p,
  id: String(i + 1),
  checked: true,
}));

function lineTotal(item: DemoItem): number {
  return item.unitPrice * item.qty;
}

/** Demo Estimator scrollable — hanya di dalam mockup hero. */
export function HeroEstimatorDemo() {
  const [title, setTitle] = useState("Kitchen set");
  const [client, setClient] = useState("Verita");
  const [items, setItems] = useState<DemoItem[]>(INITIAL_ITEMS);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientPhone, setClientPhone] = useState("+62 812-xxxx");

  const total = useMemo(
    () => items.filter((i) => i.checked).reduce((s, i) => s + lineTotal(i), 0),
    [items],
  );

  const counted = items.filter((i) => i.checked).length;

  const addPreset = (preset: (typeof PRESETS)[number]) => {
    setItems((prev) => [
      ...prev,
      {
        ...preset,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        checked: true,
      },
    ]);
    setPickerOpen(false);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.id !== id)));
  };

  const toggleCheck = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  };

  const setQty = (id: string, qty: number) => {
    const n = Math.max(1, Math.min(99, qty));
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: n } : i)));
  };

  return (
    <PhoneMockup screenHeight={580}>
      <div
        className="relative h-full flex flex-col text-[11px] text-slate-800 overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* App chrome */}
        <header className="shrink-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200/80 px-3 pt-8 pb-2 flex items-center gap-2">
          <button type="button" className="p-1.5 rounded-lg text-slate-600" aria-label="Menu">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
            <BrandLogo variant="mark" size={22} />
            <span className="font-extrabold text-slate-900 tracking-tight">Estimator</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
          </div>
          <button type="button" className="p-1.5 rounded-lg text-slate-500 relative" aria-label="Notifikasi">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          </button>
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
            h
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-24 pt-2 space-y-2.5 custom-scrollbar">
          <article className="rounded-2xl shadow-lg shadow-emerald-900/15 border border-emerald-700/20 overflow-hidden">
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 px-3.5 pt-3 pb-3 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_55%)] pointer-events-none" />
              <div className="relative">
                <span className="inline-flex text-[9px] px-2 py-0.5 rounded-full font-bold bg-white/20 mb-2">
                  WA
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-lg font-black bg-transparent outline-none placeholder:text-white/50 text-white"
                  aria-label="Nama proyek"
                />
                <input
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full text-xs font-semibold bg-transparent outline-none text-white/90 mt-0.5"
                  aria-label="Nama klien"
                />
                <p className="mt-2 text-xl font-black tracking-tight">{formatCurrencyFull(total)}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[9px] font-bold text-white/80 uppercase">
                  <span>{counted} item</span>
                  <span>·</span>
                  <span>Draft</span>
                  <span>·</span>
                  <span>1 hari lalu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white text-emerald-700 font-bold text-xs shadow-md active:scale-[0.98] transition-transform"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Rincian
                </button>
              </div>
            </div>
          </article>

          <button
            type="button"
            onClick={() => setDetailOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 text-xs"
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", detailOpen && "rotate-180")} />
            Detail Project
          </button>

          {detailOpen && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Informasi customer</p>
              <label className="block">
                <span className="text-[10px] text-slate-500">Telepon</span>
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="mt-0.5 w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </label>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Demo — data tidak disimpan. Di app asli, otomatis sync & siap PDF.
              </p>
            </div>
          )}

          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 px-0.5">
              Rincian produk
            </p>
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex gap-2 items-start shadow-sm"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheck(item.id)}
                    className="mt-1 rounded border-slate-300 text-emerald-600"
                    aria-label={`Sertakan ${item.name}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate text-[11px]">{item.name}</p>
                    <p className="text-emerald-700 font-black mt-0.5">{formatCurrencyFull(lineTotal(item))}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {item.unit === "m" ? (
                        <select
                          value={item.qty}
                          onChange={(e) => setQty(item.id, Number(e.target.value))}
                          className="text-[10px] border border-slate-200 rounded-lg px-1.5 py-1 bg-slate-50"
                          aria-label="Panjang meter"
                        >
                          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} m
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-semibold">1 unit</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    aria-label="Hapus rincian"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Floating total + bottom nav */}
        <div className="absolute bottom-14 left-3 right-3 z-10">
          <div className="bg-emerald-600 text-white rounded-2xl px-3 py-2 shadow-xl shadow-emerald-900/30 flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-[10px]">💬</span>
              <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-[10px]">📄</span>
            </div>
            <div className="text-right min-w-0">
              <p className="text-[8px] font-bold uppercase opacity-80">Total penawaran</p>
              <p className="text-sm font-black truncate">{formatCurrencyFull(total)}</p>
            </div>
          </div>
        </div>

        <nav className="shrink-0 absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 px-2 pt-1.5 pb-2 flex items-end justify-around z-10">
          <NavIcon icon={Home} label="Home" />
          <NavIcon icon={Sparkles} label="Estimator" active />
          <div className="-mt-5 flex flex-col items-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[8px] font-bold text-emerald-700 mt-0.5">Monefyi</span>
          </div>
          <NavIcon icon={Wallet} label="Finance" />
          <NavIcon icon={Users} label="HR" />
        </nav>

        {pickerOpen && (
          <div className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] flex items-end">
            <div className="w-full bg-white rounded-t-2xl p-4 max-h-[70%] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-slate-900 text-sm">Tambah dari pricelist</p>
                <button type="button" onClick={() => setPickerOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <ul className="space-y-2">
                {PRESETS.map((p) => (
                  <li key={p.name}>
                    <button
                      type="button"
                      onClick={() => addPreset(p)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
                    >
                      <p className="font-bold text-xs text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                        {formatCurrencyFull(p.unitPrice)}
                        {p.unit === "m" ? " / m" : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </PhoneMockup>
  );
}

function NavIcon({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 pb-0.5", active ? "text-emerald-600" : "text-slate-400")}>
      <Icon className="w-4 h-4" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[8px] font-bold">{label}</span>
    </div>
  );
}
