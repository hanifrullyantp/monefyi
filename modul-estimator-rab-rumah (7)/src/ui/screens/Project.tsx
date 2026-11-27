import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronRight, FileText, Flag, LayoutGrid, MapPin, MessageSquare, Mic, MicOff, Pencil, Percent, Save, Send, ShieldAlert, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp, WandSparkles } from "lucide-react";
import type { BuildingModel, Project, Provenance, RabResult } from "../../data/types";
import { CONFIG, FINISHING_LABEL, ROOF_LABEL } from "../../data/config";
import { questionCounts, type InterviewQuestion } from "../../ai/interviewer";
import { useEstimator, useNextQuestion, useRab } from "../context";
import { AIInsightCard, Badge, Button, Card, Eyebrow, Modal, SourceTag, inputClass } from "../components";
import { SpecPanel } from "./SpecPanel";
import { FacadePanel } from "./FacadePanel";
import { AiChat, AiChatSheet } from "../AiChat";
import { validateLayout } from "../../geometry/validate";
import { ModelViewer } from "../../viz3d/Viewer";
import { numberId, rupiah, shortRupiah } from "../format";
import { cn } from "../../utils/cn";
import { BackChip } from "../Shell";

type SpeechLike = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }>; resultIndex: number }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };

export function useSpeech(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");
  const ref = useRef<SpeechLike | null>(null);
  const toggle = () => {
    if (listening) { ref.current?.stop(); setListening(false); return; }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechLike; webkitSpeechRecognition?: new () => SpeechLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setNote("Input suara tidak didukung browser ini — gunakan teks."); return; }
    const r = new Ctor();
    r.lang = "id-ID";
    r.interimResults = true;
    r.onresult = (e) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; onText(t); setNote("Transkrip bisa diedit sebelum dikirim."); };
    r.onerror = () => { setNote("Suara tidak terbaca. Coba lagi atau ketik."); setListening(false); };
    r.onend = () => setListening(false);
    ref.current = r;
    try { r.start(); setListening(true); setNote("Mendengarkan…"); } catch { setNote("Mikrofon tidak dapat dimulai."); }
  };
  return { listening, note, toggle };
}

interface AssumptionDef { title: string; description: string; choices: { label: string; value: string | number; note?: string }[]; free?: { label: string; suffix?: string } }
const ASSUMPTIONS: Record<string, AssumptionDef> = {
  area: { title: "Luas bangunan", description: `Mengubah luas menyusun ulang denah dan 3D. Batas modul 18–${CONFIG.maxArea} m².`, choices: [36, 45, 54, 70, 100].map((n) => ({ label: `${n} m²`, value: n })), free: { label: "Luas lain", suffix: "m²" } },
  floors: { title: "Jumlah lantai", description: "3 lantai wajib review estimator manusia.", choices: [1, 2, 3].map((n) => ({ label: `${n} lantai`, value: n })) },
  bedrooms: { title: "Kamar tidur", description: "Memengaruhi denah, dinding dalam, dan kusen.", choices: [1, 2, 3, 4].map((n) => ({ label: `${n} kamar`, value: n })) },
  bathrooms: { title: "Kamar mandi", description: "Area basah, sanitair, dan pelapis kedap air.", choices: [1, 2, 3].map((n) => ({ label: `${n} kamar mandi`, value: n })) },
  roof: { title: "Bentuk atap", description: "Bentuk, kemiringan, dan overhang menentukan luas atap.", choices: Object.entries(ROOF_LABEL).map(([value, label]) => ({ label, value })) },
  finishing: { title: "Kelas finishing", description: "Memilih analisis keramik, pintu, cat, dan sanitair.", choices: [{ label: "Standar", value: "standar", note: "hemat" }, { label: "Menengah", value: "menengah", note: "paling umum" }, { label: "Premium", value: "premium", note: "lebih awet" }] },
  foundation: { title: "Pondasi", description: "Struktur tetap “estimasi struktur” sampai ada gambar kerja.", choices: [{ label: "Batu kali", value: "batu_kali" }, { label: "Footplat", value: "footplat" }, { label: "Cerucuk (tanah lunak)", value: "cerucuk" }] },
  landArea: { title: "Luas tanah", description: "Untuk pembersihan lahan dan area luar.", choices: [72, 90, 120, 150].map((n) => ({ label: `${n} m²`, value: n })), free: { label: "Luas tanah", suffix: "m²" } },
  location: { title: "Lokasi", description: "Indeks wilayah per jenis (tenaga, bahan, alat).", choices: Object.keys(CONFIG.regionIndex).filter((c) => c !== "Lainnya").map((c) => ({ label: c, value: c })) },
  openings: { title: "Pintu & jendela", description: "Luas bukaan mengurangi luas dinding.", choices: [{ label: "5 pintu · 6 jendela", value: "5/6" }, { label: "7 pintu · 9 jendela", value: "7/9" }, { label: "9 pintu · 12 jendela", value: "9/12" }] },
  electrical: { title: "Titik listrik", description: "Lampu, saklar, stop kontak.", choices: [8, 12, 16].map((n) => ({ label: `${n} titik`, value: n })) },
  water: { title: "Titik air", description: "Kran, shower, wastafel, dapur.", choices: [3, 5, 7].map((n) => ({ label: `${n} titik`, value: n })) },
};
const SOURCE_LABEL: Record<Provenance, string> = { pengguna: "dari kamu", usulan_ai: "usulan AI", aturan_parametrik: "aturan otomatis", default_config: "default" };

