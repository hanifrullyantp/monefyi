import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import AIAssistant from '../ai/AIAssistant';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-[3.5rem] lg:pb-3">
          <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-4">
            <Outlet />
          </div>
        </main>
        <AIAssistant />
      </div>
      <BottomNav />
    </div>
  );
}
