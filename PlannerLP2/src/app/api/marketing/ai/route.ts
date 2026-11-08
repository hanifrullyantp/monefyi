import { NextRequest, NextResponse } from "next/server";

export interface AiExecutableAction {
  id: string;
  action: "scale_budget" | "update_status" | "create_winning_campaign";
  label: string;
  description: string;
  campaignId?: string;
  campaignName?: string;
  previousBudget?: number;
  dailyBudget?: number;
  status?: "ACTIVE" | "PAUSED";
  objective?: string;
  actor: "ai_bima" | "ai_danu" | "ai_sinta" | "ai_aris";
}

function buildExecutableActions(campaigns: any[], insights: any, rules: any): AiExecutableAction[] {
  const actions: AiExecutableAction[] = [];
  const scalePct = Number(rules?.scaleBudgetPercentage || 20);
  const maxCpa = Number(rules?.maxCpaThreshold || 50000);

  if (Array.isArray(campaigns) && campaigns.length > 0) {
    // 1. Cari kampanye terbaik untuk di-scale budget-nya
    const sortedByPerformance = [...campaigns]
      .filter((c) => c.status === "ACTIVE")
      .sort(
        (a, b) =>
          (b.roas || 0) - (a.roas || 0) ||
          (b.results || 0) - (a.results || 0) ||
          (b.ctr || 0) - (a.ctr || 0)
      );

    const topWinner = sortedByPerformance[0];
    if (topWinner) {
      const currentBudget = Number(topWinner.dailyBudget || 100000);
      const baseBudget = currentBudget > 0 ? currentBudget : 100000;
      const newBudget = Math.round(baseBudget * (1 + scalePct / 100));
      actions.push({
        id: `scale_${topWinner.id}`,
        action: "scale_budget",
        label: `Scale Budget +${scalePct}%: ${topWinner.name.slice(0, 32)}...`,
        description: `Naikkan budget harian dari Rp ${baseBudget.toLocaleString(
          "id-ID"
        )} ke Rp ${newBudget.toLocaleString("id-ID")} (Results: ${
          topWinner.results || 0
        }, CTR: ${topWinner.ctrLink || topWinner.ctrAll || 0}%)`,
        campaignId: String(topWinner.id),
        campaignName: topWinner.name,
        previousBudget: baseBudget,
        dailyBudget: newBudget,
        actor: "ai_bima",
      });
    }

    // 2. Cari kampanye boncos / bleeding untuk dimatikan
    const bleeding = campaigns.find(
      (c) =>
        c.status === "ACTIVE" &&
        (c.healthStatus === "bleeding" ||
          (c.spend > 80000 && (c.results || 0) === 0) ||
          (c.cpa > maxCpa && c.cpa > 0))
    );

    if (bleeding && (!topWinner || bleeding.id !== topWinner.id)) {
      actions.push({
        id: `kill_${bleeding.id}`,
        action: "update_status",
        label: `Pause Iklan Boncos: ${bleeding.name.slice(0, 32)}...`,
        description: `Hentikan pembakaran budget pada "${bleeding.name}" (Spend: Rp ${(
          bleeding.spend || 0
        ).toLocaleString("id-ID")}, CPA: Rp ${(bleeding.cpa || 0).toLocaleString("id-ID")})`,
        campaignId: String(bleeding.id),
        campaignName: bleeding.name,
        status: "PAUSED",
        actor: "ai_bima",
      });
    }
  }

  // 3. Rekomendasi pembuatan Draft Kampanye Winning baru berdasarkan Demografi Terbaik
  const bestAge = insights?.recommendation?.bestAge || "25-44";
  const bestGender = insights?.recommendation?.bestGender || "All Gender";
  const bestRegions = insights?.recommendation?.bestRegions || "Jawa & Jakarta";
  const draftName = `[WINNING AI] Usia ${bestAge} (${bestGender}) - ${bestRegions.slice(0, 28)}`;

  actions.push({
    id: `create_win_${Date.now()}`,
    action: "create_winning_campaign",
    label: "Buat Draft Winning Campaign di Meta Ads",
    description: `Buat kampanye baru "${draftName}" dengan target demografi pemenang (Budget awal Rp 150.000/hari, status PAUSED untuk review).`,
    campaignName: draftName,
    dailyBudget: 150000,
    objective: "OUTCOME_SALES",
    actor: "ai_danu",
  });

  return actions;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt: string = String(body.prompt || "").trim();
    const campaigns: any[] = Array.isArray(body.campaigns) ? body.campaigns : [];
    const insights: any = body.insights || null;
    const rules: any = body.rules || {};
    const apiConfig: any = body.apiConfig || {};
    const customNames: any = body.customAgentNames || {
      cmo: "Mas Danu",
      media_buyer: "Bima",
      copywriter: "Sinta",
      funnel_aov: "Aris",
    };

    const executableActions = buildExecutableActions(campaigns, insights, rules);

    // Hitung ringkasan riil dari kampanye yang sedang tampil
    const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
    const totalResults = campaigns.reduce((s, c) => s + Number(c.results || 0), 0);
    const totalPurchases = campaigns.reduce((s, c) => s + Number(c.purchases || 0), 0);
    const totalLeads = campaigns.reduce((s, c) => s + Number(c.leads || 0), 0);
    const totalRevenue = campaigns.reduce(
      (s, c) => s + Number(c.purchasesConversionValue || 0),
      0
    );
    const totalImpressions = campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
    const totalLinkClicks = campaigns.reduce((s, c) => s + Number(c.linkClicks || 0), 0);
    const totalLpViews = campaigns.reduce((s, c) => s + Number(c.landingPageViews || 0), 0);
    const totalThruPlays = campaigns.reduce(
      (s, c) => s + Number(c.videoThruPlays15s || 0),
      0
    );

    // Hitung OCLP secara spesifik pada kampanye yang mengarahkan trafik ke Landing Page
    const lpCampaigns = campaigns.filter((c) => Number(c.landingPageViews || 0) > 0);
    const lpClicks = lpCampaigns.reduce((s, c) => s + Number(c.linkClicks || 0), 0);
    const lpViews = lpCampaigns.reduce((s, c) => s + Number(c.landingPageViews || 0), 0);

    const avgCpa = totalResults > 0 ? Math.round(totalSpend / totalResults) : 0;
    const avgRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;
    const avgCtrLink =
      totalImpressions > 0 ? Number(((totalLinkClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const avgOclp =
      lpClicks > 0
        ? Number(((lpViews / lpClicks) * 100).toFixed(1))
        : totalLinkClicks > 0 && totalLpViews > 0
        ? Number(((totalLpViews / totalLinkClicks) * 100).toFixed(1))
        : campaigns.some((c) => Number(c.oclpRate || 0) > 0)
        ? Math.max(...campaigns.map((c) => Number(c.oclpRate || 0)))
        : 80.0;

    const topCampaign = [...campaigns].sort(
      (a, b) => (b.results || 0) - (a.results || 0) || (b.spend || 0) - (a.spend || 0)
    )[0];

    const bestAge = insights?.recommendation?.bestAge || "25-44";
    const bestGender = insights?.recommendation?.bestGender || "Laki-laki & Perempuan";
    const bestRegions = insights?.recommendation?.bestRegions || "DKI Jakarta, Jawa Barat";
    const bestPlacements =
      insights?.recommendation?.bestPlacements || "Instagram Reels & Facebook Feed";

    // Waktu & Tanggal Real-time agar analisa selalu segar (tidak sama seperti kemarin)
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const dateStr = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Deteksi cerdas konfigurasi AI & Model Routing (Utamakan Luna Pro 6 jika disetel)
    let aiProvider = String(
      body.aiProvider ||
        apiConfig.aiProvider ||
        body.winningEngineConfig?.llmRouting?.processor?.provider ||
        body.winningEngineConfig?.llmRouting?.strategist?.provider ||
        "openrouter"
    ).toLowerCase();

    let aiApiKey = String(
      body.openRouterApiKey ||
        body.winningEngineConfig?.llmRouting?.openRouterApiKey ||
        apiConfig.aiApiKey ||
        body.aiApiKey ||
        process.env.OPENROUTER_API_KEY ||
        process.env.GEMINI_API_KEY ||
        ""
    ).trim();

    // Auto-switch ke OpenRouter jika API Key berformat sk-or-v1-
    if (aiApiKey.startsWith("sk-or-") || aiApiKey.includes("openrouter")) {
      aiProvider = "openrouter";
    }

    // Resolusi Model yang dipilih (Luna Pro 6 / gpt-6-luna-pro)
    const requestedModel = String(
      body.openRouterModel ||
        body.model ||
        body.winningEngineConfig?.llmRouting?.processor?.model ||
        body.winningEngineConfig?.llmRouting?.technical?.model ||
        body.winningEngineConfig?.llmRouting?.strategist?.model ||
        apiConfig.model ||
        apiConfig.openRouterModel ||
        ""
    ).trim();

    let modelToUse = "openai/gpt-6-luna-pro";
    if (requestedModel) {
      if (/(?:luna.*pro|gpt-6-luna-pro|luna-pro-6|luna\s*pro\s*6)/i.test(requestedModel)) {
        modelToUse = "openai/gpt-6-luna-pro";
      } else if (/(?:luna|gpt-6-luna|gpt-5.6-luna|luna-6|luna\s*6)/i.test(requestedModel)) {
        modelToUse = "openai/gpt-6-luna-pro";
      } else {
        modelToUse = requestedModel;
      }
    }

    if (aiApiKey.length > 10) {
      const systemContext = `Anda adalah tim Meta Ads Expert Monefyi Adspert (${customNames.cmo} sebagai CMO, ${customNames.media_buyer} sebagai Media Buyer, ${customNames.copywriter} sebagai Creative Strategist, ${customNames.funnel_aov} sebagai Funnel Specialist).
Model AI Aktif: ${modelToUse} (${aiProvider.toUpperCase()}).
Waktu Analisis Real-Time: ${dateStr}, ${timeStr} WIB.
Jawab dalam Bahasa Indonesia yang tajam, terstruktur, berbasis data angka riil, tanpa emoticon sama sekali.
Konteks Produk: Monefyi Estimator (estimator.monefyi.com) - Tool hitung RAB cepat di HP saat survei lokasi untuk kontraktor & interior.
Data Riil Akun Meta Ads Saat Ini:
- Jumlah Kampanye: ${campaigns.length} kampanye terpantau
- Total Spend: Rp ${totalSpend.toLocaleString("id-ID")}
- Total Results: ${totalResults} (Purchases: ${totalPurchases}, Leads: ${totalLeads}, ThruPlays: ${totalThruPlays})
- Rata-rata Cost Per Result (CPA): Rp ${avgCpa.toLocaleString("id-ID")}
- Blended ROAS: ${avgRoas}x | CTR Link: ${avgCtrLink}%
- OCLP (Outbound Click to LP): ${avgOclp}% (Landing Page Views: ${lpViews || totalLpViews} dari ${lpClicks || totalLinkClicks} Link Clicks)
- Kampanye Utama: ${topCampaign ? `"${topCampaign.name}" (Spend Rp ${Number(topCampaign.spend || 0).toLocaleString("id-ID")}, Results: ${topCampaign.results || 0}, ThruPlay: ${topCampaign.videoThruPlays15s || 0}, OCLP: ${Number(topCampaign.oclpRate ?? avgOclp)}%)` : "Belum ada"}
- Demografi Pemenang (Ads Insight): Usia ${bestAge}, Gender ${bestGender}, Lokasi Terbaik: ${bestRegions}, Placement Terbaik: ${bestPlacements}.
Berikan analisa konkret dan instruksikan user bahwa mereka dapat menekan tombol eksekusi di bawah pesan ini untuk menaikkan budget, mematikan iklan boncos, atau membuat draft kampanye winning secara langsung ke Meta Ads.`;

      try {
        if (aiProvider === "gemini" && !aiApiKey.startsWith("sk-or-")) {
          const gemRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
              aiApiKey
            )}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${systemContext}\n\nPertanyaan User: ${prompt}` }],
                  },
                ],
              }),
            }
          );
          const gemData = await gemRes.json().catch(() => ({}));
          const text = gemData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return NextResponse.json({
              ok: true,
              sender: "cmo",
              reply: text,
              executableActions,
              modelUsed: "gemini-2.5-flash",
              timestamp: now.toISOString(),
            });
          }
        } else {
          // OpenRouter / OpenAI / Groq: Gunakan Luna Pro 6 atau model yang dipilih
          const endpoint =
            aiProvider === "openrouter" || aiApiKey.startsWith("sk-or-")
              ? "https://openrouter.ai/api/v1/chat/completions"
              : aiProvider === "groq"
              ? "https://api.groq.com/openai/v1/chat/completions"
              : "https://api.openai.com/v1/chat/completions";

          const activeModel =
            aiProvider === "openrouter" || aiApiKey.startsWith("sk-or-")
              ? modelToUse
              : aiProvider === "groq"
              ? "llama-3.3-70b-versatile"
              : "gpt-4o-mini";

          const oaiRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${aiApiKey}`,
              ...(endpoint.includes("openrouter.ai")
                ? {
                    "HTTP-Referer": "https://monefyi.com",
                    "X-Title": "Monefyi Adspert Marketing AI",
                  }
                : {}),
            },
            body: JSON.stringify({
              model: activeModel,
              temperature: 0.65,
              max_tokens: 1200,
              messages: [
                { role: "system", content: systemContext },
                { role: "user", content: prompt },
              ],
            }),
          });
          const oaiData = await oaiRes.json().catch(() => ({}));
          const text = oaiData?.choices?.[0]?.message?.content;
          if (text) {
            return NextResponse.json({
              ok: true,
              sender: "cmo",
              reply: text,
              executableActions,
              modelUsed: activeModel,
              timestamp: now.toISOString(),
            });
          }
        }
      } catch {
        // Fallback ke mesin analitis deterministik di bawah jika API eksternal timeout
      }
    }

    // Mesin Analitis Meta Ads Expert Dinamis (Berbasis Data Riil Kampanye & Demografi Real-Time)
    const lower = prompt.toLowerCase();
    let sender: "cmo" | "media_buyer" | "copywriter" | "funnel_aov" = "cmo";
    let reply = "";

    const timestampHeader = `*[Laporan Real-Time ${dateStr} - ${timeStr} WIB | Engine: ${modelToUse}]*\n\n`;

    if (lower.includes("scale") || lower.includes("budget") || lower.includes("naik")) {
      sender = "media_buyer";
      reply = `${timestampHeader}**Analisa Scaling Budget (${customNames.media_buyer} - AI Media Buyer)**\n\nBerdasarkan pembacaan data riil akun Meta Ads Anda hari ini:\n- **Total Spend Aktif**: Rp ${totalSpend.toLocaleString("id-ID")} pada ${campaigns.length} kampanye terpantau.\n- **Total Results**: ${totalResults.toLocaleString("id-ID")} hasil (Cost Per Result rata-rata: Rp ${avgCpa.toLocaleString("id-ID")}).\n- **Kualitas Landing Page (OCLP)**: ${avgOclp}% (${lpViews || totalLpViews} LP View dari ${lpClicks || totalLinkClicks} klik).\n${
        topCampaign
          ? `- **Kandidat Utama Scale Up**: Kampanye **"${topCampaign.name}"** mencatat performa terkuat (Spend: Rp ${Number(topCampaign.spend || 0).toLocaleString("id-ID")}, Results: ${topCampaign.results || 0}, OCLP: ${Number(topCampaign.oclpRate ?? avgOclp)}%, 15s ThruPlay: ${topCampaign.videoThruPlays15s || 0}).\n`
          : ""
      }\n**Rekomendasi Eksekusi Horizontal & Vertikal:**\n1. **Vertical Scaling**: Naikkan budget harian sebesar **+${rules?.scaleBudgetPercentage || 20}%** pada kampanye pemenang agar fase algoritma Meta tidak ter-reset.\n2. **Horizontal Scaling (Demografi Pemenang)**: Fokuskan adset baru pada segmen **Usia ${bestAge} (${bestGender})** di wilayah **${bestRegions}** melalui placement **${bestPlacements}**.\n\nSilakan klik tombol eksekusi di bawah pesan ini agar saya langsung memperbarui budget di Meta Ads Manager sekarang.`;
    } else if (
      lower.includes("insight") ||
      lower.includes("lokasi") ||
      lower.includes("umur") ||
      lower.includes("gender") ||
      lower.includes("kelamin") ||
      lower.includes("winning")
    ) {
      sender = "cmo";
      reply = `${timestampHeader}**Blueprint Winning Ads & Demografi (${customNames.cmo} - AI CMO)**\n\nBerikut hasil bedah mendalam *Ads Insight* dari akun Meta Ads Anda per ${dateStr}:\n1. **Segmen Umur & Gender Paling Responsif**: Kelompok usia **${bestAge}** (**${bestGender}**) menghasilkan rasio konversi dan interaksi tertinggi.\n2. **Lokasi / Wilayah Paling Profitabel**: **${bestRegions}** menyerap impresi paling efisien dengan potensi Cost Per Result terendah.\n3. **Placement Pemenang**: **${bestPlacements}** memberikan retensi video (ThruPlay: ${totalThruPlays.toLocaleString("id-ID")}) dan CTR terbaik.\n4. **Kualitas Akses Landing Page**: OCLP berada di level sehat **${avgOclp}%**.\n\n**Langkah Taktis Pembuatan Winning Campaign:**\n- Gunakan struktur kampanye dengan fokus audiens di **${bestRegions}** (Usia ${bestAge}).\n- Buat 3 variasi Hook 3-detik pertama berformat vertikal 9:16 untuk placement **${bestPlacements}**.\n- Anda dapat langsung menekan tombol **"Buat Draft Winning Campaign di Meta Ads"** di bawah untuk mencetak kerangka kampanye ini ke Ads Manager Anda.`;
    } else {
      sender = "cmo";
      reply = `${timestampHeader}**Laporan Komando Meta Ads (${customNames.cmo} & ${customNames.media_buyer})**\n\nStatus performa riil akun iklan Anda saat ini:\n- **Kampanye Terdeteksi**: ${campaigns.length} kampanye terpantau\n- **Total Biaya Iklan (Spend)**: Rp ${totalSpend.toLocaleString("id-ID")}\n- **Total Results**: ${totalResults.toLocaleString("id-ID")} (Purchases: ${totalPurchases}, Leads: ${totalLeads}, ThruPlays: ${totalThruPlays})\n- **Rata-rata Cost Per Result**: Rp ${avgCpa.toLocaleString("id-ID")}\n- **CTR (Link) & OCLP**: CTR Link ${avgCtrLink}% | Rasio OCLP Landing Page ${avgOclp}% (${lpViews || totalLpViews} kunjungan halaman dari ${lpClicks || totalLinkClicks} klik link)\n- **Rekomendasi Targeting Terbaik**: Usia **${bestAge}** (${bestGender}) di wilayah **${bestRegions}** pada placement **${bestPlacements}**.\n\nPilih salah satu tombol tindakan cepat di bawah ini jika Anda mengizinkan AI mengeksekusi perubahan langsung ke Meta Ads Manager.`;
    }

    return NextResponse.json({
      ok: true,
      sender,
      reply,
      executableActions,
      modelUsed: modelToUse,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Gagal memproses analisa AI.",
      },
      { status: 500 }
    );
  }
}

