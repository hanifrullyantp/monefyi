import { useState } from "react";
import {
  AlertTriangle, ChevronDown, Download, FileJson, FileSpreadsheet,
  FileText, Flag, History, Lock, MessageCircle, PackageOpen, Pencil, Plus, Printer, RotateCcw,
  ShieldCheck, Sparkles, Trash2, TrendingUp, Wallet,
} from "lucide-react";
import type { BoqItem, Project, RabResult, ScenarioVersion } from "../../data/types";
import { PACKAGE_LABELS } from "../../data/config";
import { formatDate, numberId, rupiah, shortRupiah } from "../format";
import { useEstimator, useRab } from "../context";
import {
  AIInsightCard, Badge, Button, Card, ConfidenceBadge, EmptyState, Eyebrow, Field, Modal, inputClass,
} from "../components";
import { priceRows } from "../../integration/pricePresentation";
import { printRab, downloadText, rabCsv, projectJson, whatsappSummary } from "../../integration/exporters";
import { cn } from "../../utils/cn";
import { BackChip } from "../Shell";

const sections = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "rincian", label: "Rincian" },
  { id: "material", label: "Material" },
  { id: "kurva-s", label: "Kurva S" },
  { id: "termin", label: "Termin" },
  { id: "versi", label: "Versi" },
];

const classTone: Record<BoqItem["kelasSumber"], "green" | "blue" | "amber" | "violet"> = {
  terukur: "green",
  turunan: "blue",
  estimasi_struktur: "amber",
  persentase: "violet",
};

export function RabDetailScreen({ project }: { project: Project }) {
  const { rab, error } = useRab(project);
  if (!rab) return <div className="space-y-3 pt-4" aria-label="Menghitung RAB">{error ? <p role="alert" className="text-[13px] text-danger">Engine gagal: {error}</p> : <><div className="skeleton h-40 rounded-[20px]" /><div className="skeleton h-64 rounded-[18px]" /></>}</div>;
  return <RabDetailBody project={project} rab={rab} />;
}

