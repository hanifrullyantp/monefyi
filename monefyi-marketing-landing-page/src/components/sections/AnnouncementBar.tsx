import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { EditableText } from '../admin/EditableText';
import { useAdminMode } from '../../hooks/useAdminMode';

export function AnnouncementBar() {
  const { settings } = useSiteSettings();
  const [visible, setVisible] = useLocalStorage('monefyi_announcement_visible', true);
  const isAdmin = useAdminMode();

  if (!visible || !settings.announcement.active) return null;

  return (
    <AnimatePresence>
      <div className={`fixed left-0 right-0 z-[60] h-10 bg-gradient-to-r from-slate-900 via-green-950 to-slate-900 border-b border-white/5 flex items-center justify-center px-4 overflow-hidden ${isAdmin ? 'top-10' : 'top-0'}`}>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Flame size={14} className="text-amber-400" fill="currentColor" />
          </motion.div>
            <EditableText 
            id="announcement_text" 
            defaultValue={settings.announcement.text} 
            className="text-xs font-bold text-white tracking-wide shimmer-text block" 
          />
        </div>
        <button
          onClick={() => setVisible(false)}
          className="absolute right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </AnimatePresence>
  );
}
