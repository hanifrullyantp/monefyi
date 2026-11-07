"use client";

import { useState, useRef, useEffect } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { MARKETING_AGENTS, MarketingAgentRole } from "@/lib/types/marketing";
import { processAgentWarRoomMessage } from "@/lib/services/marketingAgentService";
import {
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  Zap,
  TrendingUp,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Target,
  BarChart3,
  User,
  X,
  Activity,
  Rocket,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const AGENT_ICON_MAP: Record<MarketingAgentRole, React.ComponentType<{ className?: string }>> = {
  cmo: Target,
  media_buyer: BarChart3,
  copywriter: Sparkles,
  funnel_aov: Zap,
};

interface MarketingWarRoomProps {
  variant?: "standalone" | "dock";
  onClose?: () => void;
}

export function MarketingWarRoom({ variant = "standalone", onClose }: MarketingWarRoomProps) {
  const {
    chatMessages,
    addChatMessage,
    clearChatMessages,
    campaigns,
    insightsData,
    rules,
    customAgentNames,
    apiConfig,
    actionLogs,
    updateCampaignDailyBudget,
    toggleCampaignStatus,
    createWinningCampaignDraft,
  } = useMarketingStore();

  const [activeView, setActiveView] = useState<"chat" | "logs">("chat");
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, pendingActions]);

  const handleExecuteAction = async (act: any) => {
    setExecutingActionId(act.id);
    try {
      if (act.action === "scale_budget" && act.campaignId) {
        const ok = await updateCampaignDailyBudget(
          act.campaignId,
          act.dailyBudget,
          act.actor || "ai_bima"
        );
        addChatMessage({
          id: `exec_${Date.now()}`,
          sender: "media_buyer",
          text: ok
            ? `Berhasil mengeksekusi kenaikan budget pada kampanye **"${act.campaignName}"** menjadi **Rp ${Number(
                act.dailyBudget
              ).toLocaleString("id-ID")}/hari** langsung di Meta Ads Manager.`
            : `Gagal menaikkan budget "${act.campaignName}" di Meta Graph API. Pastikan izin ads_management aktif.`,
          timestamp: new Date().toISOString(),
        });
      } else if (act.action === "update_status" && act.campaignId) {
        const ok = await toggleCampaignStatus(act.campaignId, act.actor || "ai_bima");
        addChatMessage({
          id: `exec_${Date.now()}`,
          sender: "media_buyer",
          text: ok
            ? `Kampanye **"${act.campaignName}"** telah dihentikan (**PAUSED**) di Meta Ads Manager untuk menghentikan pembakaran saldo.`
            : `Gagal mengubah status kampanye "${act.campaignName}".`,
          timestamp: new Date().toISOString(),
        });
      } else if (act.action === "create_winning_campaign") {
        const res = await createWinningCampaignDraft({
          name: act.campaignName,
          dailyBudget: act.dailyBudget || 150000,
          objective: act.objective || "OUTCOME_SALES",
          actor: act.actor || "ai_danu",
        });
        addChatMessage({
          id: `exec_${Date.now()}`,
          sender: "cmo",
          text: res.ok
            ? `Draft Winning Campaign **"${act.campaignName}"** (ID: ${res.createdId}) berhasil dibuat di Meta Ads Manager dengan status PAUSED.`
            : `Gagal membuat draft kampanye: ${res.error}`,
          timestamp: new Date().toISOString(),
        });
      }

      setPendingActions((prev) => prev.filter((item) => item.id !== act.id));
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    const userMsgId = `usr_${Date.now()}`;
    addChatMessage({
      id: userMsgId,
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    });

    setInputText("");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/marketing/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          campaigns,
          insights: insightsData,
          rules,
          apiConfig,
          customAgentNames,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok && data.reply) {
        addChatMessage({
          id: `ai_${Date.now()}`,
          sender: data.sender || "cmo",
          text: data.reply,
          timestamp: new Date().toISOString(),
        });
        if (Array.isArray(data.executableActions) && data.executableActions.length > 0) {
          setPendingActions(data.executableActions);
        }
      } else {
        const fallback = processAgentWarRoomMessage(text, campaigns, rules);
        fallback.forEach((msg) => addChatMessage(msg));
      }
    } catch {
      const fallback = processAgentWarRoomMessage(text, campaigns, rules);
      fallback.forEach((msg) => addChatMessage(msg));
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPrompts = [
    {
      label: "Analisa & Scale Budget (+20%)",
      icon: TrendingUp,
      prompt: "Analisa kampanye saya sekarang dan rekomendasikan mana yang harus dinaikkan budgetnya!",
    },
    {
      label: "Rekomendasi Winning (Umur & Lokasi)",
      icon: Target,
      prompt: "Berikan analisa mendalam Ads Insight untuk umur, gender, lokasi, dan placement terbaik!",
    },
    {
      label: "Audit Kampanye Boncos",
      icon: ShieldAlert,
      prompt: "Cek apakah ada kampanye yang boncos dan harus dimatikan sekarang!",
    },
    {
      label: "5 Hook Penahan Scroll",
      icon: Flame,
      prompt: "Buatkan 5 hook penahan scroll 3-detik untuk kontraktor interior & kitchen set",
    },
  ];

  const isDock = variant === "dock";

  return (
    <div
      className={cn(
        "flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-colors",
        isDock ? "h-full max-h-[calc(100vh-100px)]" : "h-[680px]"
      )}
    >
      {/* Header Tim Marketing */}
      <div className="bg-slate-50 dark:bg-slate-950/80 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-900/20">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black text-slate-900 dark:text-white tracking-wide uppercase truncate">
                Monefyi Adspert
              </h2>
              <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Executor
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {customAgentNames?.cmo || "Mas Danu"} • {customAgentNames?.media_buyer || "Bima"} •{" "}
              {customAgentNames?.copywriter || "Sinta"} • {customAgentNames?.funnel_aov || "Aris"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveView(activeView === "chat" ? "logs" : "chat")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-colors cursor-pointer",
              activeView === "logs"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            )}
            title="Pantau Log Pergerakan AI & Manusia"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Log ({actionLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={clearChatMessages}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Reset percakapan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {isDock && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Tutup Panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: Log Pergerakan AI & Manusia */}
      {activeView === "logs" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Riwayat Pergerakan AI &amp; Eksekusi Meta Ads
            </h3>
            <button
              type="button"
              onClick={() => setActiveView("chat")}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Kembali ke Chat
            </button>
          </div>

          {actionLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              Belum ada riwayat perubahan status atau budget. Semua aksi yang dilakukan oleh AI maupun Admin akan tercatat di sini secara real-time.
            </div>
          ) : (
            <div className="space-y-2.5">
              {actionLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-700 dark:text-emerald-400">
                      {log.actorLabel}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                    {log.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Mode 2: Chat Koordinasi & Tombol Eksekusi AI */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => {
              const isUser = msg.sender === "user";
              const agent = !isUser ? MARKETING_AGENTS[msg.sender as MarketingAgentRole] : null;
              const AgentIcon = !isUser
                ? AGENT_ICON_MAP[msg.sender as MarketingAgentRole] || Bot
                : User;

              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                      <AgentIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm",
                      isUser
                        ? "bg-emerald-600 text-white rounded-br-xs"
                        : "bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-xs"
                    )}
                  >
                    {!isUser && agent && (
                      <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-700/50">
                        <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-400">
                          {customAgentNames?.[msg.sender as MarketingAgentRole] || agent.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          [{agent.badge}]
                        </span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-sans text-xs">{msg.text}</div>

                    {msg.actionTaken && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Aksi Otomatis: {msg.actionTaken.details}</span>
                      </div>
                    )}

                    <div
                      className={cn(
                        "text-[10px] mt-1.5 text-right",
                        isUser ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Kartu Rekomendasi Eksekusi Langsung oleh AI */}
            {pendingActions.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5" />
                    Tindakan Siap Eksekusi ke Meta Ads Manager
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingActions([])}
                    className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-2">
                  {pendingActions.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-slate-800 flex flex-col gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {act.label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {act.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={executingActionId === act.id}
                        onClick={() => handleExecuteAction(act)}
                        className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        <span>
                          {executingActionId === act.id
                            ? "Mengeksekusi ke Meta Graph API..."
                            : "Setujui & Eksekusi Sekarang"}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic py-2 px-3 bg-slate-100 dark:bg-slate-800/40 rounded-xl w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                Monefyi Adspert sedang menganalisa data live Meta Ads...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/70 flex gap-2 overflow-x-auto scrollbar-none">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isProcessing}
                onClick={() => handleSend(qp.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shrink-0 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
              >
                <qp.icon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isProcessing}
              placeholder="Perintahkan AI untuk analisa atau naikkan budget..."
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isProcessing}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-emerald-900/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