function RabDetailBody({ project, rab }: { project: Project; rab: RabResult }) {
  const { state, navigate, toast, addCorrection, saveVersion, toggleLockRates, setBoqOverride, addExtraItem, removeExtraItem, resetBoq } = useEstimator();
  const checks = rab.checks;
  const versions = state.versions.filter((version) => version.projectId === project.id);
  const [exportOpen, setExportOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [editItem, setEditItem] = useState<BoqItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(rab.items[0]?.id ?? null);
  const [openPackages, setOpenPackages] = useState<string[]>(rab.packages.slice(0, 1).map((pkg) => pkg.key));
  const [reportOpen, setReportOpen] = useState(false);
  const [reportValue, setReportValue] = useState("");
  const [reportNote, setReportNote] = useState("");
  const comparison = versions.length >= 2 ? { diff: versions[0].total - versions[1].total, percent: versions[1].total ? Math.round(((versions[0].total - versions[1].total) / versions[1].total) * 1000) / 10 : 0 } : null;

  const scrollTo = (id: string) => {
    document.getElementById(`rab-${id}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  const submitReport = () => {
    if (!reportValue.trim()) return;
    const numeric = Number(reportValue.replace(/[^\d]/g, ""));
    addCorrection({
      id: `corr-${Date.now()}`,
      projectId: project.id,
      context: { type: project.model.type, area: project.model.area, floors: project.model.floors, location: project.model.location, finishing: project.model.finishing },
      field: "laporan_rab",
      proposed: rab.total,
      corrected: Number.isFinite(numeric) && numeric > 0 ? numeric : reportValue.trim(),
      at: new Date().toISOString(),
      approval: "pending",
      source: "pengguna",
      total: Number.isFinite(numeric) && numeric > 0 ? numeric - rab.total : undefined,
      perPackage: reportNote ? { catatan: 1 } : undefined,
    });
    setReportOpen(false);
    setReportValue("");
    setReportNote("");
  };

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 pt-2">
        <div>
          <BackChip label="Proyek" onClick={() => navigate({ name: "project", projectId: project.id })} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-[23px] font-extrabold tracking-[-0.035em] text-ink sm:text-[27px]">RAB lengkap</h1>
            <Badge tone={rab.label === "RAB DETAIL" ? "blue" : "green"}>{rab.label}</Badge>
            <Badge tone="neutral">v{Math.max(1, versions.length + 1)}</Badge>
          </div>
          <p className="mt-1 text-[10.5px] font-medium text-muted">{project.name} · {project.model.area} m² · {project.model.location}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button variant="secondary" size="sm" onClick={() => setVersionOpen(true)}><History className="h-3.5 w-3.5" /><span className="hidden sm:inline">Simpan versi</span></Button>
          <Button size="sm" onClick={() => setExportOpen(true)}><Download className="h-3.5 w-3.5" /> Ekspor</Button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#064E3B_0%,#047857_54%,#059669_100%)] p-4 text-white shadow-[0_24px_48px_-30px_rgba(4,120,87,.8)] sm:p-5">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[8.5px] font-extrabold uppercase tracking-[0.1em]"><FileText className="h-2.5 w-2.5" /> {rab.label === "INDIKATIF" ? "RAB indikatif" : "RAB detail"}</span><ConfidenceBadge label={rab.confidence} className="border-white/20 bg-white/10 text-white" /></div>
            <p className="mt-2 text-[31px] font-extrabold leading-none tracking-[-0.045em] sm:text-[38px]">{rupiah(rab.total)}</p>
            <p className="mt-1.5 text-[10px] font-medium text-[#c6eedf]">Kisaran P10–P90 <strong className="text-white">{rupiah(rab.p10)}</strong> – <strong className="text-white">{rupiah(rab.p90)}</strong></p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-semibold text-[#c6eedf]">
              <span>{rupiah(rab.perM2)}/m²</span><span>PPN {rab.rap.ppnEnabled ? `${state.settings.ppnPercent}%` : "nonaktif"}</span><span>Overhead {state.settings.overheadPercent}% · profit {state.settings.profitPercent}%</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-[250px]">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between"><span className="text-[9px] font-bold text-[#c6eedf]">Kelengkapan data</span><span className="text-[15px] font-extrabold">{rab.completeness}%</span></div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20"><div className={cn("meter-fill h-full rounded-full bg-white")} style={{ width: `${rab.completeness}%` }} /></div>
              <p className="mt-1.5 text-[8.5px] text-[#b9e9d7]">{`${rab.items.length} baris BOQ · ${rab.completenessDetail.filter((d) => d.confirmed).length}/${rab.completenessDetail.length} variabel dikonfirmasi`}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReportOpen(true)} className="inline-flex min-h-[32px] flex-1 items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/10 text-[9px] font-bold text-white hover:bg-white/15"><Flag className="h-3 w-3" /> Laporkan salah</button>
              <button onClick={() => navigate({ name: "project", projectId: project.id })} className="inline-flex min-h-[32px] flex-1 items-center justify-center gap-1 rounded-lg bg-white text-[9px] font-extrabold text-[#075a43] hover:bg-[#f2fbf7]"><Pencil className="h-3 w-3" /> Ubah asumsi</button>
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="Lompat ke bagian RAB" className="no-scrollbar sticky top-0 z-20 -mx-1 mt-3 flex gap-1.5 overflow-x-auto rounded-xl border border-line bg-white/95 px-1.5 py-1.5 shadow-sm backdrop-blur">
        {sections.map((section, index) => (
          <button key={section.id} onClick={() => scrollTo(section.id)} className={cn("min-h-[32px] shrink-0 rounded-lg px-2.5 text-[9.5px] font-bold text-muted transition-colors hover:bg-[#f3f8f5] hover:text-ink", index === 0 && "bg-[#eef8f2] text-accent")}>{section.label}</button>
        ))}
        <span className="ml-auto hidden shrink-0 items-center gap-1 px-2 text-[8px] font-medium text-label sm:flex"><Lock className="h-2.5 w-2.5" /> {project.ratesLocked ? "harga terkunci" : "harga beredar"}</span>
      </nav>

      <section id="rab-ringkasan" className="scroll-mt-16 pt-5" aria-labelledby="ringkasan-title">
        <SectionHeader id="ringkasan-title" eyebrow="Ringkasan" title="Angka utama & validasi" />
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-bold">Perhitungan harga proyek</h3><Badge tone="neutral">{rab.overheadMode === 'rekap' ? 'Overhead di rekap' : 'Overhead dalam harga satuan'}</Badge></div>
          <dl className="mt-4 grid gap-x-8 gap-y-0 sm:grid-cols-2">{priceRows(rab.rap).map(([label, amount]) => <div key={label} className="flex items-baseline justify-between gap-2 border-b border-line py-2.5 text-xs"><dt className="text-muted">{label}</dt><dd className="font-semibold text-ink">{rupiah(amount)}</dd></div>)}</dl>
          <p className="mt-3 text-xs text-muted">Margin {rupiah(rab.rap.margin)} ({rab.rap.marginPercent}%) dihitung sebelum PPN. {rab.verifiedPercent}% item memakai data terverifikasi.</p>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
          <Card className="p-4">
            <div className="mb-2.5 flex items-center justify-between gap-2"><div><Eyebrow>runChecks · tanpa AI</Eyebrow><p className="mt-1 text-[12px] font-extrabold text-ink">{checks.length} temuan untuk ditinjau</p></div><Badge tone={checks.some((check) => check.severity === "error") ? "red" : "amber"}>{checks.filter((check) => check.severity !== "info").length} perlu perhatian</Badge></div>
            <div className="space-y-2">
              {checks.length === 0 ? <p className="text-[11px] text-muted">Tidak ada temuan kritis.</p> : checks.slice(0, 4).map((check) => (
                <div key={check.id} className={cn("rounded-xl border px-3 py-2", check.severity === "error" ? "border-[#fecaca] bg-[#fef7f7]" : check.severity === "warning" ? "border-[#fde9c8] bg-[#fffbf3]" : "border-[#dbeafe] bg-[#f6f9ff]")}>
                  <div className="flex items-start gap-2">
                    {check.severity === "error" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" /> : <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />}
                    <div className="min-w-0 flex-1"><p className="text-[10.5px] font-bold text-ink">{check.title}</p><p className="mt-0.5 text-[9px] leading-4 text-muted">{check.detail} {check.suggestion}</p></div>
                    <button onClick={() => navigate({ name: "project", projectId: project.id })} className="inline-flex min-h-[28px] shrink-0 items-center rounded-full border border-line bg-white px-2 text-[8.5px] font-bold text-[#425563] hover:text-accent">{check.action === "perbaiki" ? "Perbaiki" : check.action === "tambahkan" ? "Tambahkan" : "Tinjau"}</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <AIInsightCard title="Analisa AI" action={<Badge tone="violet"><Sparkles className="h-2.5 w-2.5" /> non-uang</Badge>}>
            <p className="text-[11.5px] font-bold leading-5 text-[#4b356c]">Review model, bukan rupiah.</p>
            <p className="mt-1 text-[10.5px] leading-[1.65]">Struktur memakai kelas estimasi_struktur dan tidak pernah dinaikkan ke “Akurat” tanpa gambar. {rab.items.filter((item) => item.kelasSumber === "estimasi_struktur").length} baris struktur berlabel Perlu cek. Semua koefisien dan rumus tetap milik engine.</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5"><Badge tone="violet">output AI tak masuk RAB</Badge><Badge tone="violet">validasi zod</Badge><Badge tone="violet">audit per baris</Badge></div>
          </AIInsightCard>
        </div>
        <div className="mt-3 rounded-xl border border-[#f5dfb0] bg-[#fffaf0] px-3.5 py-2.5 text-[9.5px] leading-4 text-[#8b621d]">
          <strong>DATA CONTOH — belum untuk RAB nyata.</strong> Angka disusun dari koefisien contoh dan harga contoh, bukan SNI/Permen PUPR. “RAB indikatif bukan penawaran mengikat; hitung ulang bila gambar kerja berbeda.”
        </div>
      </section>

      <section id="rab-rincian" className="scroll-mt-16 pt-6" aria-labelledby="rincian-title">
        <SectionHeader id="rincian-title" eyebrow="Rincian" title="Pekerjaan per paket" action={
          <div className="flex gap-1.5">
            {<Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Item</Button>}
            {project.boqOverrides && Object.keys(project.boqOverrides).length > 0 && <Button variant="ghost" size="sm" onClick={() => resetBoq(project.id)}><RotateCcw className="h-3 w-3" /> Reset</Button>}
          </div>
        } />
        {(
          <div className="space-y-2">
            {rab.packages.map((pkg) => {
              const open = openPackages.includes(pkg.key);
              const items = rab.items.filter((item) => item.packageKey === pkg.key);
              return (
                <Card key={pkg.key} className="overflow-hidden">
                  <button onClick={() => setOpenPackages((prev) => prev.includes(pkg.key) ? prev.filter((key) => key !== pkg.key) : [...prev, pkg.key])} className="flex min-h-[58px] w-full items-center gap-3 px-4 py-2.5 text-left" aria-expanded={open}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef7f2] text-[10px] font-extrabold text-accent">{pkg.percent}%</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[11.5px] font-extrabold text-ink">{pkg.label}</span><span className="mt-0.5 block text-[9px] font-medium text-label">{items.length} baris · bobot {pkg.percent}%</span></span>
                    <span className="shrink-0 text-[12px] font-extrabold text-ink">{rupiah(pkg.amount)}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-label transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="divide-y divide-[#f0f4f2] border-t border-[#eef2f0]">
                      {items.map((item) => {
                        const expandedItem = expanded === item.id;
                        return (
                          <div key={item.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5"><p className="text-[10.5px] font-bold text-ink">{item.uraian}</p><Badge tone={classTone[item.kelasSumber]}>{item.kelasSumber.replace("_", " ")}</Badge>{item.custom && <Badge tone="violet">kustom</Badge>}</div>
                                <p className="mt-0.5 text-[9px] font-medium text-muted">{numberId(item.volume, 2)} {item.satuan} × {rupiah(item.unitPrice)}</p>
                              </div>
                              <div className="text-right"><p className="text-[10.5px] font-extrabold text-ink">{rupiah(item.amount)}</p><ConfidenceBadge label={item.keyakinan} className="mt-1" /></div>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <button onClick={() => setExpanded(expandedItem ? null : item.id)} className="inline-flex min-h-[28px] items-center gap-1 text-[8.5px] font-bold text-[#4d685c] hover:text-accent"><FileText className="h-2.5 w-2.5" /> {expandedItem ? "Tutup" : "Lihat"} rincian & audit</button>
                              <div className="flex gap-1">
                                <button onClick={() => setEditItem(item)} aria-label={`Ubah volume ${item.uraian}`} className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted hover:bg-[#f6faf8] hover:text-accent"><Pencil className="h-3 w-3" /></button>
                                {item.id.startsWith("extra-") ? <button onClick={() => removeExtraItem(project.id, item.id)} aria-label={`Hapus ${item.uraian}`} className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted hover:bg-[#fef2f2] hover:text-danger"><Trash2 className="h-3 w-3" /></button> : <button onClick={() => setBoqOverride(project.id, item.id, { removed: true })} aria-label={`Hapus ${item.uraian}`} className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted hover:bg-[#fef2f2] hover:text-danger"><Trash2 className="h-3 w-3" /></button>}
                              </div>
                            </div>
                            {expandedItem && (
                              <div className="pop-in mt-2 rounded-xl border border-[#e4ece8] bg-[#f9fcfa] p-3">
                                <p className="text-[8px] font-extrabold uppercase tracking-[0.08em] text-label">Jejak audit</p>
                                <div className="mt-1.5 grid gap-1.5 text-[9px] sm:grid-cols-2">
                                  <AuditRow label="Elemen model" value={`${project.model.area} m² · ${project.model.floors} lt · ${project.model.finishing} · atap ${project.model.roof.type}`} />
                                  <AuditRow label="Rumus" value={item.rumus} mono />
                                  <AuditRow label="Volume" value={`${numberId(item.volume, 2)} ${item.satuan}`} />
                                  <AuditRow label="Harga langsung per satuan" value={rupiah(item.directUnitPrice ?? item.unitPrice)} /><AuditRow label={rab.overheadMode === "dalam_harga" ? "Satuan dengan markup" : "Harga satuan"} value={rupiah(item.unitPrice)} />
                                  <AuditRow label="Tanggal harga" value={formatDate(item.priceDate)} />
                                  <AuditRow label="Jumlah" value={`${numberId(item.volume, 2)} × ${rupiah(item.unitPrice)} = ${rupiah(item.amount)}`} />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">{Object.entries(item.variables).map(([key, value]) => <span key={key} className="rounded-md border border-line bg-white px-1.5 py-0.5 font-mono text-[8px] text-[#5e7068]">{key}={numberId(value, 2)}</span>)}</div>
                                <p className="mt-2 text-[10px] font-bold text-[#405160]">Analisis {item.analisisId ?? "—"} · {item.analisisSumber ?? "tidak ada"} · {item.analisisKeyakinan === "terverifikasi" ? "terverifikasi" : "belum terverifikasi"}</p>
                                <div className="mt-1 overflow-x-auto"><table className="w-full min-w-[420px] text-[10px]"><thead><tr className="text-left text-label"><th className="py-1 pr-2">Komponen</th><th className="pr-2">Koef</th><th className="pr-2">Waste</th><th className="pr-2">Harga</th><th className="pr-2">Indeks</th><th className="pr-2">Faktor bahan</th><th className="pr-2">Berlaku</th><th className="text-right">Subtotal</th></tr></thead><tbody>{item.komponen.map((k) => <tr key={k.kode} className="border-t border-[#eef2f0]"><td className="py-1 pr-2 text-[#405160]">{k.uraian}<span className="block text-[9px] text-label">{k.kode} · {k.sumber}</span></td><td className="pr-2">{numberId(k.koefisien, 4)} {k.satuan}</td><td className="pr-2">{Math.round(k.waste * 100)}%</td><td className="pr-2">{rupiah(k.harga)}</td><td className="pr-2">{numberId(k.indeks, 2)}</td><td className="pr-2">{numberId(k.specFactor ?? 1, 3)}</td><td className="pr-2">{formatDate(k.tanggalBerlaku)}</td><td className="text-right font-bold">{rupiah(Math.round(k.subtotal))}</td></tr>)}</tbody></table></div>
                                {item.faktor.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{item.faktor.map((f) => <span key={f.nama} className="rounded-md bg-[#eef5f1] px-1.5 py-0.5 text-[9px] font-semibold text-[#547064]">{f.nama}: {numberId(f.nilai, 3)} · {f.sumber}</span>)}</div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {items.length === 0 && <p className="px-4 py-3 text-[10px] text-label">Item paket ini kosong atau dihapus.</p>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section id="rab-material" className="scroll-mt-16 pt-6" aria-labelledby="material-title">
        <SectionHeader id="material-title" eyebrow="Material" title="Rekap bahan & tenaga" />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2"><PackageOpen className="h-3.5 w-3.5 text-accent" /><p className="text-[11px] font-extrabold text-ink">Material utama</p><span className="ml-auto text-[8.5px] font-medium text-label">estimasi volume</span></div>
            <div className="space-y-2.5">
              {rab.materials.slice(0, 10).map((material) => (
                <div key={material.kode}>
                  <div className="flex items-center justify-between gap-2 text-[9.5px]"><span className="font-semibold text-[#405160]">{material.uraian}</span><span className="font-bold text-ink">{numberId(material.qty, 2)} {material.satuan} · {shortRupiah(material.cost)}</span></div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#edf2ef]"><div className="h-full rounded-full bg-[#7bb9a1]" style={{ width: `${Math.max(2, Math.round((material.cost / Math.max(1, rab.materials[0]?.cost ?? 1)) * 100))}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[8.5px] text-label">Rekap = Σ(volume × koefisien × (1+waste)) dari BOQ; total bahan+tenaga+alat cocok dengan subtotal (selisih hanya pembulatan harga satuan).</p>
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2"><Wallet className="h-3.5 w-3.5 text-finance" /><p className="text-[11px] font-extrabold text-ink">Tenaga kerja</p><span className="ml-auto text-[8.5px] font-medium text-label">tenaga & alat</span></div>
            <div className="space-y-2">
              {[...rab.labor, ...rab.equipment].map((labor) => (
                <div key={labor.kode} className="flex items-center justify-between rounded-lg border border-[#eef2f0] bg-[#fbfdfc] px-2.5 py-2 text-[9.5px]"><span className="font-semibold text-[#405160]">{labor.uraian}</span><span className="text-label">{numberId(labor.qty, 1)} {labor.satuan}</span><span className="font-bold text-ink">{shortRupiah(labor.cost)}</span></div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1 text-[8.5px] text-label"><AlertTriangle className="h-2.5 w-2.5 text-warning" /> Koefisien dan upah masih CONTOH, belum terverifikasi.</p>
          </Card>
        </div>
      </section>

      <section id="rab-kurva-s" className="scroll-mt-16 pt-6" aria-labelledby="kurva-title">
        <SectionHeader id="kurva-title" eyebrow="Kurva S" title={`Rencana progres ${rab.sCurve.length} minggu`} action={<Badge tone="green"><TrendingUp className="h-2.5 w-2.5" /> rencana</Badge>} />
        <Card className="p-4">
          <CurveChart data={rab.sCurve} />
          <div className="mt-2 flex flex-wrap gap-4 text-[8.5px] font-semibold text-label"><span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" /> Rencana</span>{rab.sCurve.some((r) => r.actual !== undefined) ? <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-finance" /> Aktual (dari input realisasi)</span> : <button onClick={() => navigate({ name: "actuals", projectId: project.id })} className="underline">Belum ada data realisasi — input progres</button>}<span className="ml-auto">Bobot kumulatif · bukan jadwal kontrak</span></div>
        </Card>
      </section>

      <section id="rab-termin" className="scroll-mt-16 pt-6" aria-labelledby="termin-title">
        <SectionHeader id="termin-title" eyebrow="Termin" title="Usulan termin dari bobot paket" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {rab.terms.map((term, index) => (
            <Card key={term.label} className="p-3">
              <div className="flex items-center justify-between"><span className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-label">{term.label}</span><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eff6f2] text-[8px] font-extrabold text-accent">{index + 1}</span></div>
              <p className="mt-1.5 text-[15px] font-extrabold tracking-[-0.02em] text-ink">{shortRupiah(term.amount)}</p>
              <p className="text-[9px] font-bold text-accent">{term.percent}%</p>
              <p className="mt-1 text-[8.5px] leading-4 text-label">{term.note}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="rab-versi" className="scroll-mt-16 pt-6" aria-labelledby="versi-title">
        <SectionHeader id="versi-title" eyebrow="Versi" title="Snapshot & perbandingan" action={<div className="flex gap-1.5"><Button variant="secondary" size="sm" onClick={() => toggleLockRates(project.id)}><Lock className="h-3 w-3" /> {project.ratesLocked ? "Buka kunci" : "Kunci harga"}</Button><Button variant="secondary" size="sm" onClick={() => setVersionOpen(true)}><Plus className="h-3 w-3" /> Versi</Button></div>} />
        {versions.length === 0 ? (
          <EmptyState compact icon={<History className="h-5 w-5" />} title="Belum ada versi tersimpan" description="Simpan snapshot model + harga untuk membandingkan skenario tanpa kehilangan versi sekarang." action={<Button size="sm" onClick={() => setVersionOpen(true)}>Simpan versi pertama</Button>} />
        ) : (
          <div className="space-y-2">
            {comparison && (
              <Card className="p-3.5">
                <div className="flex items-center justify-between gap-2"><p className="text-[10.5px] font-extrabold text-ink">{versions[1].label} → {versions[0].label}</p><Badge tone={comparison.diff >= 0 ? "amber" : "green"}>{comparison.diff >= 0 ? "+" : ""}{shortRupiah(comparison.diff)} ({comparison.percent}%)</Badge></div>
                
              </Card>
            )}
            {versions.map((version) => <VersionRow key={version.id} version={version} currentTotal={rab.total} />)}
          </div>
        )}
      </section>

      <div className="mt-6 rounded-xl border border-line bg-white p-3.5 text-[9px] leading-4 text-muted">
        <p className="flex items-start gap-1.5"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> Ekspor menyertakan kop, data proyek, label, tanggal harga, rincian per paket, rekap, PPN, total terbilang, asumsi, tanda tangan, isometrik, dan denah. “RAB indikatif bukan penawaran mengikat; hitung ulang bila gambar kerja berbeda.”</p>
      </div>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Ekspor RAB" description="Hanya ekspor yang memakai layout lebar. Di layar, semua data disajikan responsif.">
        <div className="grid gap-2 sm:grid-cols-2">
          <ExportButton icon={<Printer className="h-4 w-4" />} title="PDF / cetak A4" description="Kop, 3D, denah, rincian, asumsi, tanda tangan" onClick={() => { printRab(project, rab); toast("Menyiapkan cetak A4", "Gunakan Simpan sebagai PDF di dialog browser.", "info"); }} />
          <ExportButton icon={<FileSpreadsheet className="h-4 w-4" />} title="Excel / CSV" description="Rincian per baris, rekap, disclaimer" onClick={() => { downloadText(`rab-${project.name.toLowerCase().replace(/\s+/g, "-")}.csv`, rabCsv(project, rab), "text/csv;charset=utf-8"); toast("CSV diunduh", "Pemisah titik koma untuk Excel Indonesia."); }} />
          <ExportButton icon={<FileJson className="h-4 w-4" />} title="JSON proyek" description="Project + BuildingModel + hasil RAB" onClick={() => { downloadText(`proyek-${project.id}.json`, projectJson(project, rab), "application/json"); toast("JSON diunduh", "Dapat diimpor kembali lewat Menu → Impor/Ekspor."); }} />
          <ExportButton icon={<MessageCircle className="h-4 w-4" />} title="Teks WhatsApp" description="Ringkas, kisaran, disclaimer" onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(whatsappSummary(project, rab))}`, "_blank", "noopener,noreferrer"); }} />
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3 text-[9.5px] leading-4 text-[#92400e]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> RAB indikatif bukan penawaran mengikat; hitung ulang bila gambar kerja berbeda. Data contoh belum terverifikasi.</div>
      </Modal>

      <Modal open={versionOpen} onClose={() => setVersionOpen(false)} title="Simpan versi RAB" description={`Snapshot model, total, dan ${project.ratesLocked ? "harga terkunci" : "acuan harga saat ini"}.`} footer={<div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setVersionOpen(false)}>Batal</Button><Button size="sm" onClick={() => { saveVersion(project, rab, versionLabel || `Versi ${versions.length + 1}`); setVersionOpen(false); setVersionLabel(""); }}>Simpan versi</Button></div>}>
        <Field label="Nama versi" htmlFor="version-label"><input id="version-label" value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} className={inputClass} placeholder={`Versi ${versions.length + 1} — mis. atap limasan`} /></Field>
        <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl border border-line bg-[#fbfdfc] p-3"><p className="text-[8.5px] font-bold uppercase text-label">Total sekarang</p><p className="mt-1 text-[14px] font-extrabold text-ink">{shortRupiah(rab.total)}</p></div><div className="rounded-xl border border-line bg-[#fbfdfc] p-3"><p className="text-[8.5px] font-bold uppercase text-label">Akurasi</p><p className="mt-1 text-[14px] font-extrabold text-ink">{rab.completeness}% · {rab.confidence}</p></div></div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah item kustom" description="Item baru ditandai Perlu cek dan langsung masuk paket pilihanmu." footer={<Button size="sm" onClick={() => setAddOpen(false)}>Tutup</Button>}>
        <ExtraItemForm onAdd={(item) => { addExtraItem(project.id, item); setAddOpen(false); }} />
      </Modal>

      {editItem && <FormulaEditor item={editItem} onClose={() => setEditItem(null)} onSave={(patch) => { setBoqOverride(project.id, editItem.id, patch); setEditItem(null); }} />}

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Laporkan angka yang salah" description="Masuk buku koreksi lokal. Hanya prior default yang bisa berubah setelah persetujuan; koefisien engine tidak." footer={<div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setReportOpen(false)}>Batal</Button><Button size="sm" onClick={submitReport}>Simpan koreksi</Button></div>}>
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-[#fbfdfc] p-3"><p className="text-[9px] font-bold uppercase text-label">Total sekarang</p><p className="mt-1 text-[19px] font-extrabold text-ink">{rupiah(rab.total)}</p><p className="text-[10px] text-muted">{rab.label} · {project.model.area} m² · {project.model.finishing}</p></div>
          <Field label="Yang benar berapa?" htmlFor="report-number"><input id="report-number" value={reportValue} onChange={(event) => setReportValue(event.target.value)} className={inputClass} placeholder="Contoh: 241000000" /></Field>
          <Field label="Catatan (opsional)" htmlFor="report-note"><textarea id="report-note" rows={3} value={reportNote} onChange={(event) => setReportNote(event.target.value)} className="w-full rounded-xl border border-line px-3 py-2.5 text-[12px] outline-none focus:border-[#a7d7c6]" placeholder="Bagian mana yang perlu diperbaiki?" /></Field>
        </div>
      </Modal>
    </div>
  );
}

function SectionHeader({ id, eyebrow, title, action }: { id: string; eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2"><div><Eyebrow>{eyebrow}</Eyebrow><h2 id={id} className="mt-1 text-[15px] font-extrabold tracking-[-0.02em] text-ink sm:text-[17px]">{title}</h2></div>{action}</div>;
}

function AuditRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-lg border border-[#e9f0ec] bg-white px-2 py-1.5"><p className="text-[7.5px] font-bold uppercase tracking-[0.05em] text-label">{label}</p><p className={cn("mt-0.5 text-[9px] font-semibold break-words text-[#405160]", mono && "font-mono text-[8.5px]")}>{value}</p></div>;
}

function ExportButton({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex min-h-[76px] items-start gap-3 rounded-xl border border-line bg-white p-3 text-left transition-colors hover:border-[#a7d7c6] hover:bg-[#f8fcfa]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef7f2] text-accent">{icon}</span><span><span className="block text-[11px] font-extrabold text-ink">{title}</span><span className="mt-0.5 block text-[9px] leading-4 text-label">{description}</span></span></button>;
}

function CurveChart({ data }: { data: { week: number; planned: number; actual?: number }[] }) {
  const width = 560;
  const height = 160;
  const padX = 34;
  const padY = 18;
  const x = (week: number) => padX + ((week - 1) / Math.max(1, data.length - 1)) * (width - padX * 2);
  const y = (percent: number) => height - padY - (percent / 100) * (height - padY * 2);
  const planned = data.map((row) => `${x(row.week)},${y(row.planned)}`).join(" ");
  const actual = data.filter((row) => row.actual !== undefined).map((row) => `${x(row.week)},${y(row.actual!)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[150px] w-full" role="img" aria-label="Kurva S progres rencana">
      {[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line x1={padX} x2={width - padX} y1={y(tick)} y2={y(tick)} stroke="#EDF2EF" strokeWidth="1" /><text x={padX - 6} y={y(tick) + 3} textAnchor="end" fontSize="7.5" fill="#8A99A6">{tick}%</text></g>)}
      <polyline points={planned} fill="none" stroke="#157F5F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={planned} fill="none" stroke="#157F5F" strokeOpacity=".08" strokeWidth="14" strokeLinejoin="round" transform="translate(0 4)" />
      {actual && <polyline points={actual} fill="none" stroke="#1D4ED8" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />}
      {data.map((row) => <g key={row.week}><circle cx={x(row.week)} cy={y(row.planned)} r="2.6" fill="#fff" stroke="#157F5F" strokeWidth="2" />{row.actual !== undefined && <circle cx={x(row.week)} cy={y(row.actual)} r="2.4" fill="#1D4ED8" />}<text x={x(row.week)} y={height - 4} textAnchor="middle" fontSize="7.5" fill="#8A99A6">M{row.week}</text></g>)}
    </svg>
  );
}

function VersionRow({ version, currentTotal }: { version: ScenarioVersion; currentTotal: number }) {
  const diff = currentTotal - version.total;
  return (
    <Card className="flex flex-wrap items-center gap-3 p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef7f2] text-accent"><History className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-extrabold text-ink">{version.label}</p><p className="text-[8.5px] text-label">{formatDate(version.createdAt)} · {version.completeness}% akurasi {version.pricesLocked ? "· harga terkunci" : ""}</p></div>
      <div className="text-right"><p className="text-[11px] font-extrabold text-ink">{rupiah(version.total)}</p><p className={cn("text-[8.5px] font-bold", diff === 0 ? "text-label" : diff > 0 ? "text-[#b45309]" : "text-accent")}>{diff === 0 ? "sama dengan sekarang" : `${diff > 0 ? "+" : "−"}${shortRupiah(Math.abs(diff))} dari sekarang`}</p></div>
    </Card>
  );
}

function FormulaEditor({ item, onClose, onSave }: { item: BoqItem; onClose: () => void; onSave: (patch: { volume?: number; unitPrice?: number; formula?: string }) => void }) {
  const [formula, setFormula] = useState(item.rumus);
  const [volume, setVolume] = useState(String(item.volume));
  const [unitPrice, setUnitPrice] = useState(String(item.directUnitPrice ?? item.unitPrice));
  const { engine } = useEstimator();
  const preview = engine.previewFormula(formula, item.variables);
  return (
    <Modal open onClose={onClose} title="Ubah volume & koefisien" description={item.uraian} footer={<div className="flex items-center justify-between gap-2"><p className="text-[9px] font-semibold text-[#5b6b7a]">Biaya langsung baru: <strong className="text-ink">{preview.ok ? rupiah(Math.round(Math.round(preview.value * 100) / 100 * (Number(unitPrice) || item.unitPrice))) : "—"}</strong></p><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={onClose}>Batal</Button><Button size="sm" disabled={!preview.ok} onClick={() => onSave({ formula, volume: preview.ok ? preview.value : item.volume, unitPrice: Number(unitPrice) !== (item.directUnitPrice ?? item.unitPrice) ? Number(unitPrice) : undefined })}>Simpan override</Button></div></div>}>
      <div className="space-y-3">
        <Field label="Rumus volume" hint="+ − × ÷, ( ), min max round ceil floor" htmlFor="formula-input"><input id="formula-input" value={formula} onChange={(event) => setFormula(event.target.value)} className={cn(inputClass, "font-mono text-[12px]")} spellCheck={false} /></Field>
        <div className={cn("rounded-xl border px-3 py-2 text-[10px]", preview.ok ? "border-[#c9e7da] bg-[#f4fbf7] text-[#28604b]" : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]")}>
          {preview.ok ? <>Pratinjau volume <strong>{numberId(preview.value, 2)} {item.satuan}</strong> · sebelum dibulatkan ke 2 desimal.</> : <>Rumus ditolak: {preview.error}</>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Volume manual" htmlFor="volume-input"><input id="volume-input" type="number" value={volume} onChange={(event) => { setVolume(event.target.value); setFormula(event.target.value); }} className={inputClass} /></Field>
          <Field label="Harga langsung per satuan (Rp)" htmlFor="price-input"><input id="price-input" type="number" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} className={inputClass} /></Field>
        </div>
        <div><p className="mb-1 text-[9px] font-bold uppercase tracking-[0.06em] text-label">Variabel tersedia</p><div className="flex flex-wrap gap-1">{Object.entries(item.variables).map(([key, value]) => <button key={key} onClick={() => setFormula(key)} className="rounded-md border border-line bg-[#fbfdfc] px-1.5 py-1 font-mono text-[8.5px] text-[#4f675c] hover:border-[#a7d7c6]">{key}={numberId(value, 2)}</button>)}</div></div>
        <p className="flex items-start gap-1.5 rounded-lg bg-[#fffbeb] px-2.5 py-2 text-[9px] leading-4 text-[#92400e]"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> Rumus dijalankan parser tanpa eval. Override pengguna ditandai dan tetap kelas Perlu cek.</p>
      </div>
    </Modal>
  );
}

function ExtraItemForm({ onAdd }: { onAdd: (item: BoqItem) => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("m²");
  const [volume, setVolume] = useState("");
  const [price, setPrice] = useState("");
  const [packageKey, setPackageKey] = useState("persiapan");
  const submit = () => {
    if (!name.trim() || !volume || !price) return;
    const numVolume = Number(volume);
    const numPrice = Number(price);
    onAdd({
      id: `extra-${Date.now()}`,
      packageKey,
      packageLabel: PACKAGE_LABELS[packageKey] ?? "Lain-lain",
      uraian: name.trim(),
      satuan: unit,
      volume: numVolume,
      unitPrice: numPrice,
      amount: Math.round(numVolume * numPrice),
      rumus: String(numVolume),
      variables: {},
      kelasSumber: "terukur",
      keyakinan: "Perlu cek",
      workItemId: "kustom",
      komponen: [],
      faktor: [{ nama: "Item kustom pengguna", nilai: 1, sumber: "input manual" }],
      verified: false,
      custom: true,
      priceDate: new Date().toISOString().slice(0, 10),
      isStructure: false,
    });
  };
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Uraian item" htmlFor="extra-name"><input id="extra-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Contoh: pagar besi hollow" /></Field></div>
      <Field label="Paket" htmlFor="extra-package"><select id="extra-package" value={packageKey} onChange={(event) => setPackageKey(event.target.value)} className={inputClass}>{Object.entries(PACKAGE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      <Field label="Satuan" htmlFor="extra-unit"><input id="extra-unit" value={unit} onChange={(event) => setUnit(event.target.value)} className={inputClass} /></Field>
      <Field label="Volume" htmlFor="extra-volume"><input id="extra-volume" type="number" value={volume} onChange={(event) => setVolume(event.target.value)} className={inputClass} /></Field>
      <Field label="Harga satuan (Rp)" htmlFor="extra-price"><input id="extra-price" type="number" value={price} onChange={(event) => setPrice(event.target.value)} className={inputClass} /></Field>
      <div className="sm:col-span-2"><Button size="sm" className="w-full" disabled={!name.trim() || !volume || !price} onClick={submit}><Plus className="h-3.5 w-3.5" /> Tambahkan item</Button></div>
    </div>
  );
}
