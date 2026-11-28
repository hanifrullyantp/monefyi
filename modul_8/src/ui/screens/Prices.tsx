import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, FlaskConical, Pencil, Plus, Search, Trash2, TrendingUp } from "lucide-react";
import type { Analisis, Komponen, KomponenJenis } from "../../data/types";
import { useEstimator, useRab } from "../context";
import { Badge, Button, Card, Chip, EmptyState, Field, Modal, inputClass } from "../components";
import { ScreenTitle } from "../Shell";
import { formatDate, numberId, rupiah, shortRupiah } from "../format";
import { cn } from "../../utils/cn";

const isStale = (tanggal: string, months: number) => Date.now() - new Date(tanggal).getTime() > months * 30.44 * 86400000;

export function PricesScreen() {
  const { state, projects, upsertKomponen, deleteKomponen, bulkUpdateKomponen, upsertAnalisis } = useEstimator();
  const [tab, setTab] = useState<"komponen" | "analisis">("komponen");
  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState<"semua" | KomponenJenis>("semua");
  const [editing, setEditing] = useState<Komponen | "new" | null>(null);
  const [editingAnalisis, setEditingAnalisis] = useState<Analisis | null>(null);
  const [deleting, setDeleting] = useState<Komponen | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPercent, setBulkPercent] = useState("5");
  const { komponen, analisis } = state.catalog;
  const months = state.settings.priceStaleMonths;
  const sample = projects.find((p) => !p.archived && !p.ratesLocked) ?? null;
  const { rab } = useRab(sample);

  const filtered = useMemo(() => komponen.filter((k) => `${k.kode} ${k.uraian} ${k.sumber}`.toLowerCase().includes(search.toLowerCase())).filter((k) => jenis === "semua" || k.jenis === jenis), [komponen, search, jenis]);
  const filteredA = useMemo(() => analisis.filter((a) => `${a.id} ${a.uraian}`.toLowerCase().includes(search.toLowerCase())), [analisis, search]);
  const stale = komponen.filter((k) => isStale(k.tanggalBerlaku, months)).length;
  const verifiedA = analisis.filter((a) => a.keyakinan === "terverifikasi").length;
  const usage = (kode: string) => analisis.filter((a) => a.komponen.some((r) => r.komponenId === kode)).length;

  return (
    <div>
      <ScreenTitle title="Database harga & analisis" subtitle="Harga komponen dan koefisien analisis inilah yang dipakai engine. Mengubahnya langsung mengubah RAB, rekap material, dan upah semua proyek yang tidak terkunci." right={<><Button variant="secondary" onClick={() => setBulkOpen(true)}><TrendingUp className="h-4 w-4" /> Ubah massal</Button><Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Komponen</Button></>} />
      <div className="mb-3 grid gap-2 sm:grid-cols-4">
        {[["Komponen", komponen.length], ["Analisis", analisis.length], ["Analisis terverifikasi", `${verifiedA}/${analisis.length}`], [`Harga > ${months} bln`, stale]].map(([l, v]) => <Card key={String(l)} className="p-3"><p className="text-[10px] font-bold uppercase tracking-[0.05em] text-label">{l}</p><p className="text-[16px] font-extrabold text-ink">{v}</p></Card>)}
      </div>
      {rab && sample && <p className="mb-3 rounded-xl border border-line bg-white px-3 py-2 text-[12px] text-muted">Pantauan dampak: <strong className="text-ink">{sample.name}</strong> sekarang <strong className="text-ink">{shortRupiah(rab.total)}</strong> — angka ini berubah seketika saat harga/koefisien disimpan.</p>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-white p-0.5" role="tablist">
          {(["komponen", "analisis"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold capitalize", tab === t ? "bg-[#eef8f2] text-accent" : "text-muted")}>{t === "komponen" ? <Database className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}{t}</button>)}
        </div>
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-label" /><input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari" placeholder="Cari kode atau uraian…" className={cn(inputClass, "pl-9")} /></div>
        {tab === "komponen" && <div className="no-scrollbar flex gap-1 overflow-x-auto">{(["semua", "tenaga", "bahan", "alat"] as const).map((j) => <Chip key={j} active={jenis === j} onClick={() => setJenis(j)} className="min-h-[44px] capitalize">{j}</Chip>)}</div>}
      </div>
      <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#f5dfb0] bg-[#fffaf0] px-3 py-2 text-[11px] leading-4 text-[#8b621d]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>DATA CONTOH — belum untuk RAB nyata.</strong> Semua harga dan koefisien berlabel “CONTOH – belum diverifikasi”. Label “Akurat” hanya muncul bila analisis terverifikasi dan harga bersumber nyata serta belum basi.</span></div>

      {tab === "komponen" ? (filtered.length === 0 ? <EmptyState icon={<Search className="h-5 w-5" />} title="Komponen tidak ditemukan" description="Coba kata kunci lain atau tambah komponen." /> : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((k) => (
            <Card key={k.kode} className="p-3.5">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[13px] font-extrabold text-ink">{k.uraian}</p><p className="text-[11px] text-label">{k.kode} · {k.jenis} · per {k.satuan} · dipakai {usage(k.kode)} analisis</p></div><Badge tone={/contoh/i.test(k.sumber) ? "amber" : "green"}>{/contoh/i.test(k.sumber) ? "contoh" : "bersumber"}</Badge></div>
              <p className="mt-2 text-[17px] font-extrabold text-ink">{rupiah(k.harga)}</p>
              <p className="truncate text-[10px] text-label">{k.sumber} · berlaku {formatDate(k.tanggalBerlaku)} · {k.wilayah}</p>
              {isStale(k.tanggalBerlaku, months) && <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fef2f2] px-2 py-0.5 text-[10px] font-bold text-[#b91c1c]"><AlertTriangle className="h-3 w-3" /> Basi (&gt; {months} bln)</p>}
              <div className="mt-2 flex justify-end gap-1 border-t border-[#f0f4f2] pt-2">
                <button aria-label={`Ubah ${k.uraian}`} onClick={() => setEditing(k)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted hover:text-accent"><Pencil className="h-4 w-4" /></button>
                <button aria-label={`Hapus ${k.uraian}`} onClick={() => setDeleting(k)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )) : (
        <div className="space-y-2">
          {filteredA.map((a) => (
            <Card key={a.id} className="p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[13px] font-extrabold text-ink">{a.uraian}</p><p className="text-[11px] text-label">{a.id} · per {a.satuan} · {a.sumber.regulasi}</p></div><div className="flex items-center gap-2"><Badge tone={a.keyakinan === "terverifikasi" ? "green" : "amber"}>{a.keyakinan}</Badge><Button variant="secondary" onClick={() => setEditingAnalisis(a)}><Pencil className="h-4 w-4" /> Koefisien</Button></div></div>
              <div className="mt-2 flex flex-wrap gap-1">{a.komponen.map((r) => { const k = komponen.find((x) => x.kode === r.komponenId); return <span key={r.komponenId} className={cn("rounded-md border px-1.5 py-0.5 text-[10px]", k ? "border-line text-[#4d6258]" : "border-[#fecaca] text-[#b91c1c]")}>{k?.uraian ?? `${r.komponenId} (hilang)`} · {numberId(r.koefisien, 4)}{r.waste ? ` +${Math.round(r.waste * 100)}%` : ""}</span>; })}</div>
            </Card>
          ))}
        </div>
      )}

      <KomponenEditor open={editing !== null} value={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={(k, orig) => { upsertKomponen(k, orig); setEditing(null); }} />
      {editingAnalisis && <AnalisisEditor value={editingAnalisis} komponen={komponen} onClose={() => setEditingAnalisis(null)} onSave={(a) => { upsertAnalisis(a); setEditingAnalisis(null); }} />}
      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Hapus komponen?" description={deleting ? `${deleting.uraian} dipakai ${usage(deleting.kode)} analisis. Baris terkait akan memberi peringatan komponen hilang.` : ""} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleting(null)}>Batal</Button><Button variant="danger" onClick={() => { if (deleting) deleteKomponen(deleting.kode); setDeleting(null); }}>Hapus</Button></div>}><p className="text-[12px] text-muted">Tindakan ini bisa dibatalkan lewat Impor → rollback hanya bila dilakukan via impor; sebaiknya ekspor cadangan dulu.</p></Modal>
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Ubah harga massal" description="Persentase diterapkan ke semua komponen; tanggal berlaku diperbarui ke hari ini." footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setBulkOpen(false)}>Batal</Button><Button onClick={() => { bulkUpdateKomponen(Number(bulkPercent) || 0); setBulkOpen(false); }}>Terapkan ke {komponen.length} komponen</Button></div>}>
        <Field label="Perubahan (%)" htmlFor="bulk"><input id="bulk" type="number" value={bulkPercent} onChange={(e) => setBulkPercent(e.target.value)} className={inputClass} /></Field>
        <div className="mt-3 rounded-xl border border-line">{komponen.slice(0, 3).map((k) => <div key={k.kode} className="flex justify-between gap-2 border-b border-[#f2f5f3] px-3 py-2 text-[12px] last:border-0"><span className="truncate text-muted">{k.uraian}</span><span className="text-label line-through">{shortRupiah(k.harga)}</span><strong>{shortRupiah(Math.round(k.harga * (1 + (Number(bulkPercent) || 0) / 100)))}</strong></div>)}</div>
      </Modal>
    </div>
  );
}

function KomponenEditor({ open, value, onClose, onSave }: { open: boolean; value: Komponen | null; onClose: () => void; onSave: (k: Komponen, originalKode?: string) => void }) {
  const empty: Komponen = { kode: "", uraian: "", jenis: "bahan", satuan: "", harga: 0, wilayah: "Yogyakarta", tanggalBerlaku: new Date().toISOString().slice(0, 10), sumber: "" };
  const [k, setK] = useState<Komponen>(value ?? empty);
  useEffect(() => { if (open) setK(value ?? empty); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);
  if (!open) return null;
  const set = (patch: Partial<Komponen>) => setK((prev) => ({ ...prev, ...patch }));
  const valid = k.kode.trim() && k.uraian.trim() && k.satuan.trim() && k.harga > 0 && k.sumber.trim();
  return (
    <Modal open onClose={onClose} title={value ? "Ubah harga komponen" : "Tambah komponen"} description="Sumber dan tanggal berlaku wajib. Jangan memberi label regulasi pada angka yang belum diverifikasi." footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button disabled={!valid} onClick={() => onSave({ ...k, kode: k.kode.trim(), harga: Math.round(k.harga) }, value?.kode)}>Simpan</Button></div>}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Kode" htmlFor="k-kode"><input id="k-kode" value={k.kode} onChange={(e) => set({ kode: e.target.value })} className={inputClass} /></Field>
        <Field label="Jenis" htmlFor="k-jenis"><select id="k-jenis" value={k.jenis} onChange={(e) => set({ jenis: e.target.value as KomponenJenis })} className={inputClass}><option value="tenaga">Tenaga</option><option value="bahan">Bahan</option><option value="alat">Alat</option></select></Field>
        <div className="sm:col-span-2"><Field label="Uraian" htmlFor="k-uraian"><input id="k-uraian" value={k.uraian} onChange={(e) => set({ uraian: e.target.value })} className={inputClass} /></Field></div>
        <Field label="Satuan" htmlFor="k-satuan"><input id="k-satuan" value={k.satuan} onChange={(e) => set({ satuan: e.target.value })} className={inputClass} /></Field>
        <Field label="Harga (Rp)" htmlFor="k-harga"><input id="k-harga" type="number" value={k.harga || ""} onChange={(e) => set({ harga: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Tanggal berlaku" htmlFor="k-tgl"><input id="k-tgl" type="date" value={k.tanggalBerlaku.slice(0, 10)} onChange={(e) => set({ tanggalBerlaku: e.target.value })} className={inputClass} /></Field>
        <Field label="Wilayah" htmlFor="k-wil"><input id="k-wil" value={k.wilayah} onChange={(e) => set({ wilayah: e.target.value })} className={inputClass} /></Field>
        <div className="sm:col-span-2"><Field label="Sumber" hint="mis. survei toko, penawaran" htmlFor="k-sumber"><input id="k-sumber" value={k.sumber} onChange={(e) => set({ sumber: e.target.value })} className={inputClass} /></Field></div>
      </div>
    </Modal>
  );
}

function AnalisisEditor({ value, komponen, onClose, onSave }: { value: Analisis; komponen: Komponen[]; onClose: () => void; onSave: (a: Analisis) => void }) {
  const [a, setA] = useState<Analisis>(JSON.parse(JSON.stringify(value)) as Analisis);
  const setRow = (i: number, patch: Partial<Analisis["komponen"][number]>) => setA((prev) => ({ ...prev, komponen: prev.komponen.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const valid = a.komponen.length > 0 && a.komponen.every((r) => r.koefisien > 0 && komponen.some((k) => k.kode === r.komponenId));
  const raw = a.komponen.reduce((s, r) => s + r.koefisien * (1 + (r.waste ?? 0)) * (komponen.find((k) => k.kode === r.komponenId)?.harga ?? 0), 0);
  return (
    <Modal open onClose={onClose} size="lg" title={`Koefisien ${a.uraian}`} description="Koefisien hanya diubah oleh pengguna — tidak pernah oleh AI." footer={<div className="flex items-center justify-between gap-2"><span className="text-[12px] text-muted">Harga satuan dasar (indeks 1,0): <strong className="text-ink">{rupiah(Math.round(raw))}</strong></span><div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button disabled={!valid} onClick={() => onSave(a)}>Simpan</Button></div></div>}>
      <div className="space-y-2">
        {a.komponen.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_80px_44px] items-end gap-2">
            <Field label={i === 0 ? "Komponen" : ""} htmlFor={`a-k-${i}`}><select id={`a-k-${i}`} value={r.komponenId} onChange={(e) => setRow(i, { komponenId: e.target.value })} className={inputClass}>{komponen.map((k) => <option key={k.kode} value={k.kode}>{k.uraian} ({k.satuan})</option>)}</select></Field>
            <Field label={i === 0 ? "Koefisien" : ""} htmlFor={`a-c-${i}`}><input id={`a-c-${i}`} type="number" step="0.0001" value={r.koefisien} onChange={(e) => setRow(i, { koefisien: Number(e.target.value) })} className={inputClass} /></Field>
            <Field label={i === 0 ? "Waste %" : ""} htmlFor={`a-w-${i}`}><input id={`a-w-${i}`} type="number" value={Math.round((r.waste ?? 0) * 100)} onChange={(e) => setRow(i, { waste: Number(e.target.value) / 100 })} className={inputClass} /></Field>
            <button aria-label="Hapus baris" onClick={() => setA((prev) => ({ ...prev, komponen: prev.komponen.filter((_, j) => j !== i) }))} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setA((prev) => ({ ...prev, komponen: [...prev.komponen, { komponenId: komponen[0]?.kode ?? "", koefisien: 0.1 }] }))}><Plus className="h-4 w-4" /> Tambah komponen</Button>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Sumber regulasi" htmlFor="a-reg"><input id="a-reg" value={a.sumber.regulasi} onChange={(e) => setA({ ...a, sumber: { ...a.sumber, regulasi: e.target.value } })} className={inputClass} /></Field>
          <Field label="Tahun" htmlFor="a-th"><input id="a-th" type="number" value={a.sumber.tahun ?? ""} onChange={(e) => setA({ ...a, sumber: { ...a.sumber, tahun: e.target.value ? Number(e.target.value) : null } })} className={inputClass} /></Field>
          <Field label="Status" htmlFor="a-ky"><select id="a-ky" value={a.keyakinan} onChange={(e) => setA({ ...a, keyakinan: e.target.value as Analisis["keyakinan"] })} className={inputClass}><option value="belum">Belum terverifikasi</option><option value="terverifikasi">Terverifikasi</option></select></Field>
        </div>
        {a.keyakinan === "terverifikasi" && /contoh/i.test(a.sumber.regulasi) && <p className="text-[11px] text-[#b91c1c]">Sumber masih “CONTOH”. Isi sumber nyata (regulasi, tahun, halaman) sebelum menandai terverifikasi.</p>}
      </div>
    </Modal>
  );
}
