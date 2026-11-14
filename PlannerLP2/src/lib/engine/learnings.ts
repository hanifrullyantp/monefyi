/**
 * Fase 4: Memori Pembelajaran Otonom (`winning_engine_learnings`).
 * Mencatat pelajaran dari hasil evaluasi 48 jam (`review`) dan performa angle/kreatif (`creatives`),
 * lalu memasoknya kembali sebagai konteks ke `tick` dan Strategist LLM.
 */
import { getServiceClient } from "@/lib/engine/engineDb";
import type { WinningLearningItem, WinningPillarId } from "@/lib/engine/winningEngine";

export async function recordEngineLearning(input: {
  pillar: WinningPillarId;
  category: string;
  finding: string;
  evidenceMetric: string;
  confidence?: number;
}): Promise<boolean> {
  const finding = input.finding.trim();
  if (!finding) return false;
  try {
    const sb = getServiceClient();
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: recent } = await sb
      .from("winning_engine_learnings")
      .select("finding")
      .eq("category", input.category)
      .gte("created_at", since)
      .limit(20);
    if ((recent || []).some((r: any) => String(r.finding || "").trim() === finding)) {
      return false; // sudah tercatat dalam 24 jam terakhir
    }
    const { error } = await sb.from("winning_engine_learnings").insert({
      pillar: input.pillar,
      category: input.category,
      finding,
      evidence_metric: input.evidenceMetric.trim(),
      confidence: Math.max(10, Math.min(100, Math.round(input.confidence ?? 80))),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function loadRecentLearnings(limit = 10): Promise<WinningLearningItem[]> {
  try {
    const { data, error } = await getServiceClient()
      .from("winning_engine_learnings")
      .select("id, pillar, category, finding, evidence_metric, confidence")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !Array.isArray(data)) return [];
    return data.map((r: any) => ({
      id: `db-learn-${r.id}`,
      pillar: (r.pillar || "ads_testing") as WinningPillarId,
      category: String(r.category || "umum"),
      finding: String(r.finding || ""),
      evidenceMetric: String(r.evidence_metric || ""),
      confidence: Number(r.confidence || 80),
    }));
  } catch {
    return [];
  }
}

