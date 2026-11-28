import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Database, Download, FileSpreadsheet, FileUp, Loader2, Sparkles, Upload } from "lucide-react";
import type { AhspDataset, Analisis, Komponen, WorkItem } from "../../data/types";
import { analisisSchema, komponenSchema, workItemSchema } from "../../data/schema";
import { useEstimator } from "../context";
import { Badge, Button, Card, Chip, Eyebrow, Field, Modal, inputClass } from "../components";
import { formatDate, rupiah } from "../format";
import { cn } from "../../utils/cn";

type Entity = "komponen" | "analisis" | "workItems";

const FIELDS: Record<Entity, { key: string; label: string; required: boolean; aliases: string[] }[]> = {
  komponen: [
    { key: "kode", label: "Kode", required: true, aliases: ["kode", "code", "id"] },
    { key: "uraian", label: "Uraian", required: true, aliases: ["uraian", "nama", "deskripsi", "description"] },
    { key: "jenis", label: "Jenis (tenaga/bahan/alat)", required: true, aliases: ["jenis", "tipe", "kategori"] },
    { key: "satuan", label: "Satuan", required: true, aliases: ["satuan", "unit"] },
    { key: "harga", label: "Harga", required: true, aliases: ["harga", "harga_dasar", "price"] },
    { key: "wilayah", label: "Wilayah", required: false, aliases: ["wilayah", "region", "kota"] },
    { key: "tanggalBerlaku", label: "Tanggal berlaku", required: false, aliases: ["tanggal_berlaku", "tanggal", "date"] },
    { key: "sumber", label: "Sumber", required: false, aliases: ["sumber", "source"] },
  ],
  analisis: [
    { key: "id", label: "ID analisis", required: true, aliases: ["id", "kode", "kode_analisis"] },
    { key: "uraian", label: "Uraian", required: true, aliases: ["uraian", "pekerjaan", "nama"] },
    { key: "satuan", label: "Satuan", required: true, aliases: ["satuan", "unit"] },
    { key: "komponen", label: "Komponen (kode:koefisien;…)", required: true, aliases: ["komponen", "rincian", "components"] },
    { key: "regulasi", label: "Sumber regulasi", required: false, aliases: ["regulasi", "sumber", "referensi"] },
    { key: "tahun", label: "Tahun", required: false, aliases: ["tahun", "year"] },
  ],
  workItems: [
    { key: "id", label: "ID pekerjaan", required: true, aliases: ["id", "kode"] },
    { key: "paket", label: "Paket", required: true, aliases: ["paket", "package", "kelompok"] },
    { key: "uraian", label: "Uraian", required: true, aliases: ["uraian", "nama"] },
    { key: "satuan", label: "Satuan", required: true, aliases: ["satuan", "unit"] },
    { key: "rumus", label: "Rumus", required: true, aliases: ["rumus", "formula"] },
    { key: "analisisId", label: "ID analisis", required: true, aliases: ["analisis", "analisis_id", "ahsp"] },
  ],
};

const TEMPLATE = `kode;uraian;jenis;satuan;harga;wilayah;tanggal_berlaku;sumber
B.SMN;Semen 50 kg;bahan;sak;68000;Yogyakarta;2026-01-01;Survei toko 2026
T.PKJ;Pekerja;tenaga;OH;115000;Yogyakarta;2026-01-01;Survei upah 2026
`;

interface ParsedRow {
  index: number;
  data: Record<string, unknown> | null;
  errors: string[];
}

