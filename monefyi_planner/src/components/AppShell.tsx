import { Routes, Route, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './Layout';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import Finance from '../pages/Finance';
import Settings from '../pages/Settings';
import HrEmployees from '../pages/HrEmployees';
import WorkerDashboard from '../pages/WorkerDashboard';
import OnboardingChecklist from './OnboardingChecklist';
import { useAppStore } from '../store/appStore';
import { useBootstrap } from '../hooks/useBootstrap';
import { showWorkerShell } from '../utils/platformUi';
import { isPlatformAdmin } from '../services/adminService';

function AppContent() {
  const { id: projectIdParam } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, activeTab, setOnline, setSyncStatus, setSelectedProjectId, setActiveTab, platformRole, uiViewMode } = useAppStore();
  useBootstrap();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams, setActiveTab]);

  useEffect(() => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
      setActiveTab('projects');
    }
  }, [projectIdParam, setSelectedProjectId, setActiveTab]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setSyncStatus('syncing');
      setTimeout(() => setSyncStatus('synced'), 1500);
    };
    const handleOffline = () => {
      setOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, setSyncStatus]);

  const isWorker = showWorkerShell(user?.role, platformRole, user?.email, uiViewMode);
  const isSuperAdmin = isPlatformAdmin(platformRole, user?.email);

  const renderPage = () => {
    if (isWorker) return <WorkerDashboard />;
    switch (activeTab) {
      case 'home':
        return <Dashboard onOpenProject={id => navigate(`/app/projects/${id}`)} />;
      case 'projects':
        return (
          <Projects
            initialProjectId={projectIdParam}
            onOpenProject={id => navigate(`/app/projects/${id}`)}
            onCloseProject={() => navigate('/app')}
          />
        );
      case 'finance':
        return <Finance />;
      case 'hr':
      case 'team':
        return (isSuperAdmin || user?.role === 'owner' || user?.role === 'manager')
          ? <HrEmployees />
          : <Dashboard onOpenProject={id => navigate(`/app/projects/${id}`)} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onOpenProject={id => navigate(`/app/projects/${id}`)} />;
    }
  };

  const pageContent = renderPage();
  const showChecklist = isWorker || user?.role === 'manager';

  return (
    <Layout>
      {showChecklist && <OnboardingChecklist />}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (projectIdParam || '')}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {pageContent}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default function AppShell() {
  return (
    <Routes>
      <Route index element={<AppContent />} />
      <Route path="projects/:id" element={<AppContent />} />
    </Routes>
  );
}
