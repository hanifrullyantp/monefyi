import React, { useState } from 'react';
import { bonusAppsData } from '../../data/bonus-apps-data';
import { AppCard } from './AppCard';
import { AppModal } from './AppModal';

export function AppsGrid() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeApp, setActiveApp] = useState<{ id: string; name: string } | null>(null);

  const handleOpenApp = (id: string, name: string) => {
    setActiveApp({ id, name });
    setModalOpen(true);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bonusAppsData.map(app => (
          <AppCard key={app.id} app={app} onOpen={handleOpenApp} />
        ))}
      </div>
      
      <AppModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        appId={activeApp?.id ?? null}
        appName={activeApp?.name ?? ''}
      />
    </div>
  );
}
