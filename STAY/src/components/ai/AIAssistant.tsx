import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../store/appStore';
import { buildStayAiContext } from '../../utils/aiContext';
import { askStayAi } from '../../services/stayAiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const { bookings, rooms, payments, housekeepingTasks } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya STAY AI Assistant (Beta). Tanya tentang kamar, pendapatan, atau housekeeping.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const aiContext = useMemo(
    () => buildStayAiContext(bookings, rooms, payments, housekeepingTasks),
    [bookings, rooms, payments, housekeepingTasks]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await askStayAi(text, aiContext);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Terjadi kesalahan. Coba lagi.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="ai-assistant-toggle"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-700 active:scale-90 transition-all z-40 group"
        title="STAY AI (Beta)"
      >
        <Bot className="h-7 w-7 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 text-[8px] font-black bg-amber-400 text-slate-900 px-1 rounded">Beta</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto sm:hidden"
            />

            <motion.div
              data-testid="ai-assistant-panel"
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full sm:w-[400px] h-full sm:h-[600px] bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto border border-slate-100"
            >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Stay AI · Beta</h3>
                    <span className="text-[10px] font-bold text-slate-400">Gemini + fallback lokal</span>
                  </div>
                </div>
                <button type="button" onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex flex-col max-w-[85%]', msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start')}>
                    <div className={cn(
                      'p-4 rounded-2xl text-sm leading-relaxed shadow-sm border',
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none'
                        : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-1.5 p-4 bg-white rounded-2xl border border-slate-100 w-fit">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                  </div>
                )}
              </div>

              <div className="px-5 py-3 flex gap-2 overflow-x-auto bg-white border-t border-slate-100">
                <button type="button" onClick={() => handleSend('Kamar mana yang kosong?')} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">Kamar Kosong</button>
                <button type="button" onClick={() => handleSend('Berapa pendapatan hari ini?')} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">Pendapatan</button>
                <button type="button" onClick={() => handleSend('Siapa checkout hari ini?')} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">Checkout</button>
              </div>

              <div className="p-5 bg-white border-t border-slate-100">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex items-center gap-2">
                  <input
                    type="text"
                    data-testid="ai-assistant-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tanya apapun..."
                    className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-medium focus:border-emerald-500 outline-none"
                  />
                  <button type="submit" disabled={!input.trim() || isLoading} className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center disabled:bg-slate-200">
                    <Send className="h-5 w-5" />
                  </button>
                </form>
                <button type="button" onClick={() => setMessages([{ role: 'assistant', content: 'Chat dihapus. Ada yang bisa dibantu?' }])} className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-red-500">
                  <Trash2 className="h-3 w-3" /> Hapus Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
