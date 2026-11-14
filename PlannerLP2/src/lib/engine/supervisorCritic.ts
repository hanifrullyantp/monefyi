/**
 * Fase 2B: Pengawas Efektivitas LLM (Harian / Opsional).
 * Menilai keputusan 7 hari terakhir dari `engine_action_review` & `engine_action_log` secara independen.
 * Hanya menghasilkan kritik + usulan penyetelan ambang; TIDAK pernah mengubah ambang atau menaikkan budget.
 */
import type { SupervisorReport } from "@/lib/engine/supervisor";

export interface ThresholdProposal {
  param: string;
  current: string;
  suggested: string;
  reason: string;
}

export interface SupervisorLlmCritique {
  generatedAt: string;
  summary: string;
  costOfMistakesIdr: number;
  thresholdProposals: ThresholdProposal[];
  model: string;
  error?: string;
}

export interface ReviewedActionSummary {
  logId: number;
  campaignName: string;
  actionType: string;
  verdict: string;
  rolledBack: boolean;
  beforeBudget?: number | null;
  afterBudget?: number | null;
  afterSpend?: number;
  afterPurchases?: number;
  reason?: string;
}

export function parseSupervisorCritiqueJson(
  text: string
): { summary: string; thresholdProposals: ThresholdProposal[] } | null {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(cleaned.slice(start, end + 1));
    const summary = String(j.summary || "").trim();
    if (!summary) return null;
    const rawProps = Array.isArray(j.thresholdProposals) ? j.thresholdProposals : [];
    const thresholdProposals: ThresholdProposal[] = rawProps
      .map((p: any) => ({
        param: String(p?.param || "").trim(),
        current: String(p?.current || "").trim(),
        suggested: String(p?.suggested || "").trim(),
        reason: String(p?.reason || "").trim(),
      }))
      .filter((p: ThresholdProposal) => p.param && p.suggested && p.reason)
      .slice(0, 4);
    return { summary, thresholdProposals };
  } catch {
    return null;
  }
}

const SYSTEM = `Anda adalah Auditor & Pengawas Independen Meta Ads untuk Monefyi Estimator (estimator.monefyi.com).
Tugas Anda menilai efektivitas keputusan Expert selama 7 hari terakhir (bukan memuji tanpa bukti).
Aturan keras:
- Bahasa Indonesia bisnis yang ringkas, jujur, tanpa emoji.
- Hanya gunakan angka yang ada di data. Jangan mengarang metrik.
- Anda tidak boleh mengeksekusi atau mengubah konfigurasi sendiri; usulkan hanya perubahan parameter bila ada bukti kuat (misal: winProbabilityToScale, lossProbabilityToPause, minPurchasesToScale, scaleCooldownHours, maxScalePctPerStep).
Balas HANYA JSON valid: {"summary":"...","thresholdProposals":[{"param":"...","current":"...","suggested":"...","reason":"..."}]}`;

export async function critiqueSupervisorEffectiveness(input: {
  report: SupervisorReport;
  reviewedActions: ReviewedActionSummary[];
  currentThresholds?: Record<string, number | string>;
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<SupervisorLlmCritique> {
  const model = input.model || process.env.SUPERVISOR_CRITIC_MODEL || "google/gemini-2.5-flash";
  const nowIso = new Date().toISOString();
  const costOfMistakesIdr = Math.round(
    input.reviewedActions
      .filter((r) => r.verdict === "memburuk")
      .reduce((sum, r) => sum + Number(r.afterSpend || 0), 0)
  );

  if (!input.apiKey) {
    return {
      generatedAt: nowIso,
      summary: "",
      costOfMistakesIdr,
      thresholdProposals: [],
      model,
      error: "OpenRouter API key belum diisi.",
    };
  }

  const m = input.report.metrics;
  const reviewLines = input.reviewedActions.slice(0, 15).map(
    (r) =>
      `- [${r.verdict}${r.rolledBack ? "/ROLLBACK" : ""}] ${r.campaignName || r.logId}: ${r.actionType}, spend pasca-aksi Rp ${Math.round(r.afterSpend || 0).toLocaleString("id-ID")}, pembelian ${r.afterPurchases ?? 0}. ${r.reason || ""}`
  );

  const userPrompt = `Ringkasan metrik Pengawas 7 hari:
- Skor deterministik: ${input.report.score ?? "belum cukup data"} (${input.report.grade})
- Aksi live 7h: ${m.live7d}, sudah dievaluasi: ${m.reviewed} (membaik: ${m.improved}, stabil: ${m.stable}, memburuk: ${m.worsened})
- Hit rate: ${m.hitRatePct !== null ? `${m.hitRatePct}%` : "belum cukup"}, Undo manual: ${m.undoRatePct !== null ? `${m.undoRatePct}%` : "-"}
- Biaya dari aksi memburuk (tercatat): Rp ${costOfMistakesIdr.toLocaleString("id-ID")}
- Parameter saat ini: ${JSON.stringify(input.currentThresholds || {})}

Detail aksi terevaluasi:
${reviewLines.length > 0 ? reviewLines.join("\n") : "- Belum ada aksi terevaluasi."}

Berikan kritik objektif dan usulan penyetelan ambang bila diperlukan.`;

  try {
    const res = await (input.fetchImpl || fetch)("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        generatedAt: nowIso,
        summary: "",
        costOfMistakesIdr,
        thresholdProposals: [],
        model,
        error: json?.error?.message || `OpenRouter menolak (HTTP ${res.status}).`,
      };
    }
    const parsed = parseSupervisorCritiqueJson(String(json?.choices?.[0]?.message?.content || ""));
    if (!parsed) {
      return {
        generatedAt: nowIso,
        summary: "",
        costOfMistakesIdr,
        thresholdProposals: [],
        model,
        error: "Balasan pengawas AI tidak berformat JSON valid.",
      };
    }
    return {
      generatedAt: nowIso,
      summary: parsed.summary,
      costOfMistakesIdr,
      thresholdProposals: parsed.thresholdProposals,
      model,
    };
  } catch (err: any) {
    return {
      generatedAt: nowIso,
      summary: "",
      costOfMistakesIdr,
      thresholdProposals: [],
      model,
      error: err?.message || "Gagal menghubungi OpenRouter.",
    };
  }
}

