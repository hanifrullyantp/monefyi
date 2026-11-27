import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, CalendarDays, ChevronDown, Command, FolderOpen, Layers,
  Loader2, MapPin, Mic, MicOff, MoreHorizontal, Plus, Search, Sparkles, X,
  Box, AlertTriangle, CloudCheck, Ruler, ArrowDownWideNarrow, MessageSquareText,
} from "lucide-react";
import type { EstimatorModuleProps, Project, RabResult } from "../../data/types";
import { formatDate, shortRupiah, rupiah } from "../format";
import { useEstimator } from "../context";
import { Button, Card, EmptyState, ErrorState, SearchField } from "../components";
import { ArchitectureBlueprint } from "../ArchitectureBlueprint";
import { WorkspaceSummary } from "../WorkspaceSummary";
import { MiniHouse } from "../../viz3d/Viewer";
import { cn } from "../../utils/cn";

const promptExamples = ["Buat RAB rumah tipe 45", "Buat rumah 2 lantai 120 m²", "Cari proyek Andi"];
const promptLabels = ["Rumah tipe 45", "Rumah 2 lantai", "Cari proyek"];

interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
  resultIndex: number;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechCtor = new () => SpeechRecognitionLike;

export function HomeScreen({ host }: { host: EstimatorModuleProps }) {
  const { projects, createProject, createBlankProject, navigate, toast, engine, error: storageError } = useEstimator();
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState<"semua" | "indikatif" | "detail">("semua");
  const [inlineMessage, setInlineMessage] = useState<{ tone: "warning" | "info" | "danger"; title: string; detail: string; manual?: boolean } | null>(null);
  const [menuCard, setMenuCard] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const projectSectionRef = useRef<HTMLDivElement>(null);
  const [seededAnswer, setSeededAnswer] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setPlaceholderIndex((index) => (index + 1) % promptExamples.length), 3800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const focus = () => searchRef.current?.focus();
    window.addEventListener("estimator:focus-search", focus);
    return () => window.removeEventListener("estimator:focus-search", focus);
  }, []);

  const { estimates: rabById, error: calculationError } = useRabMany(projects);
  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects
      .filter((project) => !project.archived)
      .filter((project) => (filter === "semua" ? true : (rabById[project.id]?.label === "RAB DETAIL" ? "detail" : "indikatif") === filter))
      .filter((project) => !query || `${project.name} ${project.location} ${project.model.type} ${project.model.area}`.toLowerCase().includes(query))
      .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "id") : sort === "cost" ? (rabById[b.id]?.total ?? 0) - (rabById[a.id]?.total ?? 0) : +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [projects, search, filter, rabById, sort]);

  const runVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const speechWindow = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceNote("Browser ini belum mendukung suara. Kamu tetap bisa menulis di kolom — transkrip suara tidak dipaksakan.");
      inputRef.current?.focus();
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setValue(transcript);
      setVoiceNote("Transkrip bisa diedit sebelum dikirim.");
    };
    recognition.onerror = (event) => {
      setVoiceNote(event.error === "not-allowed" ? "Izin mikrofon ditolak. Gunakan input teks." : "Suara tidak terbaca. Coba lagi atau ketik.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setVoiceNote("Mendengarkan… tekan mic lagi untuk berhenti.");
    } catch {
      setVoiceNote("Mikrofon tidak dapat dimulai. Gunakan input teks.");
    }
  };

  const submit = async (rawText?: string) => {
    const text = (rawText ?? value).trim();
    if (!text) { inputRef.current?.focus(); return; }
    setInlineMessage(null);
    setSeededAnswer(null);
    setThinking(true);
    try {
      const result = await engine.interpretText(text);
      setThinking(false);
      if (result.note) toast("Catatan AI", result.note, "warning");
      if (result.intent === "buat_baru") { setValue(""); createProject(result); return; }
      if (result.intent === "cari_proyek") {
        setSearch(result.slots.query ?? "");
        setTimeout(() => projectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        return;
      }
      if (result.intent === "buka_proyek") {
        const q = (result.slots.query ?? "").toLowerCase();
        const found = projects.find((p) => p.name.toLowerCase().includes(q));
        if (found) { navigate({ name: "project", projectId: found.id }); return; }
        setInlineMessage({ tone: "warning", title: "Proyek belum ketemu", detail: `Tidak ada proyek yang cocok dengan “${result.slots.query ?? ""}”.`, manual: true });
        return;
      }
      if (result.intent === "ubah_proyek") {
        setInlineMessage({ tone: "info", title: result.clarification ?? "Buka proyeknya, lalu ketuk chip asumsi", detail: "Perubahan asumsi langsung memperbarui RAB, denah, dan 3D." });
        return;
      }
      if (result.intent === "tanya") { setSeededAnswer(result.clarification ?? "Angka rupiah hanya dihitung engine."); return; }
      setInlineMessage({ tone: "warning", title: "Perlu satu klarifikasi", detail: result.clarification ?? "Mau buat RAB baru atau mencari proyek?", manual: true });
    } catch (error) {
      setThinking(false);
      setInlineMessage({ tone: "danger", title: "Perlu input manual", detail: `${error instanceof Error ? error.message : "Output tidak valid."} Tidak ada tebakan diam-diam.`, manual: true });
    }
  };

  const manualNew = () => createBlankProject();

  const active = projects.filter(p => !p.archived);
  return (
    <div className="estimator-workspace">
      <div className="workspace-heading">
        <div className="brand-lockup">
          <span className="studio-mark"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" aria-hidden="true"><path d="m6 18 14-10 14 10-14 8z"/><path d="M9 20.1v9.2l11 6.1 11-6.1v-9.2M20 26v9.4M13.7 17l6.3-4.4 6.3 4.4M16 24v5.1l-3.2-1.8v-5.1"/></svg></span>
          <div><p className="studio-eyebrow">FROYEK <i/> RUANG KERJA</p><h1>Estimator RAB Rumah</h1></div>
        </div>
        <div className="workspace-tools">
          <span className="local-status"><i/>{engine.mode === 'local' ? 'Workspace lokal' : 'Engine remote'}</span>
          <button className="command-trigger" aria-label="Buka palet perintah" onClick={() => window.dispatchEvent(new Event('estimator:commands'))}><Command size={15}/><span>Perintah</span><kbd>Ctrl K</kbd></button>
          <button className="user-monogram" onClick={() => navigate({ name: 'settings' })} aria-label="Buka pengaturan workspace" title={host.currentUser?.name ?? 'Pengaturan'}>{(host.currentUser?.name ?? 'R').slice(0,1).toUpperCase()}</button>
        </div>
      </div>

      <section className="estimator-hero" aria-labelledby="assistant-title">
        <div className="hero-paper-grid" aria-hidden="true"/>
        <div className="hero-sketch"><ArchitectureBlueprint /></div>
        <div className="hero-copy">
          <p className="assistant-overline"><Sparkles size={15} strokeWidth={1.75}/> ASISTEN ESTIMATOR</p>
          <h2 id="assistant-title">Mulai dari satu kalimat.</h2>
          <p className="hero-subtitle">Ceritakan rencana rumahmu. Dapatkan estimasi biaya, denah, dan model 3D.</p>
          <form onSubmit={e => { e.preventDefault(); void submit(); }}>
            <label className="sr-only" htmlFor="ai-command">Tulis apa yang mau kamu lakukan</label>
            <div className="prompt-input"><MessageSquareText className="prompt-symbol" size={19}/>
              <input ref={inputRef} id="ai-command" autoComplete="off" value={value} onChange={e => { setValue(e.target.value); setInlineMessage(null); }} placeholder={promptExamples[placeholderIndex] + '…'}/>
              <button type="button" className={cn('prompt-mic', listening && 'listening')} aria-label={listening ? 'Hentikan input suara' : 'Mulai input suara'} aria-pressed={listening} onClick={runVoice}>{listening ? <MicOff size={18}/> : <Mic size={18}/>}</button>
              <button type="submit" disabled={thinking} aria-label="Kirim perintah ke estimator" className="prompt-send">{thinking ? <Loader2 className="animate-spin" size={18}/> : <ArrowRight size={20}/>}</button>
            </div>
            <div className="prompt-examples"><span>Coba</span>{promptLabels.map((label, i) => <button type="button" key={label} onClick={() => { setValue(promptExamples[i]); inputRef.current?.focus(); }}>{label}<ArrowUpRight size={11}/></button>)}</div>
            {voiceNote && <p className="mt-1.5 flex items-start gap-1 px-1 text-[9px] font-medium text-muted" role="status"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ai" />{voiceNote}</p>}
            {thinking && <p className="mt-1.5 px-1 text-[9px] font-bold text-accent" role="status">Menyiapkan model, volume, dan RAB…</p>}
            {inlineMessage && (
              <div className={cn("mt-2 rounded-xl border px-3 py-2", inlineMessage.tone === "danger" ? "border-[#fecaca] bg-[#fef2f2]" : inlineMessage.tone === "info" ? "border-[#dbeafe] bg-[#eff6ff]" : "border-[#fde68a] bg-[#fffbeb]")}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className={cn("text-[10px] font-bold", inlineMessage.tone === "danger" ? "text-[#b91c1c]" : inlineMessage.tone === "info" ? "text-[#1e40af]" : "text-[#92400e]")}>{inlineMessage.title}</p>
                    <p className="mt-0.5 text-[9.5px] leading-4 text-muted">{inlineMessage.detail}</p>
                    {inlineMessage.manual && <button type="button" onClick={manualNew} className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-extrabold text-accent underline underline-offset-2">Buat dari default tipe 45 <ArrowRight className="h-3 w-3" /></button>}
                  </div>
                  <button type="button" aria-label="Tutup pesan" onClick={() => setInlineMessage(null)} className="text-label"><X className="h-3 w-3" /></button>
                </div>
              </div>
            )}
            {seededAnswer && (
              <div className="mt-2 rounded-xl border border-ai-line bg-ai-soft px-3 py-2">
                <p className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#6d28d9]"><Sparkles className="h-3 w-3" /> Analisa AI</p>
                <p className="mt-1 text-[10px] leading-4 text-[#5b4a78]">{seededAnswer}</p>
                <button type="button" onClick={() => { setSeededAnswer(null);setValue(promptExamples[0]);inputRef.current?.focus(); }} className="mt-1 text-[9px] font-bold text-[#6d28d9] underline underline-offset-2">Mulai dari rumah tipe 45</button>
              </div>
            )}
          </form>
        </div>
      </section>
      <div className="sample-notice" role="note"><span className="notice-icon"><AlertTriangle size={16}/></span><strong>Data contoh</strong><span className="notice-copy">Harga dan analisis belum diverifikasi untuk RAB nyata.</span><button onClick={() => navigate({ name: 'prices' })}>Periksa data <ArrowUpRight size={13}/></button></div>
      {(storageError || calculationError) && <ErrorState message={storageError || calculationError!}/>}
      <div className="workspace-body">
        <section ref={projectSectionRef} className="projects-section" aria-labelledby="projects-title">
          <div className="project-heading"><div><p className="section-kicker"><span/> PORTOFOLIO</p><h2 id="projects-title">Proyek saya <span>{active.length}</span></h2></div>
            <Button onClick={createBlankProject} className="new-project"><Plus size={16}/> Proyek baru</Button>
          </div>
          <div className="project-filters">
            <div className="filter-segment" role="group" aria-label="Filter status proyek">{(['semua','indikatif','detail'] as const).map(f => <button key={f} aria-pressed={filter === f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>{f === 'semua' ? 'Semua' : f === 'detail' ? 'RAB detail' : 'Indikatif'}</button>)}</div>
            <div className="project-search-tools"><SearchField id="project-search" ref={searchRef} icon={<Search size={14}/>} value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari proyek…" aria-label="Cari proyek"/>
              <label className="sort-control" title="Urutkan proyek"><ArrowDownWideNarrow size={15}/><select aria-label="Urutkan proyek" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Terbaru</option><option value="name">Nama A-Z</option><option value="cost">Nilai RAB</option></select><ChevronDown size={12}/></label>
            </div>
          </div>
          {visibleProjects.length ? <div className="project-grid">{visibleProjects.map(p => <ProjectCard key={p.id} project={p} rab={rabById[p.id]} menuOpen={menuCard === p.id} onMenu={() => setMenuCard(menuCard === p.id ? null : p.id)} onCloseMenu={() => setMenuCard(null)}/>)}</div>
            : <EmptyState icon={<FolderOpen size={22}/>} title={active.length ? 'Proyek tidak ditemukan' : 'Belum ada proyek'} description={active.length ? 'Coba kata kunci lain atau tampilkan semua status proyek.' : 'Mulai dengan menulis rencana rumah di asisten estimator.'} action={<Button onClick={() => { if (active.length) { setSearch('');setFilter('semua'); } else manualNew(); }}>{active.length ? 'Reset pencarian' : 'Buat proyek pertama'}</Button>}/>}
          <p className="project-storage"><CloudCheck size={14}/> {storageError ? 'Penyimpanan perlu diperiksa' : 'Proyek tersimpan otomatis di perangkat ini.'}</p>
        </section>
        <WorkspaceSummary projects={projects} estimates={rabById} unavailable={Boolean(calculationError)}/>
      </div>
    </div>
  );
}

function useRabMany(projects: Project[]) {
  const { engine, state } = useEstimator();
  const [map, setMap] = useState<Record<string, RabResult>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(projects.map(async (p) => [p.id, await engine.computeRab(p)] as const))
      .then(entries => { if (alive) { setMap(Object.fromEntries(entries));setError(null); } })
      .catch(e => { if (alive) { setMap({});setError(e instanceof Error ? e.message : "Estimasi belum tersedia."); } });
    return () => { alive = false; };
  }, [engine, projects, state.catalog, state.settings, state.calibrations]);
  return { estimates: map, error };
}

function ProjectCard({ project, rab, menuOpen, onMenu, onCloseMenu }: { project: Project; rab?: RabResult; menuOpen: boolean; onMenu: () => void; onCloseMenu: () => void }) {
  const { navigate, archiveProject, duplicateProject, toggleLockRates, setThumbnail } = useEstimator();
  const label = rab?.label;
  const openProject = () => navigate({ name: 'project', projectId: project.id });
  return <Card className="studio-project">
    <div className="project-visual">
      <button className="project-visual-link" onClick={openProject} aria-label={`Buka ${project.name}`}>
        <MiniHouse model={project.model} facade={project.facade} spec={project.spec} badge={false} thumbnail={project.thumbnail} thumbnailKey={project.thumbnailKey} onRendered={(key, url) => setThumbnail(project.id, key, url)} className="studio-model"/>
      </button>
      <span className="type-label"><Box size={12}/> TIPE {project.model.type}</span>
      <div className="project-more"><button aria-label={`Menu proyek ${project.name}`} aria-expanded={menuOpen} onClick={onMenu}><MoreHorizontal size={19}/></button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onCloseMenu} aria-hidden />
            <div role="menu" className="pop-in absolute right-0 top-12 z-20 w-[190px] rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,.3)]">
              {[
                { label: "Buka proyek", action: () => navigate({ name: "project", projectId: project.id }) },
                { label: "RAB lengkap & ekspor", action: () => navigate({ name: "rab", projectId: project.id }) },
                { label: "Input realisasi", action: () => navigate({ name: "actuals", projectId: project.id }) },
                { label: "Duplikat", action: () => duplicateProject(project.id) },
                { label: project.ratesLocked ? "Buka kunci harga" : "Kunci harga", action: () => toggleLockRates(project.id) },
                { label: "Arsipkan", action: () => archiveProject(project.id), danger: true },
              ].map((item) => (
                <button key={item.label} role="menuitem" onClick={() => { onCloseMenu(); item.action(); }} className={cn("flex min-h-[44px] w-full items-center rounded-lg px-2.5 text-left text-[12px] font-semibold hover:bg-[#f4f8f6]", item.danger ? "text-[#b91c1c]" : "text-[#405160]")}>{item.label}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    <button className="project-information" onClick={openProject}>
      <div className="project-states"><span className={cn('project-stage', label === 'RAB DETAIL' && 'detailed')}><i/>{label ?? 'BELUM DIHITUNG'}</span><span className="project-date"><CalendarDays size={12}/>{formatDate(project.updatedAt)}</span></div>
      <h3>{project.name}</h3>
      <div className="project-dims"><span><MapPin size={13}/>{project.location}</span><i/><span><Ruler size={14}/>{project.model.area.toLocaleString('id-ID')} m²</span><i/><span><Layers size={14}/>{project.model.floors} lantai</span></div>
      {rab ? <div className="project-cost"><span className="cost-label">TOTAL ESTIMASI RAB</span><div className="card-price">{rupiah(rab.total)}<ArrowUpRight className="card-open" size={17}/></div>
        <p className="project-range">Kisaran {shortRupiah(rab.p10)} – {shortRupiah(rab.p90)}</p>
        <div className="project-completion"><span>Kelengkapan data</span><b>{rab.completeness}%</b></div><div className="completion-track" role="progressbar" aria-label="Kelengkapan data" aria-valuenow={rab.completeness} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${rab.completeness}%`}}/></div>
      </div> : <p className="p-4 text-xs text-muted">Estimasi belum tersedia.</p>}
    </button>
  </Card>;
}
