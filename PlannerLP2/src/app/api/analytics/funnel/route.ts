import { NextRequest, NextResponse } from "next/server";

export interface FunnelEventPayload {
  sessionId: string;
  event:
    | "checkout_landed"
    | "step1_completed"
    | "step2_completed"
    | "step3_completed"
    | "step4_bump_toggled"
    | "step4_completed"
    | "step5_method_selected"
    | "checkout_completed";
  plan?: string;
  bumpTaken?: boolean;
  paymentMethod?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

// Global In-memory store for funnel analytics across instances
interface FunnelSession {
  sessionId: string;
  landedAt: string;
  lastEventAt: string;
  plan: string;
  maxStepReached: number;
  bumpTaken: boolean;
  paymentMethod?: string;
  isCompleted: boolean;
  history: string[];
}

const sessions: Map<string, FunnelSession> = new Map();
const recentLogs: Array<FunnelEventPayload & { timestamp: string }> = [];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FunnelEventPayload;
    const { sessionId, event, plan = "standard", bumpTaken = false, paymentMethod, metadata } = body;

    if (!sessionId || !event) {
      return NextResponse.json(
        { ok: false, error: "sessionId and event are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let session = sessions.get(sessionId);

    const stepMapping: Record<string, number> = {
      checkout_landed: 0,
      step1_completed: 1,
      step2_completed: 2,
      step3_completed: 3,
      step4_bump_toggled: 4,
      step4_completed: 4,
      step5_method_selected: 5,
      checkout_completed: 6,
    };

    const currentStepNum = stepMapping[event] ?? 0;

    if (!session) {
      session = {
        sessionId,
        landedAt: now,
        lastEventAt: now,
        plan,
        maxStepReached: currentStepNum,
        bumpTaken,
        paymentMethod,
        isCompleted: event === "checkout_completed",
        history: [event],
      };
    } else {
      session.lastEventAt = now;
      session.plan = plan || session.plan;
      session.bumpTaken = bumpTaken ?? session.bumpTaken;
      if (paymentMethod) session.paymentMethod = paymentMethod;
      if (currentStepNum > session.maxStepReached) {
        session.maxStepReached = currentStepNum;
      }
      if (event === "checkout_completed") {
        session.isCompleted = true;
      }
      session.history.push(event);
    }

    sessions.set(sessionId, session);

    // Keep last 100 event logs for audit & real-time monitoring
    recentLogs.unshift({
      sessionId,
      event,
      plan,
      bumpTaken,
      paymentMethod,
      metadata,
      timestamp: now,
    });
    if (recentLogs.length > 100) recentLogs.pop();

    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allSessions = Array.from(sessions.values());
    const totalVisitors = allSessions.length;

    // Hitung berapa session yang mencapai / melampaui tiap langkah
    const landedCount = allSessions.length;
    const step1Count = allSessions.filter((s) => s.maxStepReached >= 1).length;
    const step2Count = allSessions.filter((s) => s.maxStepReached >= 2).length;
    const step3Count = allSessions.filter((s) => s.maxStepReached >= 3).length;
    const step4Count = allSessions.filter((s) => s.maxStepReached >= 4).length;
    const step5Count = allSessions.filter((s) => s.maxStepReached >= 5).length;
    const completedCount = allSessions.filter((s) => s.isCompleted || s.maxStepReached >= 6).length;

    const rawSteps = [
      { id: "step0_landed", label: "Kunjungan Checkout", count: landedCount },
      { id: "step1_name", label: "Langkah 1: Nama Lengkap", count: step1Count },
      { id: "step2_email", label: "Langkah 2: Alamat Email", count: step2Count },
      { id: "step3_whatsapp", label: "Langkah 3: No. WhatsApp", count: step3Count },
      { id: "step4_bump", label: "Langkah 4: Evaluasi Order Bump", count: step4Count },
      { id: "step5_payment", label: "Langkah 5: Review & Bayar", count: step5Count },
      { id: "completed", label: "Aktivasi / Pembayaran Berhasil", count: completedCount },
    ];

    let highestDropOff = { step: "-", dropCount: 0, dropRate: 0 };

    const funnelSteps = rawSteps.map((st, index) => {
      const prevCount = index === 0 ? landedCount : rawSteps[index - 1].count;
      const dropCount = prevCount - st.count;
      const dropOffRate = prevCount > 0 ? Math.round((dropCount / prevCount) * 100) : 0;
      const conversionFromStart = landedCount > 0 ? Math.round((st.count / landedCount) * 100) : 0;

      if (index > 0 && dropCount > highestDropOff.dropCount) {
        highestDropOff = {
          step: st.label,
          dropCount,
          dropRate: dropOffRate,
        };
      }

      return {
        ...st,
        dropCount,
        dropOffRate,
        conversionFromStart,
      };
    });

    // Perhitungan Metrik Kunci (KPIs)
    const overallConversionRate = landedCount > 0 ? ((completedCount / landedCount) * 100).toFixed(1) : "0";
    const bumpViewers = step4Count;
    const bumpTakers = allSessions.filter((s) => s.bumpTaken).length;
    const bumpAttachRate = bumpViewers > 0 ? ((bumpTakers / bumpViewers) * 100).toFixed(1) : "0";
    const waCaptured = step3Count;
    const waCaptureRate = landedCount > 0 ? ((waCaptured / landedCount) * 100).toFixed(1) : "0";

    // Distribusi Metode Pembayaran
    const paymentDistribution: Record<string, number> = {};
    allSessions.forEach((s) => {
      if (s.paymentMethod) {
        paymentDistribution[s.paymentMethod] = (paymentDistribution[s.paymentMethod] || 0) + 1;
      }
    });

    // Breakdown per Plan
    const planBreakdown = {
      free: allSessions.filter((s) => s.plan === "free").length,
      standard: allSessions.filter((s) => s.plan === "standard").length,
      pro: allSessions.filter((s) => s.plan === "pro").length,
    };

    return NextResponse.json({
      ok: true,
      totalVisitors,
      metrics: {
        overallConversionRate: `${overallConversionRate}%`,
        bumpAttachRate: `${bumpAttachRate}%`,
        whatsappCaptureRate: `${waCaptureRate}%`,
        bumpTakersCount: bumpTakers,
        abandonedLeadsCount: Math.max(0, waCaptured - completedCount),
        highestDropOffStep: highestDropOff.step,
        highestDropOffRate: `${highestDropOff.dropRate}%`,
      },
      funnelSteps,
      paymentDistribution,
      planBreakdown,
      recentLogs: recentLogs.slice(0, 30),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

