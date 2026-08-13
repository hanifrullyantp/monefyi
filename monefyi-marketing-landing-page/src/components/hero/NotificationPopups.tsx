import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Receipt, AlertTriangle, Trophy, Sparkles } from 'lucide-react';

type NotifType = 'transaction' | 'warning' | 'achievement' | 'ai_insight';

interface Notification {
  type: NotifType;
  id: string;
}

const NOTIF_CONFIG: Record<NotifType, {
  icon: React.FC<{ size?: number; className?: string }>;
  iconBg: string;
  title: string;
  message: string;
  time: string;
  position: string;
  slideDir: { x: number; y: number };
}> = {
  transaction: {
    icon: Receipt,
    iconBg: 'bg-gradient-to-br from-green-500 to-green-700',
    title: 'Tercatat!',
    message: 'Kopi 30rb — GoPay',
    time: 'Baru saja',
    position: 'top-[-20px] right-[-100px]',
    slideDir: { x: 20, y: -10 },
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    title: 'Peringatan',
    message: 'Budget makan hampir habis',
    time: '2 mnt lalu',
    position: 'top-[80px] left-[-110px]',
    slideDir: { x: -20, y: 0 },
  },
  achievement: {
    icon: Trophy,
    iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-600',
    title: 'Target Tercapai!',
    message: 'Dana darurat +Rp 500rb',
    time: '5 mnt lalu',
    position: 'bottom-[120px] right-[-90px]',
    slideDir: { x: 20, y: 10 },
  },
  ai_insight: {
    icon: Sparkles,
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-700',
    title: 'Insight AI',
    message: 'Hemat Rp 340rb dari bulan lalu',
    time: '10 mnt lalu',
    position: 'bottom-[40px] left-[-100px]',
    slideDir: { x: -20, y: 10 },
  },
};

const ALL_TYPES: NotifType[] = ['transaction', 'warning', 'achievement', 'ai_insight'];

export function NotificationPopups(): React.ReactElement {
  const [activeNotifs, setActiveNotifs] = useState<Notification[]>([]);
  const [lastType, setLastType] = useState<NotifType | null>(null);

  const addNotification = useCallback(() => {
    if (activeNotifs.length >= 2) return;
    const available = ALL_TYPES.filter(t => t !== lastType && !activeNotifs.find(n => n.type === t));
    if (available.length === 0) return;
    const type = available[Math.floor(Math.random() * available.length)];
    const id = `${type}_${Date.now()}`;
    setLastType(type);
    setActiveNotifs(prev => [...prev.slice(-1), { type, id }]);

    setTimeout(() => {
      setActiveNotifs(prev => prev.filter(n => n.id !== id));
    }, 3700);
  }, [activeNotifs, lastType]);

  useEffect(() => {
    const interval = setInterval(addNotification, 3500);
    return () => clearInterval(interval);
  }, [addNotification]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <AnimatePresence>
        {activeNotifs.map(notif => {
          const config = NOTIF_CONFIG[notif.type];
          const Icon = config.icon;
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: config.slideDir.x, y: config.slideDir.y }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: config.slideDir.x, y: config.slideDir.y }}
              transition={{ duration: 0.4 }}
              className={`absolute ${config.position} z-20 hidden md:block`}
            >
              <div
                className="rounded-xl p-2.5 shadow-md"
                style={{
                  width: 180,
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={12} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-white">{config.title}</span>
                </div>
                <p className="text-xs text-slate-400 leading-tight">{config.message}</p>
                <p className="text-[10px] text-slate-600 mt-1">{config.time}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
