import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ArchiveRestore, CheckCircle2, ClipboardPaste, Download, FileJson, FileSpreadsheet, FileUp, History, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";
import type { AppSettings, Komponen, Project } from "../../data/types";
import { komponenSchema } from "../../data/schema";
import { migratePayload, validateProject } from "../../data/schema";
import { useEstimator } from "../context";
import { Badge, Button, Card, EmptyState, Modal } from "../components";
import { ScreenTitle } from "../Shell";
import { downloadText, priceCsv, projectJsonEnvelope } from "../../integration/exporters";
import { formatDate, rupiah } from "../format";
import { cn } from "../../utils/cn";
import { StatusNote } from "./parts";
import { AhspImportWizard, DatasetStatusCard } from "./AhspImport";

interface ParsedImport {
  projects: Project[];
  prices: Komponen[];
  errors: string[];
  warnings: string[];
  migrations: string[];
  kind: "json" | "csv";
  settings?: unknown;
}

const TEMPLATE = JSON.stringify({
  schemaVersion: 1,
  panduan: "Isi projects dengan objek proyek sesuai MODEL_SPEC.md. komponen bersifat opsional. Impor tidak menimpa sebelum konfirmasi.",
  projects: [],
  komponen: [],
}, null, 2);

export function TransferScreen() {
  const { state, applyImport, rollbackImport, updateSettings, toast } = useEstimator();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [mode, setMode] = useState<"gabung" | "ganti">("gabung");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [ahspOpen, setAhspOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = (content: string, name: string) => {
    const isCsv = name.toLowerCase().endsWith(".csv") || (!content.trim().startsWith("{") && /nama\s*[;,]/i.test(content.slice(0, 300)));
    try {
      if (isCsv) {
        const rows = parseCsv(content);
        if (!rows.length) throw new Error("CSV kosong atau header tidak dikenali.");
        const header = rows[0].map((cell) => cell.toLowerCase());
        const col = (n: string) => header.indexOf(n);
        if (["kode", "uraian", "jenis", "satuan", "harga"].some((n) => col(n) < 0)) throw new Error("Header CSV wajib: kode, uraian, jenis, satuan, harga (opsional: wilayah, tanggal_berlaku, sumber).");
        const prices: Komponen[] = [];
        const errors: string[] = [];
        rows.slice(1).forEach((row, index) => {
          const candidate = {
            kode: row[col("kode")], uraian: row[col("uraian")], jenis: row[col("jenis")], satuan: row[col("satuan")],
            harga: Math.round(Number(String(row[col("harga")] ?? "").replace(/\./g, "").replace(",", "."))),
            wilayah: (col("wilayah") >= 0 && row[col("wilayah")]) || "Yogyakarta",
            tanggalBerlaku: (col("tanggal_berlaku") >= 0 && row[col("tanggal_berlaku")]) || new Date().toISOString().slice(0, 10),
            sumber: (col("sumber") >= 0 && row[col("sumber")]) || "Impor CSV – belum diverifikasi",
          };
          const ok = komponenSchema.safeParse(candidate);
          if (ok.success) prices.push(ok.data as Komponen);
          else errors.push(`Baris ${index + 2}: ${ok.error.issues[0].path.join(".")} ${ok.error.issues[0].message}`);
        });
        setParsed({ projects: [], prices, errors, warnings: ["Komponen tanpa kolom sumber diberi sumber “Impor CSV – belum diverifikasi”."], migrations: [], kind: "csv" });
        if (!prices.length) toast("Tidak ada baris valid", "Semua baris ditolak. Perbaiki lalu coba lagi.", "danger");
        return;
      }
      const raw = JSON.parse(content) as unknown;
      const migrated = migratePayload(raw);
      const object = migrated.data as Record<string, unknown>;
      const items = Array.isArray(object.projects) ? object.projects : object.projects ? [object.projects] : [];
      const projects: Project[] = [];
      const errors: string[] = [];
      items.forEach((item, index) => {
        const result = validateProject(item);
        if (result.ok) projects.push(result.data);
        else errors.push(...result.errors.map((message) => `Proyek #${index + 1} — ${message}`));
      });
      const rawPrices = Array.isArray(object.komponen) ? object.komponen : [];
      const prices: Komponen[] = [];
      rawPrices.forEach((item, index) => {
        const ok = komponenSchema.safeParse(item);
        if (ok.success) prices.push(ok.data as Komponen);
        else errors.push(`Komponen #${index + 1}: ${ok.error.issues[0].path.join(".")} ${ok.error.issues[0].message}`);
      });
      const warnings: string[] = [];
      if (!projects.length && !prices.length) warnings.push("Tidak ada proyek atau harga valid yang bisa diimpor.");
      if (projects.some((project) => project.model.area > 300)) warnings.push("Ada proyek di atas 300 m²; scope modul akan menandainya perlu review.");
      setParsed({ projects, prices, errors, warnings, migrations: migrated.notes, kind: "json", settings: object.settings });
    } catch (error) {
      setParsed({ projects: [], prices: [], errors: [error instanceof Error ? error.message : "Payload tidak valid."], warnings: [], migrations: [], kind: isCsv ? "csv" : "json" });
    }
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) { toast("Berkas terlalu besar", "Maksimum 12 MB untuk modul tanpa backend.", "danger"); return; }
    setFileName(file.name);
    const content = await file.text();
    setText(content);
    parse(content, file.name);
  };

  const canApply = Boolean(parsed && (parsed.projects.length || parsed.prices.length)) && (mode === "gabung" || replaceConfirmed);
  const confirmApply = () => {
    if (!parsed) return;
    applyImport({ projects: parsed.projects, komponen: parsed.prices }, mode);
    if (parsed.settings && typeof parsed.settings === "object") updateSettings(parsed.settings as Partial<AppSettings>);
    setConfirmOpen(false);
    setParsed(null);
    setText("");
    setFileName("");
    setReplaceConfirmed(false);
  };

  const exportAll = () => {
    downloadText(`cadangan-rab-${new Date().toISOString().slice(0, 10)}.json`, projectJsonEnvelope(state.projects, state.catalog.komponen, { settings: state.settings, corrections: state.corrections, versions: state.versions }), "application/json");
    toast("Cadangan diunduh", "Berisi proyek, harga, pengaturan, koreksi, dan versi.");
  };

  const history = useMemo(() => state.importHistory, [state.importHistory]);

  return (
    <div>
      <ScreenTitle title="Impor / Ekspor" subtitle="Dataset AHSP adalah acuan utama perhitungan. Validasi per baris, pratinjau diff, konfirmasi eksplisit, log, dan rollback — semua lokal." right={<Button onClick={() => setAhspOpen(true)}><FileSpreadsheet className="h-4 w-4" /> Impor AHSP</Button>} />
      <div className="mb-3"><DatasetStatusCard /></div>
      <AhspImportWizard open={ahspOpen} onClose={() => setAhspOpen(false)} />
      <div className="grid items-start gap-3 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[12px] font-extrabold text-ink">Impor data</p><p className="text-[9px] text-label">JSON proyek lengkap, JSON harga, atau CSV harga</p></div><Badge tone="amber"><ShieldCheck className="h-2.5 w-2.5" /> tidak menimpa otomatis</Badge></div>
          <button onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void readFile(event.dataTransfer.files[0]); }} className="flex min-h-[112px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#bfd3c9] bg-[#f8fcfa] px-4 py-5 text-center transition-colors hover:border-[#8fc0ac] hover:bg-[#f2faf6]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-accent"><UploadCloud className="h-5 w-5" /></span>
            <span className="text-[11px] font-bold text-ink">Pilih file atau seret ke sini</span>
            <span className="text-[9px] text-label">.json · .csv · maks. 12 MB {fileName && `· ${fileName}`}</span>
          </button>
          <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="sr-only" aria-label="Pilih file impor" onChange={(event) => void readFile(event.target.files?.[0])} />
          <div className="my-3 flex items-center gap-2"><span className="h-px flex-1 bg-line" /><span className="text-[8px] font-bold uppercase tracking-[0.08em] text-label">atau tempel</span><span className="h-px flex-1 bg-line" /></div>
          <label htmlFor="import-text" className="mb-1 block text-[10px] font-bold text-[#405160]">Tempel JSON / CSV</label>
          <textarea id="import-text" value={text} onChange={(event) => setText(event.target.value)} rows={7} className="thin-scrollbar w-full rounded-xl border border-line bg-[#fbfdfc] px-3 py-2.5 font-mono text-[10px] leading-5 text-[#405160] outline-none focus:border-[#a7d7c6]" placeholder='{"schemaVersion":1,"projects":[...]}' spellCheck={false} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" disabled={!text.trim()} onClick={() => parse(text, fileName || "tempel.json")}><ClipboardPaste className="h-3.5 w-3.5" /> Validasi & pratinjau</Button>
            <Button variant="ghost" size="sm" onClick={() => { setText(TEMPLATE); setFileName("template.json"); setParsed(null); downloadText("template-impor.json", TEMPLATE, "application/json"); }}><FileJson className="h-3.5 w-3.5" /> Template kosong</Button>
            <Button variant="ghost" size="sm" onClick={() => { setText(""); setParsed(null); setFileName(""); }}>Bersihkan</Button>
          </div>

          {parsed && (
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-line bg-[#fbfdfc] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10.5px] font-extrabold text-ink">Pratinjau {parsed.kind.toUpperCase()}</p><div className="flex gap-1"><Badge tone={parsed.projects.length ? "green" : "neutral"}>{parsed.projects.length} proyek</Badge><Badge tone={parsed.prices.length ? "green" : "neutral"}>{parsed.prices.length} komponen</Badge></div></div>
                {parsed.projects.length > 0 && <div className="mt-2 space-y-1">{parsed.projects.slice(0, 4).map((project) => <div key={project.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#eef2f0] bg-white px-2.5 py-1.5 text-[9px]"><span className="min-w-0 truncate font-bold text-[#405160]">{project.name}</span><span className="shrink-0 text-label">{project.model.area} m² · {project.model.floors} lantai</span></div>)}</div>}
                {parsed.prices.length > 0 && <div className="mt-2 space-y-1">{parsed.prices.slice(0, 4).map((price) => <div key={price.kode} className="flex items-center justify-between gap-2 rounded-lg border border-[#eef2f0] bg-white px-2.5 py-1.5 text-[9px]"><span className="min-w-0 truncate font-bold text-[#405160]">{price.uraian}</span><span className="shrink-0 text-label">{rupiah(price.harga)}/{price.satuan}</span></div>)}</div>}
                {parsed.projects.length + parsed.prices.length > 8 && <p className="mt-1 text-[8.5px] text-label">+{parsed.projects.length + parsed.prices.length - 8} baris lainnya</p>}
              </div>
              {parsed.errors.length > 0 && <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3"><p className="flex items-center gap-1 text-[10px] font-extrabold text-[#991b1b]"><AlertTriangle className="h-3.5 w-3.5" /> {parsed.errors.length} baris ditolak</p><ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto text-[8.5px] leading-4 text-[#b91c1c]">{parsed.errors.map((error, index) => <li key={index}>• {error}</li>)}</ul></div>}
              {parsed.warnings.map((warning) => <StatusNote key={warning}>{warning}</StatusNote>)}
              {parsed.migrations.map((note) => <StatusNote key={note} tone="blue">{note}</StatusNote>)}
              {canApply || parsed.projects.length + parsed.prices.length > 0 ? (
                <div className="rounded-xl border border-line p-3">
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.05em] text-label">Mode impor</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => { setMode("gabung"); setReplaceConfirmed(false); }} aria-pressed={mode === "gabung"} className={cn("min-h-[48px] rounded-lg border px-3 text-left", mode === "gabung" ? "border-accent bg-[#eef8f2]" : "border-line bg-white")}><span className="text-[10px] font-bold text-ink">Gabung</span><span className="block text-[8px] text-label">ID sama diganti, lain ditambah</span></button>
                    <button onClick={() => { setMode("ganti"); setReplaceConfirmed(false); }} aria-pressed={mode === "ganti"} className={cn("min-h-[48px] rounded-lg border px-3 text-left", mode === "ganti" ? "border-[#fca5a5] bg-[#fef2f2]" : "border-line bg-white")}><span className="text-[10px] font-bold text-ink">Ganti</span><span className="block text-[8px] text-label">Proyek lama diganti</span></button>
                  </div>
                  {mode === "ganti" && <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg bg-[#fef2f2] px-2.5 py-2 text-[9px] leading-4 text-[#991b1b]"><input type="checkbox" checked={replaceConfirmed} onChange={(event) => setReplaceConfirmed(event.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[#b91c1c]" /> Saya paham proyek yang ada akan diganti. Saya bisa rollback setelah impor.</label>}
                  <Button size="sm" className="mt-2 w-full" disabled={!canApply} onClick={() => setConfirmOpen(true)}><ArchiveRestore className="h-3.5 w-3.5" /> Terapkan impor</Button>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <p className="text-[12px] font-extrabold text-ink">Ekspor & cadangan</p>
            <p className="mt-0.5 text-[9px] leading-4 text-label">Backup memuat proyek, harga, pengaturan, koreksi, dan versi. Data sensitif seperti API key tidak disertakan.</p>
            <div className="mt-3 grid gap-1.5">
              <button onClick={exportAll} className="flex min-h-[56px] items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-[#a7d7c6] hover:bg-[#f8fcfa]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef8f2] text-accent"><Download className="h-4 w-4" /></span><span><span className="block text-[10.5px] font-bold text-ink">Cadangan JSON lengkap</span><span className="block text-[8.5px] text-label">{state.projects.length} proyek · {state.catalog.komponen.length} komponen · {formatDate(new Date().toISOString())}</span></span></button>
              <button onClick={() => { downloadText("harga-contoh.csv", priceCsv(state.catalog.komponen), "text/csv;charset=utf-8"); toast("CSV harga diunduh"); }} className="flex min-h-[56px] items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-[#a7d7c6] hover:bg-[#f8fcfa]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff6ff] text-finance"><FileSpreadsheet className="h-4 w-4" /></span><span><span className="block text-[10.5px] font-bold text-ink">CSV harga komponen</span><span className="block text-[8.5px] text-label">Pemisah titik koma, siap Excel</span></span></button>
              <button onClick={() => downloadText("template-impor.json", TEMPLATE, "application/json")} className="flex min-h-[56px] items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-[#a7d7c6] hover:bg-[#f8fcfa]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#6d28d9]"><FileJson className="h-4 w-4" /></span><span><span className="block text-[10.5px] font-bold text-ink">Template JSON kosong</span><span className="block text-[8.5px] text-label">Struktur impor + panduan</span></span></button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><p className="text-[12px] font-extrabold text-ink">Riwayat impor</p><Badge tone="neutral"><History className="h-2.5 w-2.5" /> {history.length}</Badge></div>
            {history.length === 0 ? <EmptyState compact icon={<History className="h-5 w-5" />} title="Belum ada impor" description="Setelah impor valid, snapshot sebelumnya disimpan untuk rollback." /> : <div className="space-y-1.5">{history.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl border border-line bg-[#fbfdfc] px-2.5 py-2"><div className="min-w-0 flex-1"><p className="text-[9.5px] font-bold text-ink">{formatDate(item.at)} · {item.mode}</p><p className="text-[8px] text-label">{item.projects} proyek · {item.prices} harga</p></div><button onClick={() => setRollbackId(item.id)} className="inline-flex min-h-[28px] items-center gap-1 rounded-md border border-line bg-white px-2 text-[8.5px] font-bold text-[#405160] hover:text-accent"><RotateCcw className="h-2.5 w-2.5" /> Rollback</button></div>)}</div>}
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /><p className="text-[11px] font-extrabold text-ink">Format mengikuti JSON Schema</p></div>
            <p className="text-[9px] leading-5 text-muted">Setiap proyek divalidasi terhadap BuildingModel dan schemaVersion. Migrasi v0 → v1 menambahkan <code className="rounded bg-[#f1f5f2] px-1 text-[8px]">ratesLocked</code>, <code className="rounded bg-[#f1f5f2] px-1 text-[8px]">stage</code>, dan <code className="rounded bg-[#f1f5f2] px-1 text-[8px]">answers</code>. Baris yang gagal ditampilkan, tidak ditelan diam-diam.</p>
            <div className="mt-2 flex items-center gap-2 text-[8.5px] font-semibold text-label"><CheckCircle2 className="h-3 w-3 text-success" /> Tidak ada penimpaan tanpa konfirmasi</div>
          </Card>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Terapkan impor?" description={`${parsed?.projects.length ?? 0} proyek dan ${parsed?.prices.length ?? 0} harga akan diimpor dengan mode ${mode}.`} footer={<div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>Batal</Button><Button size="sm" onClick={confirmApply}><FileUp className="h-3.5 w-3.5" /> Ya, impor</Button></div>}>
        <StatusNote>{mode === "ganti" ? "Proyek lama akan diganti. Snapshot sebelum impor disimpan dan dapat di-rollback." : "Proyek dengan ID yang sama akan diperbarui; ID baru ditambahkan."}</StatusNote>
      </Modal>

      <Modal open={Boolean(rollbackId)} onClose={() => setRollbackId(null)} title="Rollback impor?" description="State proyek dan harga kembali ke snapshot sebelum impor terakhir." footer={<div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setRollbackId(null)}>Batal</Button><Button variant="danger" size="sm" onClick={() => { if (rollbackId) rollbackImport(rollbackId); setRollbackId(null); }}>Rollback</Button></div>}>
        <StatusNote>Perubahan yang dibuat setelah impor juga dapat hilang karena state dikembalikan utuh.</StatusNote>
      </Modal>
      <span className="sr-only" aria-live="polite">Impor siap. {parsed ? `${parsed.projects.length} proyek, ${parsed.prices.length} harga` : "Belum ada payload."}</span>
    </div>
  );
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (quoted && content[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if ((char === ";" || char === ",") && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((item) => item.trim())) rows.push(row.map((item) => item.trim()));
      row = [];
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((item) => item.trim())) rows.push(row.map((item) => item.trim()));
  return rows;
}
