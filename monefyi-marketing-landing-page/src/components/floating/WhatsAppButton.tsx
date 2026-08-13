import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { siteConfig } from '../../data/site-config';

export function WhatsAppButton() {
  const url = `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`;
  
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-full shadow-green-glow flex items-center justify-center text-white group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={{ 
        y: [0, -10, 0],
      }}
      transition={{ 
        y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } 
      }}
    >
      <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping pointer-events-none" />
      <MessageSquare size={24} />
      
      {/* Tooltip */}
      <div className="absolute right-16 bg-slate-900 border border-slate-700 text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Chat kami
      </div>
    </motion.a>
  );
}
