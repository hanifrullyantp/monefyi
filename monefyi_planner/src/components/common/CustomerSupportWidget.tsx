import { useState, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Send,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  CSMessage,
  CS_AGENT_PROFILE,
  POPULAR_CS_QUESTIONS,
  getCustomerSupportReply,
} from '../../services/customerSupportService';
import { escalateQuestionToOwnerTelegram } from '../../services/telegramService';
import { useAppStore } from '../../store/appStore';
import { useEntitlement } from '../../hooks/useEntitlement';
import { isAdminFullAccess } from '../../lib/entitlement';
import { hasEstimatorLicenseAccess } from '../../lib/appProductBrand';

const FAB_SIZE = 44;
const FAB_POS_KEY = 'froyek_cs_fab_pos_v1';
const DRAG_THRESHOLD = 6;

type FabPos = { x: number; y: number };

function defaultFabPos(): FabPos {
  const margin = 16;
  const bottomClearance = window.innerWidth < 1024 ? 88 : 96;
  return {
    x: Math.max(margin, window.innerWidth - margin - FAB_SIZE),
    y: Math.max(margin, window.innerHeight - bottomClearance - FAB_SIZE),
  };
}

function clampFabPos(pos: FabPos): FabPos {
  const margin = 8;
  return {
    x: Math.min(Math.max(margin, pos.x), Math.max(margin, window.innerWidth - FAB_SIZE - margin)),
    y: Math.min(Math.max(margin, pos.y), Math.max(margin, window.innerHeight - FAB_SIZE - margin)),
  };
}

function readFabPos(): FabPos {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY);
    if (!raw) return defaultFabPos();
    const parsed = JSON.parse(raw) as FabPos;
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return defaultFabPos();
    return clampFabPos(parsed);
  } catch {
    return defaultFabPos();
  }
}

