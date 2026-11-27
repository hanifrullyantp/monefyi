import { useMemo, useState } from "react";
import { BookOpen, Check, ChevronDown, Lightbulb, Sparkles, ThumbsDown, Trash2, WandSparkles, X } from "lucide-react";
import { useEstimator } from "../context";
import { fewShotExamples } from "../../ai/learner";
import { formatDate } from "../format";
import { AIInsightCard, Badge, Button, Card, Chip, EmptyState, Eyebrow, Modal } from "../components";
import { ScreenTitle } from "../Shell";
import { cn } from "../../utils/cn";

export function LessonsScreen() {
  const { patterns, state, setPatternStatus, deletePatternCorrections, navigate } = useEstimator();
  const [filter, setFilter] = useState<"semua" | "pending" | "approved" | "rejected">("semua");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const examples = useMemo(() => fewShotExamples(state.corrections), [state.corrections]);
  const filtered = patterns.filter((pattern) => filter === "semua" || pattern.status === filter);
  const approved = patterns.filter((pattern) => pattern.status === "approved").length;
  const pending = patterns.filter((pattern) => pattern.status === "pending").length;
  const recentCorrections = state.corrections.slice(0, 6);

  return (
    <div className="max-w-4xl">
      <ScreenTitle title="Pelajaran AI" subtitle="Pola dari koreksi yang kamu buat. Hanya pola disetujui yang dipakai otomatis sebagai default; yang belum disetujui hanya tampil sebagai saran." right={<Badge tone="violet"><Sparkles className="h-2.5 w-2.5" /> {state.corrections.length} koreksi</Badge>} />
      <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Disetujui", value: approved, tone: "text-accent bg-[#eef8f2]" }, { label: "Menunggu", value: pending, tone: "text-[#b45309] bg-[#fffbeb]" }, { label: "Ditolak", value: patterns.filter((pattern) => pattern.status === "rejected").length, tone: "text-muted bg-[#f4f7f5]" }].map((item) => <Card key={item.label} className="p-3 text-center"><p className="text-[18px] font-extrabold text-ink">{item.value}</p><p className="text-[8.5px] font-bold uppercase tracking-[0.05em] text-label">{item.label}</p><div className={cn("mx-auto mt-1 h-1 w-8 rounded-full", item.tone)} /></Card>)}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">{([["semua", "Semua"], ["pending", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"]] as const).map(([id, label]) => <Chip key={id} active={filter === id} onClick={() => setFilter(id)} className="shrink-0">{label}</Chip>)}</div>
          {filtered.length === 0 ? <Card className="p-3"><EmptyState icon={<Lightbulb className="h-5 w-5" />} title="Belum ada pola" description="Ubah asumsi yang berasal dari AI/default di proyek. Setelah pola berulang minimal tiga kali, polanya muncul di sini untuk disetujui." action={<Button size="sm" variant="secondary" onClick={() => navigate({ name: "home" })}>Kembali ke proyek</Button>} /></Card> : (
            <div className="space-y-2">
              {filtered.map((pattern) => (
                <Card key={pattern.id} className={cn("p-3.5", pattern.status === "approved" && "border-[#b9dfcd] bg-[#fbfefc]")}>
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", pattern.status === "approved" ? "bg-[#dcfce7] text-accent" : pattern.status === "rejected" ? "bg-[#f1f5f3] text-label" : "bg-[#f5f3ff] text-[#6d28d9]")}><WandSparkles className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5"><p className="text-[11.5px] font-extrabold text-ink">Ubah {pattern.label}</p><Badge tone={pattern.status === "approved" ? "green" : pattern.status === "rejected" ? "neutral" : "violet"}>{pattern.status === "approved" ? "dipakai otomatis" : pattern.status === "rejected" ? "ditolak" : "usulan"}</Badge></div>
                      <p className="mt-0.5 text-[9.5px] leading-4 text-muted">{pattern.count} dari {pattern.total} koreksi · {pattern.contexts.join(" · ")}</p>
                      <p className="mt-1 text-[8.5px] text-label">Terakhir {formatDate(pattern.updatedAt)}{pattern.status === "approved" ? " · akan dipakai pada proyek baru dengan konteks mirip." : pattern.status === "pending" ? " · belum dipakai otomatis. Setujui untuk memakai sebagai default." : " · tidak dipakai."}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#f0f4f2] pt-2.5">
                    {pattern.status !== "approved" && <Button size="sm" onClick={() => setPatternStatus(pattern.id, "approved")} className="min-h-[34px] px-2.5 text-[9px]"><Check className="h-3 w-3" /> Setujui</Button>}
                    {pattern.status !== "rejected" && <Button variant="secondary" size="sm" onClick={() => setPatternStatus(pattern.id, "rejected")} className="min-h-[34px] px-2.5 text-[9px]"><X className="h-3 w-3" /> Tolak</Button>}
                    {pattern.status === "approved" && <span className="text-[9px] font-bold text-accent">Default aktif untuk konteks mirip</span>}
                    <button aria-label={`Hapus pola ${pattern.label}`} onClick={() => setDeleteTarget(pattern.id)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-[#fef2f2] hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><div><Eyebrow>Buku koreksi</Eyebrow><p className="mt-1 text-[11px] font-extrabold text-ink">{recentCorrections.length ? `${state.corrections.length} entri lokal` : "Belum ada koreksi"}</p></div><Badge tone="neutral">lokal · IndexedDB</Badge></div>
            <div className="space-y-1.5">
              {recentCorrections.map((correction) => <div key={correction.id} className="flex items-start gap-2 rounded-xl border border-[#eef2f0] bg-[#fbfdfc] px-2.5 py-2 text-[8.5px]"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7c3aed]" /><div className="min-w-0 flex-1"><p className="font-bold text-[#405160]"><span className="capitalize">{correction.field.replace("_", " ")}</span>: {String(correction.proposed)} → {String(correction.corrected)}</p><p className="text-label">Tipe {correction.context.type} · {correction.context.area} m² · {correction.context.location} · {formatDate(correction.at)} {correction.source === "seed" ? "· contoh" : ""}</p></div></div>)}
              {!recentCorrections.length && <p className="text-[9px] leading-4 text-muted">Koreksi dibuat saat kamu mengubah asumsi usulan AI/default atau melaporkan angka salah.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <AIInsightCard title="Cara AI belajar" action={<Badge tone="violet"><BookOpen className="h-2.5 w-2.5" /> bukan fine-tuning</Badge>}>
            <p className="text-[11.5px] font-bold leading-5 text-[#4b356c]">Median & frekuensi, bukan angka karangan.</p>
            <p className="mt-1 text-[10.5px] leading-[1.65]">Dari buku koreksi engine menghitung pola per konteks: tipe, luas, lantai, lokasi, finishing. Hanya pola disetujui yang mengubah default proyek baru. Koefisien analisis dan rumus RAB tidak pernah disentuh AI.</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5"><Badge tone="violet">prior default</Badge><Badge tone="violet">persetujuan</Badge><Badge tone="violet">audit</Badge></div>
          </AIInsightCard>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><div><Eyebrow>Few-shot</Eyebrow><p className="mt-1 text-[11px] font-extrabold text-ink">Contoh relevan untuk prompt</p></div><Badge tone="neutral">{examples.length}</Badge></div>
            <p className="text-[9px] leading-4 text-muted">Hanya koreksi contoh/disetujui yang dapat menjadi few-shot. Rupiah tidak pernah dikirim ke AI.</p>
            <details className="mt-2 rounded-xl border border-line bg-[#fbfdfc]">
              <summary className="flex min-h-[38px] cursor-pointer items-center justify-between px-3 text-[9px] font-bold text-[#405160]">Lihat cuplikan prompt <ChevronDown className="h-3 w-3" /></summary>
              <div className="space-y-1.5 border-t border-line p-2.5">{examples.length ? examples.map((example, index) => <div key={index} className="rounded-lg border border-[#eef2f0] bg-white p-2 text-[8px] leading-4"><p className="font-bold text-[#6d28d9]">Input</p><p className="text-muted">{example.input}</p><p className="mt-1 font-bold text-[#6d28d9]">Output</p><p className="text-muted">{example.output}</p></div>) : <p className="text-[9px] text-label">Belum ada contoh.</p>}</div>
            </details>
          </Card>
          <Card className="p-4">
            <div className="flex items-start gap-2"><ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><p className="text-[9.5px] leading-5 text-muted">Pola ditolak tetap tersimpan agar AI tidak menawarkan hal yang sama. Hapus pola untuk membuang riwayat koreksi terkait.</p></div>
          </Card>
        </div>
      </div>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Hapus pola & koreksinya?" description="Tindakan lokal ini membuang pola dan riwayat koreksi yang membentuknya." footer={<div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Batal</Button><Button variant="danger" size="sm" onClick={() => { if (deleteTarget) deletePatternCorrections(deleteTarget); setDeleteTarget(null); }}>Hapus</Button></div>}>
        <p className="text-[11px] leading-5 text-muted">Rumus engine tidak terpengaruh. Nilai usulan default akan kembali tanpa pola ini.</p>
      </Modal>
    </div>
  );
}