export function ProjectScreen({ project }: { project: Project }) {
  const { editAssumption, saveProject, navigate, swapProjectRooms, addCorrection, setPpnEnabled, state } = useEstimator();
  const { rab, error } = useRab(project);
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const m = project.model;
  const layoutIssues = useMemo(() => validateLayout(m, m.rooms).issues, [m]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCondensed(!entry.isIntersecting), { threshold: 0, rootMargin: "-56px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const chips: [string, string][] = [
    ["area", `${numberId(m.area, 1)} m²`], ["floors", `${m.floors} lantai`], ["roof", ROOF_LABEL[m.roof.type]], ["finishing", FINISHING_LABEL[m.finishing]],
    ["bedrooms", `${m.bedrooms} KT`], ["bathrooms", `${m.bathrooms} KM`], ["location", m.location],
  ];

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 pt-2">
        <div className="min-w-0">
          <BackChip label="Proyek" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="max-w-full truncate text-[22px] font-extrabold leading-tight tracking-[-0.035em] text-ink sm:text-[26px]">{project.name}</h1>
            {rab && <Badge tone={rab.label === "RAB DETAIL" ? "blue" : "green"}>{rab.label}</Badge>}
            {project.ratesLocked && <Badge tone="neutral">harga terkunci</Badge>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] font-medium text-muted"><MapPin className="h-3.5 w-3.5" /> {m.location} · {numberId(m.area, 1)} m² · {m.floors} lantai <span className="text-accent">· tersimpan otomatis</span></p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="secondary" onClick={() => navigate({ name: "layout", projectId: project.id })}><LayoutGrid className="h-4 w-4" /> Editor denah</Button>
          <Button variant="secondary" onClick={() => navigate({ name: "planner", projectId: project.id })}><Target className="h-4 w-4" /> Planner harga</Button>
          <Button onClick={() => navigate({ name: "rab", projectId: project.id })}><FileText className="h-4 w-4" /> RAB lengkap</Button>
          <Button variant="secondary" onClick={() => saveProject(project.id)} aria-label="Simpan proyek"><Save className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Bar sticky tipis saat ringkasan tergulung */}
      <div className={cn("sticky top-0 z-30 -mx-4 mb-2 border-b border-line bg-white/95 px-4 backdrop-blur transition-[height,opacity] duration-200 sm:-mx-6 sm:px-6", condensed && rab ? "h-[56px] opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0")}
        style={window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? { transition: "none" } : undefined}>
        {rab && (
          <button onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} className="flex h-[56px] w-full items-center gap-3 text-left" aria-label="Kembali ke ringkasan atas">
            <span className="flex flex-1 items-baseline gap-1.5"><span className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-label">Total RAB</span><span className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">{rupiah(rab.total)}</span></span>
            <span className="hidden items-baseline gap-1.5 sm:flex"><span className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-label">RAP</span><span className="text-[13px] font-extrabold text-ink">{shortRupiah(rab.rap.rap)}</span></span>
            <span className="flex items-baseline gap-1.5"><span className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-label">Margin</span><span className="text-[13px] font-extrabold text-accent">{shortRupiah(rab.rap.margin)}</span></span>
          </button>
        )}
      </div>

      {error && <div role="alert" className="mb-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#991b1b]">Engine gagal: {error}</div>}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,.95fr)]">
        {/* Ringkasan: atas di mobile, kanan di desktop */}
        <div className="order-1 min-w-0 lg:col-start-2 lg:row-start-1" ref={heroRef}>
          {rab ? <Summary rab={rab} project={project} chips={chips} onChip={setSheetKey} onReport={() => setReportOpen(true)} onTogglePpn={() => setPpnEnabled(project.id, !(project.ppnEnabled ?? true))} ppnPercent={state.settings.ppnPercent} issues={layoutIssues.length} /> : <div className="skeleton h-[300px] rounded-[20px]" aria-label="Menghitung RAB" />}
        </div>

        {/* 3D sticky kiri di desktop */}
        <div className="order-2 min-w-0 space-y-3 lg:sticky lg:top-3 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:self-start">
          {rab ? <ModelViewer model={m} rab={rab} facade={project.facade} spec={project.spec} onSwap={(a, b) => swapProjectRooms(project.id, a, b)} issues={layoutIssues} /> : <div className="skeleton h-[360px] rounded-[18px]" />}
          {project.qualityFlag && <p className="flex items-start gap-1.5 rounded-xl bg-ai-soft px-3 py-2 text-[11px] leading-4 text-[#6d28d9]"><WandSparkles className="mt-0.5 h-3 w-3 shrink-0" /> {project.qualityFlag}</p>}
        </div>

        <div className="order-3 min-w-0 space-y-3 lg:col-start-2">
          {rab && rab.warnings.length > 0 && (
            <div className="rounded-[14px] border border-[#fde68a] bg-[#fffbeb] px-3.5 py-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#92400e]"><ShieldAlert className="h-4 w-4" /> Perlu perhatian</p>
              <ul className="mt-1 space-y-0.5 text-[11px] leading-4 text-[#8a5a0a]">{rab.warnings.slice(0, 3).map((w) => <li key={w}>• {w}</li>)}</ul>
            </div>
          )}
          {rab && <Wizard project={project} rab={rab} onEdit={setSheetKey} />}
          {rab && <Packages rab={rab} onOpen={() => navigate({ name: "rab", projectId: project.id })} />}
          <SpecPanel project={project} onOpenPlanner={() => navigate({ name: "planner", projectId: project.id })} />
          <FacadePanel project={project} />
          <div className="hidden lg:block"><AiChat project={project} rab={rab} /></div>
          {rab && (
            <AIInsightCard action={<Badge tone="violet"><Sparkles className="h-2.5 w-2.5" /> tanpa rupiah</Badge>}>
              <p className="text-[12px] font-bold text-[#4b356c]">{rab.completenessDetail.filter((d) => !d.confirmed).length} variabel masih memakai default.</p>
              <p className="mt-1 text-[11px] leading-5">Belum dikonfirmasi: {rab.completenessDetail.filter((d) => !d.confirmed).map((d) => d.label.toLowerCase()).join(", ") || "tidak ada"}. AI hanya menyusun pertanyaan; seluruh angka dari engine.</p>
            </AIInsightCard>
          )}
        </div>
      </div>

      <button onClick={() => setChatOpen(true)} aria-label="Buka asisten AI" className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-ai text-white shadow-[0_12px_30px_-10px_rgba(124,58,237,.7)] lg:hidden">
        <MessageSquare className="h-5 w-5" />
      </button>
      <AiChatSheet project={project} rab={rab} open={chatOpen} onClose={() => setChatOpen(false)} />

      <AssumptionSheet sheetKey={sheetKey} project={project} onClose={() => setSheetKey(null)} onChange={(k, v) => { editAssumption(project.id, k, v); setSheetKey(null); }} onReport={() => { setSheetKey(null); setReportOpen(true); }} />
      {rab && <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} rab={rab} onSubmit={(value, note) => {
        const numeric = Number(value.replace(/[^\d]/g, ""));
        addCorrection({ id: `corr-${Date.now()}`, projectId: project.id, context: { type: m.type, area: m.area, floors: m.floors, location: m.location, finishing: m.finishing }, field: "laporan_total", proposed: rab.total, corrected: numeric > 0 ? numeric : value, at: new Date().toISOString(), approval: "pending", source: "pengguna", total: numeric > 0 ? numeric - rab.total : undefined, perPackage: note ? { catatan: 1 } : undefined });
        setReportOpen(false);
      }} />}
    </div>
  );
}