export function AhspImportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, importAhsp, toast } = useEstimator();
  const [entity, setEntity] = useState<Entity>("komponen");
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<"gabung" | "ganti">("gabung");
  const [meta, setMeta] = useState({ name: "", year: "", region: "Yogyakarta", effectiveDate: new Date().toISOString().slice(0, 10), source: "" });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseTable = (text: string, name: string) => {
    const clean = text.trim();
    if (!clean) return;
    if (name.endsWith(".json") || clean.startsWith("{") || clean.startsWith("[")) {
      try {
        const json = JSON.parse(clean) as Record<string, unknown> | unknown[];
        const arr = Array.isArray(json) ? json : (json[entity] as unknown[]) ?? [];
        if (!Array.isArray(arr) || !arr.length) throw new Error(`Tidak ada array "${entity}" pada JSON.`);
        const keys = [...new Set(arr.flatMap((r) => Object.keys(r as object)))];
        setHeaders(keys);
        setRows(arr.map((r) => keys.map((k) => String((r as Record<string, unknown>)[k] ?? ""))));
        autoMap(keys);
        setStep(2);
        return;
      } catch (e) {
        toast("JSON tidak valid", e instanceof Error ? e.message : "Periksa format.", "danger");
        return;
      }
    }
    const lines = clean.split(/\r?\n/).filter(Boolean);
    const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
    const head = lines[0].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    setHeaders(head);
    setRows(lines.slice(1).map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""))));
    autoMap(head);
    setStep(2);
  };

  const autoMap = (head: string[]) => {
    const next: Record<string, string> = {};
    for (const field of FIELDS[entity]) {
      const found = head.find((h) => field.aliases.includes(h.toLowerCase().replace(/\s+/g, "_")));
      if (found) next[field.key] = found;
    }
    setMapping(next);
  };

  const colIndex = (key: string) => headers.indexOf(mapping[key] ?? "");
  const cellFor = (row: string[], key: string) => { const i = colIndex(key); return i >= 0 ? row[i] : ""; };

  const parsed = useMemo<ParsedRow[]>(() => {
    if (step < 2) return [];
    return rows.map((row, index) => {
      const errors: string[] = [];
      let data: Record<string, unknown> | null = null;
      if (entity === "komponen") {
        const candidate = {
          kode: cellFor(row, "kode"), uraian: cellFor(row, "uraian"),
          jenis: (cellFor(row, "jenis") || "bahan").toLowerCase(),
          satuan: cellFor(row, "satuan"),
          harga: Math.round(Number(cellFor(row, "harga").replace(/\./g, "").replace(",", ".")) || 0),
          wilayah: cellFor(row, "wilayah") || meta.region,
          tanggalBerlaku: cellFor(row, "tanggalBerlaku") || meta.effectiveDate,
          sumber: cellFor(row, "sumber") || meta.source || "Impor AHSP",
        };
        const ok = komponenSchema.safeParse(candidate);
        if (ok.success) data = ok.data as Record<string, unknown>;
        else errors.push(...ok.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
        if (candidate.harga <= 0) errors.push("harga harus > 0");
      } else if (entity === "analisis") {
        const kompRaw = cellFor(row, "komponen");
        const komponen = kompRaw.split(/[;|]/).map((part) => part.trim()).filter(Boolean).map((part) => {
          const [kode, koef, waste] = part.split(/[:=]/).map((x) => x.trim());
          return { komponenId: kode, koefisien: Number(String(koef ?? "0").replace(",", ".")), ...(waste ? { waste: Number(waste.replace(",", ".")) } : {}) };
        });
        const candidate = {
          id: cellFor(row, "id"), pekerjaanId: cellFor(row, "id"), uraian: cellFor(row, "uraian"), satuan: cellFor(row, "satuan"),
          komponen, sumber: { regulasi: cellFor(row, "regulasi") || meta.source || "Impor AHSP", tahun: cellFor(row, "tahun") ? Number(cellFor(row, "tahun")) : null, halaman: null },
          keyakinan: "terverifikasi" as const,
        };
        const ok = analisisSchema.safeParse(candidate);
        if (ok.success) data = ok.data as Record<string, unknown>;
        else errors.push(...ok.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
        for (const k of komponen) {
          if (!state.catalog.komponen.some((x) => x.kode === k.komponenId) && !rows.some((r) => cellFor(r, "kode") === k.komponenId)) errors.push(`komponen ${k.komponenId} tidak ada di katalog`);
          if (!(k.koefisien > 0)) errors.push(`koefisien ${k.komponenId} harus > 0`);
        }
      } else {
        const candidate = {
          id: cellFor(row, "id"), paket: cellFor(row, "paket"), uraian: cellFor(row, "uraian"), satuan: cellFor(row, "satuan"),
          rumus: cellFor(row, "rumus"), analisisId: cellFor(row, "analisisId"), kelasSumber: "terukur" as const, slots: [], cvVolume: 0.15,
        };
        const ok = workItemSchema.safeParse(candidate);
        if (ok.success) data = ok.data as Record<string, unknown>;
        else errors.push(...ok.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      }
      const dup = rows.findIndex((r, i) => i < index && cellFor(r, entity === "komponen" ? "kode" : "id") === cellFor(row, entity === "komponen" ? "kode" : "id"));
      if (dup >= 0) errors.push(`duplikat kode (baris ${dup + 2})`);
      return { index, data, errors };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mapping, entity, step, meta, state.catalog.komponen]);

  const validRows = parsed.filter((r) => r.data && !r.errors.length);
  const diff = useMemo(() => {
    if (entity === "komponen") {
      const existing = new Map(state.catalog.komponen.map((k) => [k.kode, k]));
      return {
        baru: validRows.filter((r) => !existing.has(String(r.data!.kode))).length,
        ubah: validRows.filter((r) => existing.has(String(r.data!.kode))).length,
        hapus: mode === "ganti" ? state.catalog.komponen.length - validRows.filter((r) => existing.has(String(r.data!.kode))).length : 0,
      };
    }
    if (entity === "analisis") {
      const existing = new Set(state.catalog.analisis.map((a) => a.id));
      return { baru: validRows.filter((r) => !existing.has(String(r.data!.id))).length, ubah: validRows.filter((r) => existing.has(String(r.data!.id))).length, hapus: mode === "ganti" ? state.catalog.analisis.length : 0 };
    }
    const existing = new Set(state.catalog.workItems.map((w) => w.id));
    return { baru: validRows.filter((r) => !existing.has(String(r.data!.id))).length, ubah: validRows.filter((r) => existing.has(String(r.data!.id))).length, hapus: mode === "ganti" ? state.catalog.workItems.length : 0 };
  }, [validRows, entity, state.catalog, mode]);

  const commit = () => {
    setBusy(true);
    try {
      const payload: { komponen?: Komponen[]; analisis?: Analisis[]; workItems?: WorkItem[] } = {};
      if (entity === "komponen") payload.komponen = validRows.map((r) => r.data as unknown as Komponen);
      if (entity === "analisis") payload.analisis = validRows.map((r) => r.data as unknown as Analisis);
      if (entity === "workItems") payload.workItems = validRows.map((r) => r.data as unknown as WorkItem);
      const totalAnalyses = (payload.analisis?.length ?? 0) + (entity === "analisis" ? 0 : state.catalog.analisis.length);
      const verified = state.catalog.analisis.filter((a) => a.keyakinan === "terverifikasi").length + (payload.analisis?.length ?? 0);
      const dataset: AhspDataset = {
        id: `ds-${Date.now()}`,
        name: meta.name.trim() || fileName || "Dataset impor",
        year: meta.year ? Number(meta.year) : null,
        region: meta.region,
        effectiveDate: meta.effectiveDate,
        source: meta.source || "Impor pengguna",
        analysisCount: totalAnalyses,
        verifiedPercent: totalAnalyses ? Math.round((verified / totalAnalyses) * 100) : 0,
        importedAt: new Date().toISOString(),
        sample: false,
      };
      importAhsp(payload, mode, dataset);
      onClose();
      setStep(1);
      setRaw("");
      setRows([]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <Modal open onClose={onClose} size="lg" title="Impor dataset AHSP" description="Acuan utama perhitungan. Wizard: pilih berkas → pemetaan kolom → validasi → pratinjau diff → konfirmasi."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted">{step === 3 ? `${validRows.length} baris valid dari ${parsed.length}` : step === 2 ? `${rows.length} baris terbaca` : "Belum ada berkas"}</span>
          <div className="flex gap-2">
            {step > 1 && <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>Kembali</Button>}
            {step === 2 && <Button onClick={() => setStep(3)} disabled={!rows.length}>Validasi & pratinjau</Button>}
            {step === 3 && <Button onClick={commit} disabled={!validRows.length || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Terapkan ({mode})</Button>}
          </div>
        </div>
      }>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(["komponen", "analisis", "workItems"] as Entity[]).map((e) => (
            <Chip key={e} active={entity === e} onClick={() => { setEntity(e); setStep(1); setRows([]); }}>{e === "workItems" ? "Mapping pekerjaan" : e === "analisis" ? "Analisis" : "Komponen & harga"}</Chip>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-2">
            <button onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={async (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const t = await f.text(); setRaw(t); setFileName(f.name); parseTable(t, f.name); } }}
              className="flex min-h-[104px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#BFD3C9] bg-[#F8FCFA] px-4 py-4 text-center hover:border-[#8FC0AC]">
              <Upload className="h-5 w-5 text-accent" />
              <span className="text-[12px] font-bold text-ink">Pilih berkas atau seret ke sini</span>
              <span className="text-[10.5px] text-label">.csv · .tsv · .json (XLSX: simpan sebagai CSV dulu)</span>
            </button>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.json,text/csv,application/json" className="sr-only" aria-label="Pilih berkas dataset" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const t = await f.text(); setRaw(t); setFileName(f.name); parseTable(t, f.name); } }} />
            <label htmlFor="ahsp-paste" className="block text-[11px] font-bold text-[#405160]">Atau tempel isi berkas</label>
            <textarea id="ahsp-paste" value={raw} onChange={(e) => setRaw(e.target.value)} rows={5} className="w-full rounded-xl border border-line bg-[#FBFDFC] px-3 py-2 font-mono text-[10.5px] outline-none focus:border-[#A7D7C6]" placeholder={TEMPLATE} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => parseTable(raw, fileName || "tempel.csv")} disabled={!raw.trim()}><FileUp className="h-3.5 w-3.5" /> Baca & petakan kolom</Button>
              <Button size="sm" variant="ghost" onClick={() => { const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "template-komponen.csv"; a.click(); }}><Download className="h-3.5 w-3.5" /> Template kosong</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-ai-line bg-ai-soft px-3 py-2">
              <Sparkles className="h-4 w-4 shrink-0 text-[#6D28D9]" />
              <p className="text-[11px] leading-4 text-[#4B356C]">Pemetaan kolom diusulkan otomatis dari nama header. <strong>Wajib kamu konfirmasi</strong> sebelum lanjut.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {FIELDS[entity].map((field) => (
                <Field key={field.key} label={`${field.label}${field.required ? " *" : ""}`} htmlFor={`map-${field.key}`}>
                  <select id={`map-${field.key}`} value={mapping[field.key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value }))} className={cn(inputClass, field.required && !mapping[field.key] && "border-danger")}>
                    <option value="">— tidak dipetakan —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Nama dataset" htmlFor="ds-name"><input id="ds-name" value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} className={inputClass} placeholder="mis. AHSP Kabupaten X" /></Field>
              <Field label="Tahun" htmlFor="ds-year"><input id="ds-year" value={meta.year} onChange={(e) => setMeta((m) => ({ ...m, year: e.target.value }))} className={inputClass} placeholder="2026" /></Field>
              <Field label="Wilayah" htmlFor="ds-region"><input id="ds-region" value={meta.region} onChange={(e) => setMeta((m) => ({ ...m, region: e.target.value }))} className={inputClass} /></Field>
              <Field label="Tanggal berlaku" htmlFor="ds-date"><input id="ds-date" type="date" value={meta.effectiveDate} onChange={(e) => setMeta((m) => ({ ...m, effectiveDate: e.target.value }))} className={inputClass} /></Field>
              <div className="sm:col-span-2"><Field label="Sumber" htmlFor="ds-source"><input id="ds-source" value={meta.source} onChange={(e) => setMeta((m) => ({ ...m, source: e.target.value }))} className={inputClass} placeholder="Perbup/SK/instruksi resmi" /></Field></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Baru" value={diff.baru} tone="green" />
              <Stat label="Diubah" value={diff.ubah} tone="amber" />
              <Stat label="Dihapus" value={Math.max(0, diff.hapus)} tone="red" />
            </div>
            {parsed.some((r) => r.errors.length) && (
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF6F6] p-3">
                <p className="flex items-center gap-1 text-[12px] font-extrabold text-[#991B1B]"><AlertTriangle className="h-4 w-4" /> {parsed.filter((r) => r.errors.length).length} baris ditolak</p>
                <ul className="thin-scrollbar mt-1 max-h-32 space-y-0.5 overflow-y-auto text-[10.5px] leading-4 text-[#B91C1C]">
                  {parsed.filter((r) => r.errors.length).slice(0, 12).map((r) => <li key={r.index}>Baris {r.index + 2}: {r.errors.join("; ")}</li>)}
                </ul>
              </div>
            )}
            <div className="rounded-xl border border-line">
              <p className="border-b border-line bg-[#FBFDFC] px-3 py-2 text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-label">Pratinjau 5 baris valid</p>
              {validRows.slice(0, 5).map((r) => (
                <div key={r.index} className="flex items-center justify-between gap-2 border-b border-[#F2F5F3] px-3 py-2 text-[11px] last:border-0">
                  <span className="min-w-0 truncate font-bold text-[#405160]">{String(r.data!.uraian ?? r.data!.id)}</span>
                  <span className="shrink-0 text-label">{entity === "komponen" ? `${rupiah(Number(r.data!.harga))}/${r.data!.satuan}` : String(r.data!.satuan)}</span>
                </div>
              ))}
              {!validRows.length && <p className="px-3 py-3 text-[11px] text-muted">Tidak ada baris valid.</p>}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-label">Mode</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setMode("gabung")} aria-pressed={mode === "gabung"} className={cn("min-h-[48px] rounded-lg border px-3 text-left", mode === "gabung" ? "border-accent bg-[#EEF8F2]" : "border-line")}><span className="text-[11.5px] font-bold text-ink">Gabung</span><span className="block text-[10px] text-label">kode sama diperbarui</span></button>
                <button onClick={() => setMode("ganti")} aria-pressed={mode === "ganti"} className={cn("min-h-[48px] rounded-lg border px-3 text-left", mode === "ganti" ? "border-[#FCA5A5] bg-[#FEF6F6]" : "border-line")}><span className="text-[11.5px] font-bold text-ink">Ganti</span><span className="block text-[10px] text-label">dataset lama dibuang</span></button>
              </div>
            </div>
            <p className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] leading-4 text-[#92400E]">
              Dampak: seluruh proyek yang tidak dikunci harganya akan dihitung ulang. Riwayat impor disimpan dan bisa di-rollback dari layar Impor/Ekspor.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" }) {
  return (
    <div className={cn("rounded-xl border p-2.5", tone === "green" ? "border-[#C9E7DA] bg-[#F4FBF7]" : tone === "amber" ? "border-[#FDE9C8] bg-[#FFFBF3]" : "border-[#FECACA] bg-[#FEF6F6]")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-label">{label}</p>
      <p className="text-[17px] font-extrabold text-ink">{value}</p>
    </div>
  );
}

export function DatasetStatusCard() {
  const { state, setDataset } = useEstimator();
  const [open, setOpen] = useState(false);
  const d = state.dataset;
  const sampleOnly = !d || d.sample;
  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", sampleOnly ? "bg-[#FFFBEB] text-[#B45309]" : "bg-[#EEF8F2] text-accent")}><Database className="h-4 w-4" /></span>
            <div>
              <Eyebrow>{sampleOnly ? "Dataset contoh" : "AHSP aktif"}</Eyebrow>
              <p className="text-[12px] font-extrabold text-ink">{d ? d.name : "Belum ada dataset AHSP"}</p>
            </div>
          </div>
          <Badge tone={sampleOnly ? "amber" : "green"}>{sampleOnly ? "CONTOH" : `${d?.verifiedPercent ?? 0}% terverifikasi`}</Badge>
        </div>
        {d && (
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            <Info label="Tahun" value={d.year ? String(d.year) : "—"} />
            <Info label="Wilayah" value={d.region} />
            <Info label="Berlaku" value={formatDate(d.effectiveDate)} />
            <Info label="Analisis" value={String(d.analysisCount)} />
          </div>
        )}
        <p className="mt-2 text-[10.5px] leading-4 text-label">{sampleOnly ? "Banner DATA CONTOH tetap tampil sampai dataset AHSP non-contoh diimpor lengkap." : "Dataset non-contoh aktif. Pekerjaan tanpa analisis tetap ditandai “tanpa AHSP”."}</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => setOpen(true)}><FileSpreadsheet className="h-3.5 w-3.5" /> Impor AHSP</Button>
          {d && !d.sample && <Button size="sm" variant="ghost" onClick={() => setDataset(null)}>Lepas dataset</Button>}
        </div>
      </Card>
      <AhspImportWizard open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-[#FBFDFC] px-2 py-1.5">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.05em] text-label">{label}</p>
      <p className="text-[11.5px] font-bold text-ink">{value}</p>
    </div>
  );
}
