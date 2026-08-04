import { useCallback } from 'react';
import ReceptionistDashboard from './dashboard/ReceptionistDashboard';
import { readViewModePreference, persistViewMode } from '../components/frontdesk/ViewModeToggle';
import { useFrontDeskStore } from '../stores/frontDeskStore';
import type { ViewMode } from '../types/frontdesk.types';

/**
 * Halaman Front Desk — kartu kamar selalu visible, dashboard ringkas di atas.
 */
export default function FrontDeskPage() {
  const activeView = useFrontDeskStore((s) => s.activeView);
  const setActiveView = useFrontDeskStore((s) => s.setActiveView);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      persistViewMode(mode);
      setActiveView(mode);
    },
    [setActiveView]
  );

  const viewMode = activeView || readViewModePreference();

  return (
    <div className="relative -mx-4 -mt-2 flex min-h-0 flex-col sm:-mx-5 sm:-mt-3 lg:-m-5 lg:h-[calc(100dvh-64px)] lg:min-h-0">
      <div className="flex min-h-0 flex-1 flex-col px-3 pt-2 pb-[4.25rem] sm:px-4 sm:pt-3 lg:overflow-hidden lg:pb-4 lg:px-5">
        <ReceptionistDashboard
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </div>
    </div>
  );
}