export default function CustomerSupportWidget() {
  const navigate = useNavigate();
  const { isDemoMode, tenant, platformRole, user, entitlementPreviewMode } = useAppStore();
  const entitlement = useEntitlement();
  const hasEstimatorAccess = hasEstimatorLicenseAccess(
    entitlement,
    isAdminFullAccess(platformRole, user?.email, entitlementPreviewMode),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CSMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [fabPos, setFabPos] = useState<FabPos>(readFabPos);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fabPosRef = useRef(fabPos);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  fabPosRef.current = fabPos;

  useEffect(() => {
    const onResize = () => setFabPos(current => clampFabPos(current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onFabPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: fabPosRef.current.x,
      originY: fabPosRef.current.y,
      moved: false,
    };
  };

  const onFabPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const next = clampFabPos({ x: drag.originX + dx, y: drag.originY + dy });
    fabPosRef.current = next;
    setFabPos(next);
  };

  const onFabPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;
    suppressClickRef.current = true;
    try {
      localStorage.setItem(FAB_POS_KEY, JSON.stringify(fabPosRef.current));
    } catch {
      /* posisi tetap untuk sesi ini */
    }
  };

  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      setTimeout(() => {
        setMessages([
          {
            id: 'initial_greeting',
            sender: 'cs',
            text: CS_AGENT_PROFILE.greeting,
            timestamp: new Date(),
            suggestedActions: [
              ...(hasEstimatorAccess
                ? [
                    {
                      label: '📄 Cara bikin PDF penawaran di HP?',
                      action: 'ask' as const,
                      payload: 'Cara bikin PDF penawaran di HP',
                    },
                  ]
                : [
                    {
                      label: '📁 Cara kelola proyek & RAP?',
                      action: 'ask' as const,
                      payload: 'Cara kelola proyek dan RAP di Froyek',
                    },
                  ]),
              {
                label: '🚀 Apa keuntungan paket Pro?',
                action: 'ask',
                payload: 'Apa keuntungan paket Pro?',
              },
              {
                label: '👷 Cara ajak mandor & tukang lapangan?',
                action: 'ask',
                payload: 'Bisa dipakai mandor dan tukang lapangan?',
              },
              {
                label: '📲 Tanya Langsung via WhatsApp',
                action: 'link_whatsapp',
                payload:
                  'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20mau%20tanya%20seputar%20Froyek',
              },
            ],
          },
        ]);
      }, 300);
    }
  }, [isOpen, messages.length, hasEstimatorAccess]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: CSMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const replyData = getCustomerSupportReply(text, { allowEstimatorInfo: hasEstimatorAccess });
      const isComplexQuery = /diskon|kurang|spesial|khusus|custom|kerjasama|tender besar|komplain|nego|partnership|kantor kami/i.test(text);

      const actions = [...(replyData.suggestedActions || [])];
      if (isComplexQuery && !actions.some(a => a.action === 'escalate_telegram')) {
        actions.unshift({
          label: '🚨 Teruskan Pertanyaan ke Telegram Owner',
          action: 'escalate_telegram',
          payload: text,
        });
      }

      const botMsg: CSMessage = {
        id: `cs_${Date.now()}`,
        sender: 'cs',
        text: isComplexQuery
          ? `${replyData.text}\n\n💡 *Catatan:* Karena ini menyangkut penawaran atau keputusan khusus, Mas/Mbak bisa klik tombol **"🚨 Teruskan Pertanyaan ke Telegram Owner"** di bawah agar Esti langsung kirim pesan ke Telegram pribadi Owner kami ya!`
          : replyData.text,
        timestamp: new Date(),
        suggestedActions: actions,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleActionClick = async (action: {
    label: string;
    action: string;
    payload: string;
  }) => {
    if (action.action === 'ask') {
      handleSendMessage(action.payload);
    } else if (action.action === 'link_whatsapp') {
      window.open(action.payload, '_blank');
    } else if (action.action === 'navigate') {
      navigate(action.payload);
      setIsOpen(false);
    } else if (action.action === 'escalate_telegram') {
      if (isDemoMode || tenant?.id === 'demo') {
        setMessages((prev) => [
          ...prev,
          {
            id: `cs_${Date.now()}`,
            sender: 'cs',
            text: 'ℹ️ Mode Demo aktif: eskalasi ke Telegram Owner dinonaktifkan pada sesi demo lokal.\n\nSilakan lanjutkan tanya via WhatsApp Support jika butuh info produk.',
            timestamp: new Date(),
            suggestedActions: [
              {
                label: '💬 Chat WhatsApp Owner Sekarang',
                action: 'link_whatsapp',
                payload: `https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Owner, saya mau tanya: "${action.payload}"`)}`,
              },
            ],
          },
        ]);
        return;
      }
      setIsTyping(true);
      const res = await escalateQuestionToOwnerTelegram(action.payload, 'User Aplikasi Froyek');
      setIsTyping(false);

      setMessages((prev) => [
        ...prev,
        {
          id: `cs_${Date.now()}`,
          sender: 'cs',
          text: res.ok
            ? `✅ *Sudah Esti teruskan ke Telegram Owner!* 🚀\n\nPesan Anda sudah masuk ke Telegram pribadi Owner Froyek lengkap dengan detail pertanyaan. Beliau akan segera mengecek dan memberikan keputusan terbaik ya Mas/Mbak.`
            : `⚠️ Bot Telegram belum tersambung ke Chat ID Owner (${res.error}).\n\nUntuk respon cepat sekarang, Mas/Mbak bisa langsung klik tombol WhatsApp Support di bawah ya!`,
          timestamp: new Date(),
          suggestedActions: [
            {
              label: '💬 Chat WhatsApp Owner Sekarang',
              action: 'link_whatsapp',
              payload: `https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Owner Froyek, saya mau follow up pertanyaan: "${action.payload}"`)}`,
            },
          ],
        },
      ]);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{ left: fabPos.x, top: fabPos.y, width: FAB_SIZE, height: FAB_SIZE }}
            onPointerDown={onFabPointerDown}
            onPointerMove={onFabPointerMove}
            onPointerUp={onFabPointerUp}
            onPointerCancel={onFabPointerUp}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              setIsOpen(true);
            }}
            className="fixed z-40 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-900/25 flex items-center justify-center text-white cursor-grab active:cursor-grabbing touch-none select-none"
            aria-label="Buka chat Mbak Esti. Tahan dan geser untuk memindahkan."
            title="Tahan dan geser untuk pindah"
          >
            <MessageCircle className="w-5 h-5 pointer-events-none" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 text-slate-900 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white shadow pointer-events-none">
              1
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-16 sm:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[400px] h-[580px] max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
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
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-sm'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm space-y-2.5'
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
                        msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
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
              {POPULAR_CS_QUESTIONS.filter(q => hasEstimatorAccess || !/pdf penawaran/i.test(q)).map((q, idx) => (
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
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Tanya Mbak Esti seputar Froyek..."
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

