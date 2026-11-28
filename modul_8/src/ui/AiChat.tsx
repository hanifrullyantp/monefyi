import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import type { Project, RabResult, SpecState } from "../data/types";
import { composeReply, parseChatAction, type ChatAction } from "../ai/facade";
import { defaultSpec } from "../data/spec";
import { generateLayouts } from "../geometry/solver";
import { useEstimator } from "./context";
import { Badge, Button, Card, inputClass } from "./components";
import { cn } from "../utils/cn";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  preview?: { label: string; apply: () => void };
}

/** Chat AI: perintah bahasa → aksi terstruktur tervalidasi → engine/solver/optimizer. */
export function AiChat({ project, rab, variant = "panel" }: { project: Project; rab: RabResult | null; variant?: "panel" | "sheet" }) {
  const { engine, setSpec, setFacade, applyLayout, setTargets, toast } = useEstimator();
  const [messages, setMessages] = useState<Message[]>([
    { id: "m0", role: "assistant", text: "Halo! Saya bisa mengubah denah, spesifikasi, tampak, atau target harga lewat kalimat biasa. Semua angka tetap dihitung engine." },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const facts = {
    total: rab?.total ?? 0,
    rap: rab?.rap.rap ?? 0,
    margin: rab?.rap.margin ?? 0,
    marginPercent: rab?.rap.marginPercent ?? 0,
    p10: rab?.p10 ?? 0,
    p90: rab?.p90 ?? 0,
    completeness: rab?.completeness ?? 0,
    rooms: project.model.rooms.length,
    area: project.model.area,
  };

  const run = async () => {
    const raw = text.trim();
    if (!raw) return;
    setText("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: raw }]);
    setBusy(true);
    try {
      const action: ChatAction = parseChatAction(raw);
      const reply = composeReply(action, facts);
      let preview: Message["preview"];

      if (action.kind === "ubah_spesifikasi") {
        const spec = project.spec ?? defaultSpec({ floors: project.model.floors, soil: project.model.soil });
        const next: SpecState = { ...spec, [action.group]: action.level };
        preview = { label: `Terapkan ${action.group} → ${action.level}`, apply: () => setSpec(project.id, next) };
      } else if (action.kind === "ubah_tampak") {
        try {
          const res = await engine.facadeFromText(action.teks, project.model);
          preview = { label: "Terapkan tampak baru", apply: () => setFacade(project.id, res.spec) };
        } catch (e) {
          setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: e instanceof Error ? e.message : "Spesifikasi tampak perlu input manual." }]);
          setBusy(false);
          return;
        }
      } else if (action.kind === "ubah_denah") {
        const seed = action.seedBaru ? Math.floor(Math.random() * 100000) : (project.model.layoutSeed ?? 45);
        const alts = generateLayouts({
          area: project.model.area, floors: project.model.floors, bedrooms: project.model.bedrooms,
          bathrooms: project.model.bathrooms, roadDirection: project.model.roadDirection ?? 0,
          typologyHint: action.typology, seed,
        }, 1);
        const alt = alts[0];
        if (alt) preview = { label: `Terapkan denah ${alt.typology} (skor ${alt.score.total})`, apply: () => { applyLayout(project.id, alt.rooms, alt.levels, { seed: alt.seed, typology: alt.typology }); toast("Denah diterapkan", alt.label); } };
      } else if (action.kind === "target_harga") {
        const targets = {
          sellingPrice: action.jenis === "hargaJual" ? action.nilai : null,
          margin: action.jenis === "margin" ? action.nilai : null,
          rap: action.jenis === "modal" ? action.nilai : null,
          locked: action.jenis === "margin" ? ("margin" as const) : null,
          ppnEnabled: project.ppnEnabled ?? true,
        };
        preview = { label: "Simpan target & buka Planner", apply: () => setTargets(project.id, targets) };
      } else if (action.kind === "opsi_lain") {
        const alts = generateLayouts({ area: project.model.area, floors: project.model.floors, bedrooms: project.model.bedrooms, bathrooms: project.model.bathrooms, roadDirection: 0, typologyHint: null, seed: Math.floor(Math.random() * 100000) }, 1);
        const alt = alts[0];
        if (alt) preview = { label: `Terapkan alternatif ${alt.typology}`, apply: () => applyLayout(project.id, alt.rooms, alt.levels, { seed: alt.seed, typology: alt.typology }) };
      }

      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: reply, preview }]);
    } catch (e) {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: e instanceof Error ? e.message : "Perlu input manual — output tidak lolos validasi." }]);
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <>
      <div ref={listRef} className="thin-scrollbar flex-1 space-y-2 overflow-y-auto px-3.5 py-3">
        {messages.map((m) => (
          <div key={m.id} className={cn("max-w-[92%] rounded-2xl px-3 py-2 text-[12px] leading-5", m.role === "user" ? "ml-auto bg-[#0E6B50] text-white" : "border border-ai-line bg-ai-soft text-[#3B2C57]")}>
            {m.text}
            {m.preview && (
              <button onClick={() => { m.preview!.apply(); setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, preview: undefined } : x))); }}
                className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#6D28D9] px-3 text-[11.5px] font-bold text-white">
                <Sparkles className="h-3.5 w-3.5" /> {m.preview.label}
              </button>
            )}
          </div>
        ))}
        {busy && <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyusun aksi…</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void run(); }} className="border-t border-[#EEF2F0] p-2.5">
        <div className="flex gap-1.5">
          <label htmlFor="chat-input" className="sr-only">Perintah untuk asisten</label>
          <input id="chat-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Contoh: naikkan lantai ke premium" className={inputClass} />
          <Button type="submit" disabled={busy || !text.trim()} aria-label="Kirim perintah"><Send className="h-4 w-4" /></Button>
        </div>
        <p className="mt-1 text-[10px] text-label">AI tidak pernah menghasilkan angka rupiah — semua angka di balasan diambil dari hasil engine.</p>
      </form>
    </>
  );

  if (variant === "panel") {
    return (
      <Card className="flex h-[420px] flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#EEF2F0] px-3.5 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#6D28D9]"><Bot className="h-4 w-4" /></span>
          <div className="flex-1"><p className="text-[12px] font-extrabold text-ink">Asisten AI</p><p className="text-[10px] text-label">perintah → aksi tervalidasi</p></div>
          <Badge tone="violet">tanpa rupiah</Badge>
        </div>
        {body}
      </Card>
    );
  }
  return <div className="flex h-full flex-col">{body}</div>;
}

export function AiChatSheet({ project, rab, open, onClose }: { project: Project; rab: RabResult | null; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-[#0F172A]/40 lg:hidden" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="slide-up flex h-[72dvh] w-full flex-col overflow-hidden rounded-t-[22px] border border-line bg-white" role="dialog" aria-modal="true" aria-label="Asisten AI">
        <div className="flex items-center gap-2 border-b border-[#EEF2F0] px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#6D28D9]"><MessageSquare className="h-4 w-4" /></span>
          <p className="flex-1 text-[13px] font-extrabold text-ink">Asisten AI</p>
          <button aria-label="Tutup asisten" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-label"><X className="h-4 w-4" /></button>
        </div>
        <AiChat project={project} rab={rab} variant="sheet" />
      </div>
    </div>
  );
}
