import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Target, Archive, ArrowLeft, ArrowUpRight, BarChart3, BookOpen, ChevronLeft, Command, Database, FilePlus2, FolderSearch,
  HelpCircle, Import, LayoutGrid as MenuIcon, Plus, Search, Settings as SettingsIcon, Sparkles, X,
} from "lucide-react";
import { useEstimator, type ScreenName } from "./context";
import type { EstimatorModuleProps } from "../data/types";
import { Button, DataBanner, IconButton, ToastStack } from "./components";
import { cn } from "../utils/cn";

function useFocusEventSearch() {
  useEffect(() => {
    const handler = () => {
      const input = document.getElementById("project-search");
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.addEventListener("estimator:focus-search", handler);
    return () => window.removeEventListener("estimator:focus-search", handler);
  }, []);
}

export function BackChip({ label = "Proyek", onClick }: { label?: string; onClick?: () => void }) {
  const { goHome } = useEstimator();
  return (
    <button
      onClick={onClick ?? goHome}
      className="group inline-flex min-h-[36px] items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12px] font-bold text-muted transition-colors hover:text-ink"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white transition-colors group-hover:border-[#c4d5cd]"><ChevronLeft className="h-3.5 w-3.5" /></span>
      {label}
    </button>
  );
}

export function ScreenTitle({ title, subtitle, right, back = true, backLabel }: { title: string; subtitle?: string; right?: ReactNode; back?: boolean; backLabel?: string }) {
  return (
    <div className="mb-5">
      {back && <div className="mb-3"><BackChip label={backLabel} /></div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-muted sm:text-[13px]">{subtitle}</p>}
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </div>
  );
}

const menuItems: { id: ScreenName | "home" | "new" | "exit"; label: string; description: string; icon: typeof Plus; tone: string; shortcut?: string }[] = [
  { id: "new", label: "Proyek baru", description: "Mulai dari satu kalimat", icon: FilePlus2, tone: "bg-[#eaf7f1] text-accent", shortcut: "N" },
  { id: "home", label: "Cari proyek", description: "Semua draf & RAB", icon: FolderSearch, tone: "bg-[#eff6ff] text-finance", shortcut: "F" },
  { id: "prices", label: "Database harga", description: "Harga & analisis contoh", icon: Database, tone: "bg-[#f5f3ff] text-[#6d28d9]" },
  { id: "transfer", label: "Impor / Ekspor", description: "JSON, CSV, cadangan", icon: Import, tone: "bg-[#fff7ed] text-[#c2410c]" },
  { id: "settings", label: "Pengaturan", description: "Overhead, PPN, AI", icon: SettingsIcon, tone: "bg-[#f1f5f9] text-[#475569]" },
  { id: "lessons", label: "Pelajaran AI", description: "Pola dari koreksimu", icon: BookOpen, tone: "bg-[#fdf2f8] text-[#be185d]" },
  { id: "actuals", label: "Realisasi & kalibrasi", description: "Biaya aktual per paket", icon: BarChart3, tone: "bg-[#ecfeff] text-[#0e7490]" },
  { id: "planner", label: "Planner harga", description: "Target, optimizer, skenario", icon: Target, tone: "bg-[#eef2ff] text-[#4338ca]" },
];

export function ModuleShell({ children, host }: { children: ReactNode; host: EstimatorModuleProps }) {
  const { state, route, activeProject, navigate, goHome, createBlankProject, toasts, dismissToast } = useEstimator();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  useFocusEventSearch();
  useEffect(() => {
    if (menuOpen) {
      setTimeout(() => (menuRef.current?.querySelector('[role="menuitem"]') as HTMLElement | null)?.focus(), 30);
    }
  }, [menuOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setMenuOpen((open) => { if (open) setTimeout(() => fabRef.current?.focus(), 0); return false; });
        setPaletteOpen(false);
      }
    };
    const openPalette = () => setPaletteOpen(true);
    window.addEventListener("estimator:commands", openPalette);
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); window.removeEventListener("estimator:commands", openPalette); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="relative min-h-[100dvh] bg-canvas pb-28">
      <div className="estimator-container mx-auto w-full max-w-[1380px] px-4 pt-3 sm:px-8 lg:px-12">
        {route.name !== "home" && <DataBanner />}
        <main>{children}</main>
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line py-5 text-[10px] text-label">
          <span>froyek / Estimator RAB Rumah</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1"><span className={cn("h-1.5 w-1.5 rounded-full", state.settings.sampleMode ? "bg-warning" : "bg-success")} />{state.settings.sampleMode ? "Mode data contoh" : "Data terverifikasi"}</span>
            <span>Perhitungan deterministik</span>
            <span className="inline-flex items-center gap-1"><Command className="h-3 w-3" /> K untuk perintah</span>
          </div>
        </footer>
      </div>

      <div ref={menuRef} className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
        {menuOpen && (
          <>
            <div className="fixed inset-0 -z-10 bg-[#0f172a]/20 backdrop-blur-[1px] sm:hidden" onClick={() => setMenuOpen(false)} aria-hidden />
            <div role="menu" aria-label="Menu modul" className="pop-in thin-scrollbar absolute bottom-full right-0 mb-3 max-h-[70dvh] w-[min(300px,calc(100vw-32px))] overflow-y-auto origin-bottom-right rounded-[18px] border border-line bg-white p-2 shadow-[0_24px_70px_-20px_rgba(15,23,42,.36)] sm:w-[310px]">
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-label">Menu modul</span>
                <IconButton label="Tutup menu" onClick={() => setMenuOpen(false)} className="h-8 w-8 border-0 bg-[#f4f7f5]"><X className="h-3.5 w-3.5" /></IconButton>
              </div>
              <div className="space-y-0.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        if (item.id === "new") createBlankProject();
                        else if (item.id === "home") {
                          goHome();
                          setTimeout(() => window.dispatchEvent(new CustomEvent("estimator:focus-search")), 220);
                        } else if (item.id === 'planner') {
                          const p = activeProject ?? state.projects.find(p => !p.archived);
                          if (p) navigate({ name: 'planner', projectId: p.id }); else createBlankProject();
                        } else navigate({ name: item.id as ScreenName });
                      }}
                      className="group flex min-h-[48px] w-full items-center gap-3 rounded-xl px-2.5 text-left transition-colors hover:bg-[#f5f8f6]"
                    >
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", item.tone)}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-bold text-ink">{item.label}</span>
                        <span className="block text-[9.5px] font-medium text-label">{item.description}</span>
                      </span>
                      {item.shortcut && <kbd className="rounded border border-line bg-[#f8faf9] px-1.5 text-[9px] font-semibold text-label">{item.shortcut}</kbd>}
                    </button>
                  );
                })}
              </div>
              <div className="my-1.5 border-t border-[#eef2f0]" />
              <div className="grid grid-cols-2 gap-0.5">
                <button onClick={() => { setMenuOpen(false); navigate({ name: "backtest" }); }} className="flex min-h-[38px] items-center gap-1.5 rounded-lg px-2.5 text-[10.5px] font-semibold text-muted hover:bg-[#f5f8f6] hover:text-ink"><BarChart3 className="h-3.5 w-3.5" /> Back-test</button>
                <button onClick={() => { setMenuOpen(false); navigate({ name: "archive" }); }} className="flex min-h-[38px] items-center gap-1.5 rounded-lg px-2.5 text-[10.5px] font-semibold text-muted hover:bg-[#f5f8f6] hover:text-ink"><Archive className="h-3.5 w-3.5" /> Arsip</button>
                <button onClick={() => { setMenuOpen(false); setPaletteOpen(true); }} className="flex min-h-[38px] items-center gap-1.5 rounded-lg px-2.5 text-[10.5px] font-semibold text-muted hover:bg-[#f5f8f6] hover:text-ink"><Command className="h-3.5 w-3.5" /> Perintah</button>
                <button onClick={() => { setMenuOpen(false); navigate({ name: "settings" }); }} className="flex min-h-[38px] items-center gap-1.5 rounded-lg px-2.5 text-[10.5px] font-semibold text-muted hover:bg-[#f5f8f6] hover:text-ink"><HelpCircle className="h-3.5 w-3.5" /> Bantuan</button>
              </div>
              <div className="mt-1.5 rounded-xl bg-[#f6f9f7] px-3 py-2">
                <button onClick={() => { setMenuOpen(false); navigate({ name: "settings" }); }} className="w-full text-left text-[9.5px] font-medium leading-4 text-label hover:text-muted">
                  Pengaturan penyimpanan dan data contoh
                </button>
              </div>
              {host.onNavigateBack && (
                <button onClick={() => { setMenuOpen(false); host.onNavigateBack?.(); }} className="mt-1 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-line text-[10px] font-bold text-muted hover:text-ink">
                  <ChevronLeft className="h-3.5 w-3.5" /> Kembali ke aplikasi utama
                </button>
              )}
            </div>
          </>
        )}
        <button
          ref={fabRef}
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-label="Buka menu modul"
          aria-expanded={menuOpen}
          className="workspace-fab flex h-12 w-12 items-center justify-center rounded-full bg-[#163f32] text-white shadow-[0_10px_28px_-8px_rgba(15,23,42,.5)] transition-transform hover:scale-[1.03] active:scale-[.98] sm:h-[52px] sm:w-auto sm:gap-2 sm:px-4"
        >
          <MenuIcon className="h-5 w-5" />
          <span className="hidden text-[12px] font-bold sm:inline">Menu</span>
        </button>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNewProject={createBlankProject} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <span className="sr-only">Modul Estimator RAB aktif. Gunakan tombol Menu atau Control K.</span>
    </div>
  );
}