function Summary({ rab, project, chips, onChip, onReport, onTogglePpn, ppnPercent, issues }: { rab: RabResult; project: Project; chips: [string, string][]; onChip: (k: string) => void; onReport: () => void; onTogglePpn: () => void; ppnPercent: number; issues: number }) {
  const [delta, setDelta] = useState<number | null>(null);
  const prev = useRef(rab.total);
  useEffect(() => {
    if (prev.current !== rab.total) {
      setDelta(rab.total - prev.current);
      prev.current = rab.total;
      const t = setTimeout(() => setDelta(null), 2800);
      return () => clearTimeout(t);
    }
  }, [rab.total]);
  const confirmedCount = rab.completenessDetail.filter((d) => d.confirmed).length;
  return (
    <section aria-labelledby="total-title" className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#064E3B_0%,#047857_54%,#059669_100%)] p-4 text-white sm:p-5">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-white">Total dibayar pembeli · {rab.label}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
          <h2 id="total-title" className="text-[30px] font-extrabold leading-none tracking-[-0.045em] text-white sm:text-[36px]">{rupiah(rab.total)}</h2>
          {delta !== null && delta !== 0 && <span className="pop-in inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-1 text-[11px] font-extrabold text-[#064E3B]">{delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{delta > 0 ? "+" : "−"}{shortRupiah(Math.abs(delta))}</span>}
        </div>
        <p className="mt-1.5 text-[12px] text-white">Kisaran P10–P90 <strong>{shortRupiah(rab.p10)} – {shortRupiah(rab.p90)}</strong> · {shortRupiah(rab.perM2)}/m²</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-[12px] border border-white/20 bg-white/10 px-2.5 py-2">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-white">RAP (modal)</p>
            <p className="text-[15px] font-extrabold text-white">{shortRupiah(rab.rap.rap)}</p>
            <p className="text-[10px] text-white/85">langsung + tak langsung + kontingensi</p>
          </div>
          <div className="rounded-[12px] border border-white/20 bg-white/10 px-2.5 py-2">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-white">Margin</p>
            <p className="text-[15px] font-extrabold text-white">{shortRupiah(rab.rap.margin)}</p>
            <p className="text-[10px] text-white/85">{rab.rap.marginPercent}% dari harga jual</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={onTogglePpn} aria-pressed={project.ppnEnabled ?? true} className={cn("flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-[11.5px] font-bold", (project.ppnEnabled ?? true) ? "border-white/40 bg-white/20 text-white" : "border-white/20 bg-white/5 text-white/80")}>
            <Percent className="h-3.5 w-3.5" /> PPN {ppnPercent}% {(project.ppnEnabled ?? true) ? "aktif" : "nonaktif"}
            <span className={cn("ml-1 h-4 w-7 rounded-full p-0.5 transition-colors", (project.ppnEnabled ?? true) ? "bg-white/70" : "bg-white/25")}>
              <span className={cn("block h-3 w-3 rounded-full bg-[#065F46] transition-transform", (project.ppnEnabled ?? true) && "translate-x-3")} />
            </span>
          </button>
          {(project.ppnEnabled ?? true) && <span className="text-[11px] text-white/90">Sebelum PPN {rupiah(rab.rap.sellingPrice)} · PPN {rupiah(rab.ppn)}</span>}
          {project.targets?.sellingPrice && (
            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
              Selisih harga jual ke target {shortRupiah(rab.rap.sellingPrice - project.targets.sellingPrice)}
            </span>
          )}
          {issues > 0 && <span className="rounded-full border border-[#FCA5A5]/50 bg-[#7F1D1D]/30 px-2.5 py-1 text-[11px] font-bold text-white">{issues} temuan denah</span>}
        </div>
        <div className="mt-3 rounded-[14px] border border-white/20 bg-white/10 p-3">
          <div className="flex items-center justify-between text-[12px] font-bold text-white"><span>Kelengkapan data</span><span>{rab.completeness}%</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={rab.completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Kelengkapan data"><div className="meter-fill h-full rounded-full bg-white" style={{ width: `${Math.max(3, rab.completeness)}%` }} /></div>
          <p className="mt-1.5 text-[11px] leading-4 text-white">{confirmedCount} dari {rab.completenessDetail.length} variabel penting sudah kamu konfirmasi — ini ukuran data terisi, bukan peluang akurasi.</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-white">Asumsi · ketuk untuk ubah</span>
          <button onClick={onReport} className="inline-flex min-h-[44px] items-center gap-1 text-[11px] font-semibold text-white underline underline-offset-2"><Flag className="h-3 w-3" /> Laporkan salah</button>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {chips.map(([key, label]) => {
            const a = project.model.assumptions[key];
            const tag = a?.answered && !a.confirmed ? "belum tahu" : a?.note?.includes("koreksi") ? "dari koreksi" : SOURCE_LABEL[a?.source ?? "default_config"];
            return (
              <button key={key} onClick={() => onChip(key)} className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 text-[12px] font-bold text-white hover:bg-white/20">
                {label}<span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold text-white">{tag}</span>
              </button>
            );
          })}
          <button onClick={() => onChip("landArea")} className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full border border-white/25 px-3 text-[12px] font-bold text-white"><Pencil className="h-3 w-3" /> Lainnya</button>
        </div>
      </div>
    </section>
  );
}

function Wizard({ project, rab, onEdit }: { project: Project; rab: RabResult; onEdit: (slot: string) => void }) {
  const { answerQuestion, startAccuracyPhase, saveProject, navigate } = useEstimator();
  const { question, loading } = useNextQuestion(project);
  const counts = questionCounts(project.model);
  const [text, setText] = useState("");
  const [recorded, setRecorded] = useState<{ summary: string[]; slot: string } | null>(null);
  const speech = useSpeech(setText);

  const submit = (q: InterviewQuestion, raw: string, useDefault = false) => {
    const res = answerQuestion(project.id, q, raw, useDefault);
    if (res.ok) { setRecorded({ summary: res.summary, slot: q.slots[0] }); setText(""); }
  };

  if (loading && !question) return <div className="skeleton h-[220px] rounded-[18px]" aria-label="Menyiapkan pertanyaan" />;

  if (!question) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-white p-4">
          <p className="flex items-center gap-2 text-[14px] font-extrabold text-ink"><CheckCircle2 className="h-5 w-5 text-accent" /> {project.stage === 1 ? "RAB indikatif siap" : "Semua pertanyaan lanjutan terjawab"}</p>
          <p className="mt-1 text-[12px] leading-5 text-muted">{project.stage === 1 ? `Kisaran saat ini ${shortRupiah(rab.p10)} – ${shortRupiah(rab.p90)}. Pertanyaan lanjutan menyempitkan kisaran; semuanya opsional.` : "Ubah asumsi dari chip kapan saja. Struktur tetap estimasi sampai ada gambar struktur."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.stage === 1 && <Button onClick={() => startAccuracyPhase(project.id)}>Tingkatkan akurasi <ArrowRight className="h-4 w-4" /></Button>}
            <Button variant="secondary" onClick={() => saveProject(project.id)}><Save className="h-4 w-4" /> Simpan</Button>
            <Button variant="ghost" onClick={() => navigate({ name: "rab", projectId: project.id })}>Lihat RAB <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" aria-live="polite">
      <div className="flex items-center justify-between gap-2 border-b border-[#eef2f0] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ai text-white"><WandSparkles className="h-4 w-4" /></span>
          <div><p className="text-[13px] font-extrabold text-ink">Asisten rencana</p><p className="text-[11px] text-label">Satu pertanyaan per langkah</p></div>
        </div>
        <Badge tone={project.stage === 1 ? "violet" : "blue"}>{project.stage === 1 ? `Penting ${Math.min(counts.done + 1, counts.total)}/${counts.total}` : "Tingkatkan akurasi"}</Badge>
      </div>
      {/* Bulatan status per item konfirmasi */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#EEF2F0] px-4 py-2.5" role="list" aria-label="Status konfirmasi data">
        {rab.completenessDetail.map((d) => {
          const a = project.model.assumptions[d.key];
          const state = d.confirmed ? "confirmed" : a?.answered ? "default" : "empty";
          return (
            <button key={d.key} role="listitem" onClick={() => onEdit(d.key)} title={`${d.label}: ${state === "confirmed" ? "dikonfirmasi" : state === "default" ? "default/usulan, perlu dicek" : "belum dikonfirmasi"}`}
              aria-label={`${d.label}: ${state === "confirmed" ? "dikonfirmasi" : state === "default" ? "default atau usulan, perlu dicek" : "belum dikonfirmasi"}`}
              className={cn("flex min-h-[34px] items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold transition-colors",
                state === "confirmed" ? "border-[#A7D7C6] bg-[#EEF8F2] text-accent" : state === "default" ? "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]" : "border-line bg-white text-label hover:text-ink")}>
              <span className={cn("h-2.5 w-2.5 rounded-full border", state === "confirmed" ? "border-accent bg-accent" : state === "default" ? "border-[#F59E0B] bg-[#FDE68A]" : "border-[#C6D2CC] bg-transparent")} />
              {d.label}
            </button>
          );
        })}
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-[4px_14px_14px_14px] border border-ai-line bg-ai-soft px-3 py-2.5">
          <p className="text-[14px] font-bold leading-5 text-[#2f2345]">{question.question}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#5b4a78]">{question.helper}</p>
          <p className="mt-1 text-[10px] font-semibold text-[#6d28d9]">Dampak ke kisaran: ±{shortRupiah(question.impact)} (dihitung engine)</p>
        </div>
        {recorded && (
          <div className="pop-in flex items-start justify-between gap-2 rounded-xl border border-[#d7efe3] bg-[#f5fbf8] px-3 py-2">
            <p className="text-[12px] font-semibold text-[#28604b]"><Check className="mr-1 inline h-3.5 w-3.5 text-accent" />Saya catat: {recorded.summary.join(", ")}.</p>
            <button onClick={() => onEdit(recorded.slot)} className="min-h-[44px] shrink-0 px-2 text-[11px] font-bold text-accent underline">Ubah</button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {question.chips.map((chip) => (
            <button key={chip.value} onClick={() => submit(question, chip.value)} className="flex min-h-[48px] flex-col items-start justify-center rounded-xl border border-line bg-white px-3 py-1.5 text-left hover:border-[#a7d7c6] hover:bg-[#f6fbf8]">
              <span className="text-[13px] font-bold text-ink">{chip.label}</span>
              {chip.note && <span className="text-[10px] text-label">{chip.note}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) submit(question, text); }}>
          <label htmlFor="wizard-answer" className="sr-only">{question.freeLabel}</label>
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white p-1 focus-within:border-[#a7d7c6] focus-within:ring-3 focus-within:ring-[#dcf3e9]">
            <input id="wizard-answer" value={text} onChange={(e) => setText(e.target.value)} placeholder={question.freeLabel} className="h-11 min-w-0 flex-1 bg-transparent px-2.5 text-[13px] text-ink outline-none placeholder:text-label" />
            <button type="button" onClick={speech.toggle} aria-label={speech.listening ? "Hentikan suara" : "Jawab dengan suara"} className={cn("flex h-11 w-11 items-center justify-center rounded-lg", speech.listening ? "bg-[#fef2f2] text-danger" : "bg-[#f4f7f5] text-muted")}>{speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
            <button type="submit" disabled={!text.trim()} aria-label="Kirim jawaban" className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div>
          {speech.note && <p className="mt-1 text-[11px] text-muted" role="status">{speech.note}</p>}
        </form>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => submit(question, "", true)} className="min-h-[44px] text-[12px] font-semibold text-muted underline underline-offset-2">Belum tahu — pakai default</button>
          <span className="inline-flex items-center gap-1 text-[10px] text-label"><ShieldCheck className="h-3 w-3" /> AI tidak membuat angka</span>
        </div>
      </div>
    </Card>
  );
}

function Packages({ rab, onOpen }: { rab: RabResult; onOpen: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#eef2f0] px-4 py-3">
        <div><Eyebrow>Rincian per paket</Eyebrow><p className="mt-1 text-[11px] text-label">{rab.items.length} baris BOQ dari analisis × harga komponen</p></div>
        <Button variant="ghost" onClick={onOpen} className="text-accent">Buka <ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="divide-y divide-[#f1f4f2] px-4">
        {rab.packages.slice().sort((a, b) => b.amount - a.amount).slice(0, 5).map((pkg) => (
          <div key={pkg.key} className="py-2.5">
            <div className="flex justify-between gap-2 text-[12px]"><span className="truncate font-bold text-ink">{pkg.label}</span><span className="shrink-0 font-extrabold text-ink">{shortRupiah(pkg.amount)}</span></div>
            <div className="mt-1 flex items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-[#edf2ef]"><div className="h-full rounded-full bg-[#7bb9a1]" style={{ width: `${Math.max(2, pkg.percent)}%` }} /></div><span className="w-10 text-right text-[10px] text-label">{pkg.percent}%</span></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AssumptionSheet({ sheetKey, project, onClose, onChange, onReport }: { sheetKey: string | null; project: Project; onClose: () => void; onChange: (k: string, v: string | number) => void; onReport: () => void }) {
  const def = sheetKey ? ASSUMPTIONS[sheetKey] : undefined;
  const [custom, setCustom] = useState("");
  const m = project.model;
  const a = sheetKey ? m.assumptions[sheetKey] : undefined;
  const current = sheetKey === "openings" ? `${m.doors}/${m.windows}` : sheetKey === "roof" ? m.roof.type : sheetKey === "electrical" ? String(m.electricalPoints) : sheetKey === "water" ? String(m.waterPoints) : sheetKey ? String(m[sheetKey as keyof BuildingModel] ?? "") : "";
  useEffect(() => setCustom(""), [sheetKey]);
  const otherKeys = Object.keys(ASSUMPTIONS).filter((k) => k !== sheetKey);
  return (
    <Modal open={Boolean(def)} onClose={onClose} title={def?.title ?? ""} description={def?.description} size="sm" footer={
      <div className="flex items-center justify-between gap-2">
        <button onClick={onReport} className="inline-flex min-h-[44px] items-center gap-1 text-[12px] font-semibold text-muted"><Flag className="h-3.5 w-3.5" /> Laporkan salah</button>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button>{def?.free && <Button disabled={!custom.trim()} onClick={() => onChange(sheetKey!, Number(custom.replace(",", ".")))}>Terapkan</Button>}</div>
      </div>
    }>
      {a && <p className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-[#fbfdfc] px-3 py-2 text-[12px] text-muted">Sekarang <strong className="text-ink">{current}</strong> <span className="flex items-center gap-1">Sumber: <SourceTag source={a.source} note={a.note} /></span></p>}
      <div className="grid grid-cols-2 gap-2">
        {def?.choices.map((c) => (
          <button key={c.value} onClick={() => onChange(sheetKey!, c.value)} className={cn("flex min-h-[52px] flex-col items-start justify-center rounded-xl border px-3 py-2 text-left", String(c.value) === current ? "border-accent bg-[#eef8f2]" : "border-line bg-white hover:border-[#b9d4c8]")}>
            <span className="flex items-center gap-1 text-[13px] font-bold text-ink">{String(c.value) === current && <Check className="h-3.5 w-3.5 text-accent" />}{c.label}</span>
            {c.note && <span className="text-[10px] text-label">{c.note}</span>}
          </button>
        ))}
      </div>
      {def?.free && (
        <div className="mt-3">
          <label htmlFor="custom-assumption" className="mb-1 block text-[12px] font-bold text-[#405160]">{def.free.label} ({def.free.suffix})</label>
          <input id="custom-assumption" type="number" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} className={inputClass} />
        </div>
      )}
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-1.5 text-[11px] font-bold text-label">Asumsi lain</p>
        <div className="flex flex-wrap gap-1.5">{otherKeys.map((k) => <span key={k} className="rounded-full border border-line px-2 py-1 text-[10px] text-muted">{ASSUMPTIONS[k].title}{m.assumptions[k]?.confirmed ? " ✓" : ""}</span>)}</div>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#f8faf9] px-3 py-2 text-[11px] leading-4 text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> Mengubah nilai usulan AI/default dicatat sebagai koreksi. RAB, denah, dan 3D dihitung ulang dari model yang sama.</p>
    </Modal>
  );
}

function ReportModal({ open, onClose, rab, onSubmit }: { open: boolean; onClose: () => void; rab: RabResult; onSubmit: (value: string, note: string) => void }) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Laporkan angka yang salah" description="Masuk buku koreksi lokal. Rumus & koefisien engine tidak diubah otomatis." footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button disabled={!value.trim()} onClick={() => { onSubmit(value, note); setValue(""); setNote(""); }}>Simpan koreksi</Button></div>}>
      <p className="text-[12px] text-muted">Total sekarang <strong className="text-ink">{rupiah(rab.total)}</strong></p>
      <label htmlFor="report-value" className="mt-3 block text-[12px] font-bold text-[#405160]">Yang benar berapa?</label>
      <input id="report-value" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} placeholder="Contoh: 225000000" />
      <label htmlFor="report-note" className="mt-3 block text-[12px] font-bold text-[#405160]">Catatan (opsional)</label>
      <textarea id="report-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-xl border border-line px-3 py-2 text-[13px] outline-none focus:border-[#a7d7c6]" />
      <p className="mt-2 flex items-center gap-1 text-[11px] text-[#92400e]"><AlertTriangle className="h-3 w-3" /> Disimpan lokal di perangkat ini.</p>
    </Modal>
  );
}
