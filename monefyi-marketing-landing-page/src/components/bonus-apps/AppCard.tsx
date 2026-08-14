import React from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { PremiumIcon } from '../ui/PremiumIcon';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatRupiah } from '../../lib/formatters';
import { resolveBonusAppUrl } from '../../data/mini-app-urls';
import type { BonusApp } from '../../types';

interface AppCardProps {
  app: BonusApp;
  onOpen: (app: BonusApp) => void;
}

export function AppCard({ app, onOpen }: AppCardProps) {
  const appUrl = resolveBonusAppUrl(app);

  const handleOpen = () => {
    if (appUrl) {
      window.open(appUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    onOpen(app);
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="glass rounded-3xl p-6 border border-white/10 flex flex-col h-full group"
    >
      <div className="flex justify-between items-start mb-6">
        <PremiumIcon name={app.icon as any} variant="glow" color={app.color} size="lg" />
        <Badge variant={app.color}>Senilai {formatRupiah(app.value)}</Badge>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">{app.name}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">{app.description}</p>
      
      {/* Mini preview mockup */}
      <div className="bg-slate-900 rounded-2xl p-4 mb-6 border border-slate-800 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity overflow-hidden min-h-[120px]">
        {app.imageUrl ? (
          <img
            src={app.imageUrl}
            alt={`Preview ${app.name}`}
            className="w-full h-28 object-contain object-center rounded-lg"
          />
        ) : (
          <div className="space-y-2">
            <div className="h-1.5 w-1/2 bg-slate-700 rounded-full" />
            <div className="h-8 w-full bg-slate-800 rounded-lg border border-slate-700" />
            <div className="h-1.5 w-2/3 bg-slate-700 rounded-full" />
            <div className="h-8 w-full bg-slate-800 rounded-lg border border-slate-700" />
          </div>
        )}
      </div>
      
      <Button variant="outline" className="w-full gap-2" onClick={handleOpen}>
        {appUrl ? (
          <>
            Buka Mini App
            <ExternalLink size={14} />
          </>
        ) : (
          'Coba Sekarang'
        )}
      </Button>
    </motion.div>
  );
}
