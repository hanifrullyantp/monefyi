import React, { useState } from 'react';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';

const quickReplies = [
  'Bagaimana cara daftar?',
  'Berapa harga per bulan?',
  'Apakah ada trial gratis?',
  'Fitur apa yang tersedia?',
];

const botResponses: Record<string, string> = {
  'Bagaimana cara daftar?': 'Mudah banget! Klik tombol "Coba Gratis 14 Hari" di halaman ini, isi email dan nomor HP, lalu ikuti panduan setup. Selesai dalam 2 menit! 🎉',
  'Berapa harga per bulan?': 'Mulai dari GRATIS untuk 5 kamar pertama! Paket Profesional Rp 499.000/bulan (maks. 12 kamar), Enterprise Rp 1.499.000/bulan. Semua ada coba gratis 14 hari! 💚',
  'Apakah ada trial gratis?': 'Ada! Anda bisa coba STAY gratis selama 14 hari penuh tanpa kartu kredit. Setelah itu, paket Starter tetap gratis selamanya untuk 5 kamar. 🆓',
  'Fitur apa yang tersedia?': 'STAY punya: Front Desk Digital, Booking Online 24 jam, Pembayaran QRIS/VA/E-Wallet, Manajemen Staff, Laporan Otomatis, WhatsApp Otomatis, Mode Offline, dan AI Assistant! 🚀',
};

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  time: string;
}

const LiveChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: 'Halo! 👋 Selamat datang di STAY. Ada yang bisa saya bantu? Saya siap menjawab pertanyaan Anda seputar manajemen penginapan!',
      isBot: true,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(1);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now(), text, isBot: false, time: now }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const response = botResponses[text] || 'Terima kasih atas pertanyaannya! Tim kami akan segera membantu. Atau Anda bisa langsung chat via WhatsApp untuk jawaban lebih cepat! 📱';
      setMessages(prev => [...prev, { id: Date.now() + 1, text: response, isBot: true, time: now }]);
    }, 1200 + Math.random() * 800);
  };

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
  };

  return (
    <>
      {/* Chat button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl shadow-emerald-300 flex items-center justify-center transition-all duration-200 hover:scale-110"
      >
        {open ? <ChevronDown className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-36 right-4 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="bg-emerald-500 px-4 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg">🤖</div>
              <div>
                <div className="text-white font-bold text-sm">STAY Assistant</div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                  <span className="text-emerald-100 text-xs">Online sekarang</span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                {msg.isBot && (
                  <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">🤖</div>
                )}
                <div className={`max-w-[85%] ${msg.isBot ? '' : 'items-end flex flex-col'}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.isBot
                      ? 'bg-white text-gray-700 rounded-tl-sm shadow-sm border border-gray-100'
                      : 'bg-emerald-500 text-white rounded-tr-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0">🤖</div>
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-1.5 flex-shrink-0">
              {quickReplies.map((qr, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qr)}
                  className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-full hover:bg-emerald-100 transition-all"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2 bg-white flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ketik pesan Anda..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={() => sendMessage(input)}
              className="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChat;
