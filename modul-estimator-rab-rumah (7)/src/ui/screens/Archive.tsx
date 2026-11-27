import { useState } from "react";
import { Archive as ArchiveIcon, ArchiveRestore, Search } from "lucide-react";
import { useEstimator, useRab } from "../context";
import { formatDate, shortRupiah } from "../format";
import type { Project } from "../../data/types";
import { Badge, Button, Card, EmptyState, Modal } from "../components";
import { ScreenTitle } from "../Shell";
import { MiniHouse } from "../../viz3d/Viewer";
import { cn } from "../../utils/cn";

export function ArchiveScreen() {
  const { projects, archiveProject, navigate } = useEstimator();
  const [search, setSearch] = useState("");
  const [restore, setRestore] = useState<string | null>(null);
  const archived = projects.filter((project) => project.archived).filter((project) => `${project.name} ${project.location}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="max-w-4xl">
      <ScreenTitle title="Arsip proyek" subtitle="Proyek diarsipkan, bukan dihapus. Pulihkan kapan saja — model, RAB, dan versi tetap utuh." right={<Badge tone="neutral"><ArchiveIcon className="h-2.5 w-2.5" /> {projects.filter((project) => project.archived).length} arsip</Badge>} />
      {projects.some((project) => project.archived) && <div className="mb-3 flex items-center gap-2"><div className="relative flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-label" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari arsip" placeholder="Cari nama atau kota…" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#a7d7c6]" /></div></div>}
      {archived.length === 0 ? <Card className="p-4"><EmptyState icon={<ArchiveIcon className="h-5 w-5" />} title={projects.some((project) => project.archived) ? "Tidak ada arsip yang cocok" : "Arsip masih kosong"} description={projects.some((project) => project.archived) ? "Coba kata kunci lain." : "Dari menu proyek, pilih Arsipkan. Data tidak dihapus dan tetap bisa dipulihkan."} action={<Button size="sm" variant="secondary" onClick={() => navigate({ name: "home" })}>Buka proyek</Button>} /></Card> : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {archived.map((project) => {
            return <ArchiveCard key={project.id} project={project} onRestore={() => setRestore(project.id)} onView={() => navigate({ name: "project", projectId: project.id })} />;

          })}
        </div>
      )}
      <Modal open={Boolean(restore)} onClose={() => setRestore(null)} title="Pulihkan proyek?" description="Proyek kembali ke daftar aktif dengan model terbaru." footer={<div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setRestore(null)}>Batal</Button><Button size="sm" onClick={() => { if (restore) archiveProject(restore, false); setRestore(null); }}>Pulihkan</Button></div>}>
        <p className={cn("text-[11px] leading-5 text-muted")}>Tidak ada data yang hilang selama diarsipkan. RAB akan dihitung ulang dengan pengaturan yang aktif.</p>
      </Modal>
    </div>
  );
}

function ArchiveCard({ project, onRestore, onView }: { project: Project; onRestore: () => void; onView: () => void }) {
  const { rab } = useRab(project);
  return (
    <Card className="overflow-hidden">
      <MiniHouse model={project.model} thumbnail={project.thumbnail} thumbnailKey={project.thumbnailKey} className="h-28 border-b border-line" />
      <div className="p-3.5">
        <p className="truncate text-[13px] font-extrabold text-ink">{project.name}</p>
        <p className="text-[11px] text-label">{project.model.area} m² · {project.model.floors} lantai · {project.location} · {formatDate(project.updatedAt)}</p>
        <p className="mt-1 text-[13px] font-extrabold text-ink">{rab ? shortRupiah(rab.total) : "…"}</p>
        <div className="mt-2 flex gap-1.5"><Button variant="secondary" className="flex-1" onClick={onRestore}><ArchiveRestore className="h-4 w-4" /> Pulihkan</Button><Button variant="ghost" onClick={onView}>Lihat</Button></div>
      </div>
    </Card>
  );
}
