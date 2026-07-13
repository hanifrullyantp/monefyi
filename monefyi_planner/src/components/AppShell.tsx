import { Routes, Route, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './Layout';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import FinanceV2Routes from '../pages/finance-v2/FinanceV2Routes';
import Finance from '../pages/Finance';
import DatabaseMaster from '../pages/DatabaseMaster';
import Settings from '../pages/Settings';
import HrEmployees from '../pages/HrEmployees';
import WorkerDashboard from '../pages/WorkerDashboard';
import EstimatorRoutes from '../pages/estimator/EstimatorRoutes';
import OnboardingChecklist from './OnboardingChecklist';
import { useAppStore } from '../store/appStore';
import { showWorkerShell, canAccessManagerFeatures } from '../utils/platformUi';

function AppContent() {
  const { id: projectIdParam } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, activeTab, setOnline, setSyncStatus, setSelectedProjectId, setActiveTab, platformRole, uiViewMode, financeVersion } = useAppStore();

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
  const canAccessHr = canAccessManagerFeatures(user?.role, platformRole, user?.email, uiViewMode);

  useEffect(() => {
    if (activeTab !== 'finance') return;
    if (financeVersion === 'v2') {
      navigate('/app/finance-v2', { replace: true });
    }
  }, [activeTab, financeVersion, navigate]);

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
        return financeVersion === 'v1' ? <Finance /> : null;
      case 'hr':
      case 'team':
        return canAccessHr
          ? <HrEmployees />
          : <Dashboard onOpenProject={id => navigate(`/app/projects/${id}`)} />;
      case 'settings':
        return <Settings />;
      case 'estimator':
        return null;
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

function EstimatorShell() {
  return (
    <Layout>
      <EstimatorRoutes />
    </Layout>
  );
}

function FinanceV2Shell() {
  return (
    <Layout>
      <FinanceV2Routes />
    </Layout>
  );
}

function DatabaseShell() {
  return (
    <Layout>
      <DatabaseMaster />
    </Layout>
  );
}

export default function AppShell() {
  return (
    <Routes>
      <Route index element={<AppContent />} />
      <Route path="projects/:id" element={<AppContent />} />
      <Route path="database" element={<DatabaseShell />} />
      <Route path="estimator/*" element={<EstimatorShell />} />
      <Route path="finance-v2/*" element={<FinanceV2Shell />} />
    </Routes>
  );
}
