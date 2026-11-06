"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  CSMessage,
  CS_AGENT_PROFILE,
  POPULAR_CS_QUESTIONS,
  getCustomerSupportReply,
} from "@/lib/services/customerSupportService";

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CSMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      setTimeout(() => {
        setMessages([
          {
            id: "initial_greeting",
            sender: "cs",
            text: CS_AGENT_PROFILE.greeting,
            timestamp: new Date(),
            suggestedActions: [
              {
                label: "📄 Cara bikin PDF penawaran di HP?",
                action: "ask",
                payload: "Cara bikin PDF penawaran di HP",
              },
              {
                label: "🚀 Apa bedanya Standard vs Pro?",
                action: "ask",
                payload: "Apa bedanya paket Standard vs Pro?",
              },
              {
                label: "👷 Bisa untuk mandor & tukang?",
                action: "ask",
                payload: "Bisa dipakai mandor dan tukang lapangan?",
              },
              {
                label: "📲 Chat WhatsApp Langsung",
                action: "link_whatsapp",
                payload:
                  "https://wa.me/6281234567890?text=Halo%20Mbak%20Nisa,%20mau%20tanya%20seputar%20Monefyi",
              },
            ],
          },
        ]);
      }, 300);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: CSMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const replyData = getCustomerSupportReply(text);
      const isComplexQuery = /diskon|kurang|spesial|khusus|custom|kerjasama|tender besar|komplain|nego|partnership|kantor kami/i.test(text);

      const actions = [...(replyData.suggestedActions || [])];
      if (isComplexQuery && !actions.some(a => a.action === "escalate_telegram")) {
        actions.unshift({
          label: "🚨 Teruskan Pertanyaan ke Telegram Owner",
          action: "escalate_telegram",
          payload: text,
        });
      }

      const botMsg: CSMessage = {
        id: `cs_${Date.now()}`,
        sender: "cs",
        text: isComplexQuery
          ? `${replyData.text}\n\n💡 *Catatan:* Karena ini menyangkut penawaran atau keputusan khusus, Mas/Mbak bisa klik tombol **"🚨 Teruskan Pertanyaan ke Telegram Owner"** di bawah agar pesan ini diteruskan ke Telegram Owner Monefyi ya!`
          : replyData.text,
        timestamp: new Date(),
        suggestedActions: actions,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleActionClick = (action: {
    label: string;
    action: string;
    payload: string;
  }) => {
    if (action.action === "ask") {
      handleSendMessage(action.payload);
    } else if (action.action === "link_whatsapp") {
      window.open(action.payload, "_blank");
    } else if (action.action === "link_upgrade") {
      window.location.href = action.payload;
    } else if (action.action === "escalate_telegram") {
      setMessages((prev) => [
        ...prev,
        {
          id: `cs_${Date.now()}`,
          sender: "cs",
          text: `✅ *Permintaan Anda sudah Nisa teruskan ke Owner Monefyi!* 🚀\n\nUntuk respon langsung detik ini, Mas/Mbak juga bisa langsung kirim via WhatsApp Owner melalui tombol di bawah:`,
          timestamp: new Date(),
          suggestedActions: [
            {
              label: "💬 Hubungi Owner via WhatsApp",
              action: "link_whatsapp",
              payload: `https://wa.me/6281234567890?text=${encodeURIComponent(
                `Halo Owner Monefyi, saya dari web landing mau konfirmasi: "${action.payload}"`
              )}`,
            },
          ],
        },
      ]);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
          >
            {/* Pop-up pill notification */}
            <div
              onClick={() => setIsOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-white text-slate-800 px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all text-xs font-bold"
            >
              <span className="text-base">👩‍💼</span>
              <span>Mau tanya isi app &amp; paket? Tanya Mbak Esti</span>
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-900/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all relative group"
              aria-label="Buka Chat Customer Support"
            >
              <MessageCircle className="w-7 h-7" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 text-slate-900 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow">
                1
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-[92vw] sm:w-[400px] h-[600px] max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header Concierge */}
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl border border-white/30 shadow-inner">
                    {CS_AGENT_PROFILE.avatar}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-emerald-700 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-extrabold text-sm">{CS_AGENT_PROFILE.name}</p>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      {CS_AGENT_PROFILE.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    {CS_AGENT_PROFILE.status}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                  title="Tutup Chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Body Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-emerald-600 text-white rounded-tr-sm"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm space-y-2.5"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Action buttons if offered by CS */}
                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                        {msg.suggestedActions.map((act, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleActionClick(act)}
                            className="flex items-center justify-between text-left p-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 font-bold text-xs transition-colors"
                          >
                            <span>{act.label}</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1 text-right ${
                        msg.sender === "user" ? "text-emerald-100" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 w-fit">
                  <span className="text-base animate-bounce">👩‍💼</span>
                  <span>Mbak Esti sedang mengetik...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions Carousel */}
            <div className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none">
              {POPULAR_CS_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap transition-colors shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Tanya Mbak Esti seputar Monefyi..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
