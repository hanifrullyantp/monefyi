import React, { useState } from 'react';
import { bonusAppsData } from '../../data/bonus-apps-data';
import { AppCard } from './AppCard';
import { AppModal } from './AppModal';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import type { BonusApp } from '../../types';

export function AppsGrid() {
  const { settings } = useSiteSettings();
  const apps = settings.content.bonusApps?.length ? settings.content.bonusApps : bonusAppsData;
  const [modalOpen, setModalOpen] = useState(false);
  const [activeApp, setActiveApp] = useState<BonusApp | null>(null);

  const handleOpenApp = (app: BonusApp) => {
    setActiveApp(app);
    setModalOpen(true);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apps.map(app => (
          <AppCard key={app.id} app={app} onOpen={handleOpenApp} />
        ))}
      </div>
      
      <AppModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        app={activeApp}
      />
    </div>
  );
}
