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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MarketingWarRoom() {
  const { chatMessages, addChatMessage, clearChatMessages, campaigns, rules, customAgentNames } =
    useMarketingStore();
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = (textToSend?: string) => {
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

    setTimeout(() => {
      const responses = processAgentWarRoomMessage(text, campaigns, rules);
      responses.forEach((res, i) => {
        setTimeout(() => {
          addChatMessage(res);
          if (i === responses.length - 1) {
            setIsProcessing(false);
          }
        }, (i + 1) * 600);
      });
    }, 400);
  };

  const quickPrompts = [
    {
      label: "🛑 Matikan iklan boncos sekarang",
      icon: ShieldAlert,
      prompt: "Matikan iklan yang boncos dan CPA melebihi batas!",
    },
    {
      label: "🚀 Scale iklan winning (+20%)",
      icon: TrendingUp,
      prompt: "Scale budget kampanye yang winning dengan ROAS di atas 3x!",
    },
    {
      label: "🎨 Buatkan hook penahan scroll",
      icon: Flame,
      prompt: "Buatkan 5 hook penahan scroll 3-detik untuk kontraktor interior & kitchen set",
    },
    {
      label: "🛍️ Optimasi Funnel & Order Bump",
      icon: Zap,
      prompt: "Bagaimana cara optimasi Order Bump dan mengatasi abandoned checkout seperti Scale.co.id?",
    },
  ];

  return (
    <div className="flex flex-col h-[650px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header Tim Marketing */}
      <div className="bg-slate-950/80 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-purple-900/30">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-wide">
                WAR ROOM MARKETING & META ADS
              </h2>
              <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                4 Agen Siaga
              </span>
            </div>
            <p className="text-xs text-slate-400">
              CMO ({customAgentNames?.cmo || "Mas Danu"}) • Media Buyer ({customAgentNames?.media_buyer || "Bima"}) • Copywriter ({customAgentNames?.copywriter || "Sinta"}) • Funnel ({customAgentNames?.funnel_aov || "Aris"})
            </p>
          </div>
        </div>

        <button
          onClick={clearChatMessages}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          title="Reset percakapan"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Chat
        </button>
      </div>

      {/* Roster Agen Mini Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950/40 border-b border-slate-800/80">
        {(Object.keys(MARKETING_AGENTS) as MarketingAgentRole[]).map((role) => {
          const agent = MARKETING_AGENTS[role];
          const dynamicName = customAgentNames?.[role] || agent.name;
          return (
            <div
              key={role}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50"
            >
              <div className="text-lg">{agent.avatar}</div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {dynamicName}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {agent.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg) => {
          const isUser = msg.sender === "user";
          const agent = !isUser ? MARKETING_AGENTS[msg.sender as MarketingAgentRole] : null;

          return (
            <div
              key={msg.id}
              className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0 shadow">
                  {agent?.avatar || "🤖"}
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md",
                  isUser
                    ? "bg-emerald-600 text-white rounded-tr-sm"
                    : "bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-sm"
                )}
              >
                {!isUser && agent && (
                  <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-700/50">
                    <span className="font-extrabold text-xs text-emerald-400">
                      {customAgentNames?.[msg.sender as MarketingAgentRole] || agent.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({agent.title})
                    </span>
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
                  {msg.text}
                </div>

                {msg.actionTaken && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-800/40">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Aksi Otomatis: {msg.actionTaken.details}</span>
                  </div>
                )}

                <div
                  className={cn(
                    "text-[10px] mt-1.5 text-right",
                    isUser ? "text-emerald-200" : "text-slate-400"
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

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2 px-3 bg-slate-800/30 rounded-xl w-fit">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />
            Tim marketing sedang berkoordinasi...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/70 flex gap-2 overflow-x-auto scrollbar-none">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isProcessing}
            onClick={() => handleSend(qp.prompt)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 shrink-0 transition-colors disabled:opacity-50"
          >
            <qp.icon className="w-3 h-3 text-emerald-400" />
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
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
          placeholder="Tanya, minta analisa, atau perintahkan tim marketing AI..."
          className="flex-1 bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isProcessing}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-40 disabled:hover:bg-emerald-600 shadow-md shadow-emerald-900/30"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
