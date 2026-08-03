import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-4">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