function CommandPalette({ open, onClose, onNewProject }: { open: boolean; onClose: () => void; onNewProject: () => void }) {
  const { projects, navigate, goHome } = useEstimator();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo(() => {
    const base = [
      { id: "new", label: "Buat proyek baru", hint: "Mulai RAB dari satu kalimat", icon: Plus, action: () => { onNewProject(); onClose(); } },
      { id: "home", label: "Lihat semua proyek", hint: "Layar awal", icon: FolderSearch, action: () => { goHome(); onClose(); } },
      { id: "prices", label: "Buka database harga", hint: "Harga & analisis", icon: Database, action: () => { navigate({ name: "prices" }); onClose(); } },
      { id: "lessons", label: "Pelajaran AI", hint: "Pola yang dipelajari", icon: Sparkles, action: () => { navigate({ name: "lessons" }); onClose(); } },
      { id: "transfer", label: "Impor / ekspor data", hint: "Cadangan JSON & CSV", icon: Import, action: () => { navigate({ name: "transfer" }); onClose(); } },
      { id: "settings", label: "Pengaturan estimator", hint: "PPN, overhead, AI", icon: SettingsIcon, action: () => { navigate({ name: "settings" }); onClose(); } },
      { id: "backtest", label: "Jalankan back-test", hint: "Ukur error historis", icon: BarChart3, action: () => { navigate({ name: "backtest" }); onClose(); } },
      { id: "archive", label: "Arsip proyek", hint: "Pulihkan proyek", icon: Archive, action: () => { navigate({ name: "archive" }); onClose(); } },
      { id: "actuals", label: "Input realisasi", hint: "Kalibrasi dari biaya aktual", icon: BarChart3, action: () => { navigate({ name: "actuals" }); onClose(); } },
    ];
    const projectCommands = projects.filter((project) => !project.archived).map((project) => ({
      id: project.id,
      label: project.name,
      hint: `${project.model.area} m² · ${project.model.floors} lantai · ${project.status === "detail" ? "RAB detail" : "indikatif"}`,
      icon: FolderSearch,
      action: () => { navigate({ name: "project", projectId: project.id }); onClose(); },
    }));
    return [...base, ...projectCommands];
  }, [goHome, navigate, onClose, onNewProject, projects]);

  const filtered = commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((value) => Math.min(filtered.length - 1, value + 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((value) => Math.max(0, value - 1));
      }
      if (event.key === "Enter" && filtered[active]) {
        event.preventDefault();
        filtered[active].action();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, filtered, active]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#0f172a]/45 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="pop-in w-full max-w-lg overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_30px_90px_-20px_rgba(15,23,42,.5)]">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 text-label" />
          <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="Cari aksi atau proyek…" aria-label="Cari perintah" className="h-13 min-h-[52px] flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-label" />
          <kbd className="rounded border border-line bg-[#f7f9f8] px-1.5 py-0.5 text-[9px] font-bold text-label">Esc</kbd>
        </div>
        <div className="thin-scrollbar max-h-[52dvh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-muted">Tidak ada hasil untuk “{query}”. Coba “proyek” atau “harga”.</div>
          ) : filtered.map((command, index) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                onMouseEnter={() => setActive(index)}
                onClick={command.action}
                className={cn("flex min-h-[50px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors", index === active ? "bg-[#eef7f2]" : "hover:bg-[#f7faf8]")}
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", index === active ? "bg-white text-accent shadow-sm" : "bg-[#f4f7f5] text-muted")}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-ink">{command.label}</span>
                  <span className="block truncate text-[10px] text-label">{command.hint}</span>
                </span>
                {index === active && <ArrowUpRight className="h-3.5 w-3.5 text-accent" />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-[#fbfdfc] px-4 py-2.5 text-[9px] text-label">
          <span>↑↓ pilih · Enter buka</span>
          <span className="inline-flex items-center gap-1"><Command className="h-3 w-3" /> K</span>
        </div>
      </div>
    </div>
  );
}

export function StickyFloatingActions({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[86px] sm:hidden"><div className="pointer-events-auto">{children}</div></div>;
}

export function BackToProjectsInline({ label = "Kembali ke proyek" }: { label?: string }) {
  const { goHome } = useEstimator();
  return <Button variant="ghost" size="sm" onClick={goHome}><ArrowLeft className="h-3.5 w-3.5" /> {label}</Button>;
}

export type PaletteContext = { open: boolean; onClose: () => void; onNewProject: () => void };
export function openSearchEvent() {
  window.dispatchEvent(new CustomEvent("estimator:focus-search"));
}
