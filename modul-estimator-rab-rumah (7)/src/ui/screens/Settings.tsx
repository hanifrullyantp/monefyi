import { useState } from "react";
import { AlertTriangle, Bot, Check, Eye, EyeOff, KeyRound, Lock, ReceiptText, RefreshCw, SlidersHorizontal, Sparkles, Wallet } from "lucide-react";
import { MaterialFactors } from "../MaterialFactors";
import { DEFAULT_SETTINGS } from "../../data/config";
import { rupiah } from "../format";
import { AIProviderGuardNote } from "./parts";
import { Badge, Button, Card, Field, Modal, inputClass } from "../components";
import { ScreenTitle } from "../Shell";
import { useEstimator, useRab } from "../context";
import { cn } from "../../utils/cn";

export function SettingsScreen() {
  const { state, updateSettings, resetSamples, projects, toast } = useEstimator();
  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const settings = state.settings;
  const sampleProject = projects.find((project) => !project.archived) ?? null;
  const { rab: sample } = useRab(sampleProject);

  const numberSet = (key: "overheadPercent" | "profitPercent" | "ppnPercent" | "priceStaleMonths", value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const max = key === "ppnPercent" || key === "priceStaleMonths" ? 100 : 50;
    updateSettings({ [key]: Math.round(Math.max(0, Math.min(max, numeric))) });
  };

  return (
    <div className="max-w-4xl">
      <ScreenTitle title="Pengaturan" subtitle="Parameter ini memengaruhi hitungan engine deterministik dan seluruh RAB. Disimpan lokal di perangkat." right={<Badge tone="green"><Check className="h-2.5 w-2.5" /> tersimpan otomatis</Badge>} />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef8f2] text-accent"><Wallet className="h-4 w-4" /></span><div><p className="text-[12px] font-extrabold text-ink">Overhead, profit & PPN</p><p className="text-[9px] text-label">Uang integer · total output selalu dirinci</p></div></div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Overhead" hint="%"><input aria-label="Overhead persen" type="number" value={settings.overheadPercent} onChange={(event) => numberSet("overheadPercent", event.target.value)} className={inputClass} /></Field>
            <Field label="Profit" hint="%"><input aria-label="Profit persen" type="number" value={settings.profitPercent} onChange={(event) => numberSet("profitPercent", event.target.value)} className={inputClass} /></Field>
            <Field label="PPN" hint="%"><input aria-label="PPN persen" type="number" value={settings.ppnPercent} onChange={(event) => numberSet("ppnPercent", event.target.value)} className={inputClass} /></Field>
            <Field label="Harga basi" hint="bulan"><input aria-label="Batas harga basi bulan" type="number" value={settings.priceStaleMonths} onChange={(event) => numberSet("priceStaleMonths", event.target.value)} className={inputClass} /></Field>
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-bold text-[#405160]">Mode overhead</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([{ id: "rekap", label: "Rekap", note: "overhead jadi baris" }, { id: "dalam_harga", label: "Dalam harga", note: "masuk harga satuan" }] as const).map((mode) => <button key={mode.id} onClick={() => updateSettings({ overheadMode: mode.id })} aria-pressed={settings.overheadMode === mode.id} className={cn("min-h-[52px] rounded-xl border px-3 py-2 text-left", settings.overheadMode === mode.id ? "border-accent bg-[#eef8f2]" : "border-line bg-white hover:border-[#bfd8cc]")}><span className="flex items-center gap-1 text-[10.5px] font-bold text-ink">{settings.overheadMode === mode.id && <Check className="h-3 w-3 text-accent" />}{mode.label}</span><span className="mt-0.5 block text-[8.5px] text-label">{mode.note}</span></button>)}
            </div>
          </div>
          {sample && <div className="mt-3 rounded-xl border border-line bg-[#fbfdfc] p-3"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.05em] text-label">Dampak ke contoh</p><Badge tone="neutral">{sample.label}</Badge></div><p className="mt-1 text-[15px] font-extrabold text-ink">{rupiah(sample.total)}</p><p className="text-[9px] text-muted">Harga jual sebelum PPN {rupiah(sample.rap.sellingPrice)} · PPN {rupiah(sample.ppn)}</p></div>}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff6ff] text-finance"><SlidersHorizontal className="h-4 w-4" /></span><div><p className="text-[12px] font-extrabold text-ink">Ambang & data</p><p className="text-[9px] text-label">Akses data contoh dan verifikasi</p></div></div>
          <p className="text-[12px] leading-5 text-muted">Label RAB DETAIL muncul otomatis bila seluruh {12} variabel penting dikonfirmasi dan semua baris punya analisis. Tidak ada ambang “akurasi” buatan.</p>
          <div className="mt-3 space-y-2">
            <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5", settings.sampleMode ? "border-[#f5dfb0] bg-[#fffaf0]" : "border-[#c9e7da] bg-[#f4fbf7]")}>
              <AlertTriangle className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", settings.sampleMode ? "text-warning" : "text-accent")} />
              <div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-ink">Mode data contoh {settings.sampleMode ? "aktif" : "nonaktif"}</p><p className="mt-0.5 text-[8.5px] leading-4 text-muted">Banner wajib tetap tampil selama belum ada harga terverifikasi. Saat ini {state.catalog.komponen.filter((k) => !/contoh/i.test(k.sumber)).length} dari {state.catalog.komponen.length} komponen bersumber non-contoh; {state.catalog.analisis.filter((a) => a.keyakinan === "terverifikasi").length} analisis terverifikasi.</p></div>
              <button disabled aria-label="Mode data contoh terkunci sampai ada sumber terverifikasi" className="mt-0.5 text-label"><Lock className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-[#fbfdfc] px-3 py-2.5 text-[9px]"><span className="text-muted">Katalog</span><strong className="text-ink">{state.catalog.komponen.length} komponen · {state.catalog.analisis.length} analisis</strong></div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-[#fbfdfc] px-3 py-2.5 text-[9px]"><span className="text-muted">Penyimpanan</span><strong className="text-ink">IndexedDB · Dexie</strong></div>
          </div>
          <div className="mt-3 flex gap-2"><Button variant="secondary" size="sm" onClick={() => updateSettings({ ...DEFAULT_SETTINGS, aiKey: settings.aiKey })}><RefreshCw className="h-3 w-3" /> Default parameter</Button><Button variant="danger" size="sm" onClick={() => setResetOpen(true)}>Atur ulang data contoh</Button></div>
        </Card>

        <MaterialFactors />
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#6d28d9]"><Bot className="h-4 w-4" /></span><div><p className="text-[13px] font-extrabold text-ink">Engine & AI</p><p className="text-[11px] text-label">UI hanya bergantung pada EngineClient. Mode lokal = engine di browser; mode remote = server /v1 (belum aktif).</p></div></div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {([{ id: "local", label: "Lokal (browser)", note: "engine & data di perangkat ini" }, { id: "remote", label: "Remote (server)", note: "belum aktif — butuh URL /v1" }] as const).map((m) => <button key={m.id} onClick={() => updateSettings({ engineMode: m.id })} aria-pressed={settings.engineMode === m.id} className={cn("min-h-[56px] rounded-xl border p-3 text-left", settings.engineMode === m.id ? "border-accent bg-[#eef8f2]" : "border-line bg-white")}><span className="flex items-center gap-1 text-[12px] font-extrabold text-ink">{settings.engineMode === m.id && <Check className="h-3.5 w-3.5 text-accent" />}{m.label}</span><span className="block text-[11px] text-label">{m.note}</span></button>)}
          </div>
          {settings.engineMode === "remote" ? (
            <div className="mt-3 space-y-2">
              <Field label="URL engine server" htmlFor="remote-url"><input id="remote-url" value={settings.remoteUrl} onChange={(e) => updateSettings({ remoteUrl: e.target.value })} placeholder="https://api.contoh.id" className={inputClass} /></Field>
              <p className="rounded-xl border border-[#dbeafe] bg-[#f6f9ff] px-3 py-2 text-[11px] leading-4 text-[#1e40af]">Pada mode remote, AI berjalan di server — tidak ada API key di browser. Bila server belum tersedia, layar akan menampilkan error engine (bukan angka palsu).</p>
            </div>
          ) : (
            <>
              <p className="mb-1.5 mt-3 text-[12px] font-bold text-[#405160]">Penyedia AI (mode lokal)</p>
              <div className="grid gap-1.5 sm:grid-cols-3">
                {([{ id: "mock", label: "Aturan bahasa lokal", note: "default · tanpa jaringan" }, { id: "openai", label: "OpenAI-compatible", note: "pakai API key" }, { id: "anthropic", label: "Anthropic", note: "pakai API key" }] as const).map((pr) => <button key={pr.id} onClick={() => updateSettings({ aiProvider: pr.id, aiModel: pr.id === "mock" ? "mock-deterministik" : pr.id === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini" })} aria-pressed={settings.aiProvider === pr.id} className={cn("min-h-[56px] rounded-xl border p-3 text-left", settings.aiProvider === pr.id ? "border-[#c4b5fd] bg-[#f8f6ff]" : "border-line bg-white")}><span className="flex items-center gap-1 text-[12px] font-extrabold text-ink">{settings.aiProvider === pr.id && <Check className="h-3.5 w-3.5 text-[#7c3aed]" />}{pr.label}</span><span className="block text-[11px] text-label">{pr.note}</span></button>)}
              </div>
              {settings.aiProvider !== "mock" && (
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <Field label="Model AI" htmlFor="ai-model"><input id="ai-model" value={settings.aiModel} onChange={(e) => updateSettings({ aiModel: e.target.value })} className={inputClass} /></Field>
                  <Field label="API key" hint={settings.aiKey ? `tersimpan (…${settings.aiKey.slice(-4)})` : "belum ada"} htmlFor="ai-key">
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-label" />
                      <input id="ai-key" type={showKey ? "text" : "password"} value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} className={cn(inputClass, "pl-9 pr-28")} placeholder="Masukkan API key baru" autoComplete="off" />
                      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5">
                        <button type="button" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? "Sembunyikan" : "Tampilkan"} className="flex h-9 w-9 items-center justify-center rounded-md text-label">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                        <Button size="sm" onClick={() => { if (keyDraft.trim()) { updateSettings({ aiKey: keyDraft.trim() }); setKeyDraft(""); toast("API key disimpan di browser"); } }}>Simpan</Button>
                      </div>
                    </div>
                  </Field>
                  <p className="sm:col-span-2 flex items-start gap-1.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[11px] leading-4 text-[#92400e]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> API key disimpan di penyimpanan browser (IndexedDB) perangkat ini dan dikirim langsung ke penyedia. Siapa pun yang memakai perangkat/profil browser ini dapat membacanya. Untuk produksi gunakan mode remote. {settings.aiKey && <button className="ml-1 underline" onClick={() => updateSettings({ aiKey: "" })}>Hapus key</button>}</p>
                </div>
              )}
            </>
          )}
          <div className="mt-3"><AIProviderGuardNote /></div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f6f3] text-accent"><ReceiptText className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><p className="text-[11.5px] font-extrabold text-ink">Cara pembulatan, secara eksplisit</p><p className="mt-1 text-[10px] leading-5 text-muted">Harga satuan dibulatkan ke rupiah integer per item. Volume dibulatkan dua desimal. Jumlah baris = round(volume × harga satuan). Subtotal = jumlah baris. RAP mencakup biaya langsung, tak langsung, dan kontingensi. PPN dihitung dari harga jual sebelum pajak. Tidak ada angka pecahan rupiah di output.</p></div>
            <Badge tone="green"><Sparkles className="h-2.5 w-2.5" /> AI tidak menghitung</Badge>
          </div>
        </Card>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Atur ulang seluruh data?" description="Proyek, harga, koreksi, dan riwayat impor akan kembali ke seed contoh. Tindakan ini tidak bisa dibatalkan." footer={<div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setResetOpen(false)}>Batal</Button><Button variant="danger" size="sm" onClick={() => { resetSamples(); setResetOpen(false); }}>Ya, atur ulang</Button></div>}>
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-[10px] leading-5 text-[#991b1b]"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Ekspor cadangan JSON terlebih dahulu lewat Menu → Impor/Ekspor bila ingin menyimpan data.</div>
      </Modal>
    </div>
  );
}
