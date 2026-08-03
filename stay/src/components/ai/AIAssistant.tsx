import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Command, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya AI Assistant stay.monefyi.com. Ada yang bisa saya bantu hari ini? 🏨' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K
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
    
    const userMsg = { role: 'user' as const, content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulated AI Logic based on keywords
    setTimeout(() => {
      let reply = "";
      const lower = text.toLowerCase();
      
      if (lower.includes('kamar') && lower.includes('kosong')) {
        reply = "Malam ini ada **5 kamar kosong** (102, 104, 202, 204, 302). Kamar Deluxe 202 paling direkomendasikan karena baru dibersihkan.";
      } else if (lower.includes('pendapatan')) {
        reply = "Pendapatan Anda minggu ini adalah **Rp14.200.000**, naik 12% dibandingkan minggu lalu. Tren occupancy juga stabil di angka 78%.";
      } else if (lower.includes('tugas') || lower.includes('housekeeping')) {
        reply = "Ada **3 tugas housekeeping** tertunda. Ingin saya buatkan pengingat untuk staff yang bertugas?";
      } else {
        reply = "Saya mengerti maksud Anda. Sebagai asisten cerdas, saya bisa membantu mengecek ketersediaan kamar, ringkasan pendapatan, hingga membuat tugas untuk staff. Apa ada hal spesifik yang ingin ditanyakan?";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-700 active:scale-90 transition-all z-40 group"
      >
        <Bot className="h-7 w-7 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-6 pointer-events-none">
            {/* Backdrop for mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto sm:hidden"
            />
            
            {/* Chat Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full sm:w-[400px] h-full sm:h-[600px] bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto border border-slate-100"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Stay AI Assistant</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400">Online & Siap Membantu</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 custom-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-sm border",
                      msg.role === 'user' 
                        ? "bg-emerald-600 text-white border-emerald-500 rounded-tr-none" 
                        : "bg-white text-slate-700 border-slate-100 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-1.5 p-4 bg-white rounded-2xl border border-slate-100 w-fit">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150" />
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="px-5 py-3 flex gap-2 overflow-x-auto no-scrollbar bg-white border-t border-slate-100">
                <button onClick={() => handleSend("Kamar mana yang kosong?")} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 whitespace-nowrap transition-colors">🛏️ Kamar Kosong</button>
                <button onClick={() => handleSend("Berapa pendapatan hari ini?")} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 whitespace-nowrap transition-colors">💰 Pendapatan</button>
                <button onClick={() => handleSend("Siapa yang checkout hari ini?")} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 whitespace-nowrap transition-colors">👋 Checkout</button>
              </div>

              {/* Input Area */}
              <div className="p-5 bg-white border-t border-slate-100">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Tanya apapun..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-medium focus:border-emerald-500 outline-none transition-all pr-12"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-slate-300">
                      <Command className="h-3 w-3" />
                      <span className="text-[10px] font-bold">K</span>
                    </div>
                  </div>
                  <button 
                    disabled={!input.trim() || isLoading}
                    className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-100 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-90"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
                <div className="flex items-center justify-between mt-4">
                   <button onClick={() => setMessages([{ role: 'assistant', content: 'Riwayat chat dihapus. Ada lagi yang bisa saya bantu?' }])} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">
                     <Trash2 className="h-3 w-3" /> Hapus Chat
                   </button>
                   <span className="text-[9px] font-bold text-slate-300 italic">Powered by StayAI Intelligence</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
