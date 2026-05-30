import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './components/LandingPage';
import { LoginPage, SignupPage } from './components/AuthPages';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import WorkerDashboard from './pages/WorkerDashboard';
import { useAppStore } from './store/appStore';

export default function App() {
  const {
    currentView,
    setCurrentView,
    isAuthenticated,
    user,
    activeTab,
    setOnline,
    setSyncStatus,
  } = useAppStore();

  // Online/offline detection
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

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated && currentView === 'landing') {
      setCurrentView('dashboard');
    }
  }, [isAuthenticated, currentView, setCurrentView]);

  const isWorker = user?.role === 'worker' || user?.role === 'staff';

  // Render page content based on active tab
  const renderPage = () => {
    if (isWorker) {
      return <WorkerDashboard />;
    }

    switch (activeTab) {
      case 'home':
        return <Dashboard />;
      case 'projects':
        return <Projects />;
      case 'finance':
        return <Finance />;
      case 'settings':
      case 'hr':
      case 'admin':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="font-sans">
      <AnimatePresence mode="wait">
        {currentView === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <LandingPage
              onLogin={() => setCurrentView('login')}
              onSignup={() => setCurrentView('signup')}
            />
          </motion.div>
        )}

        {currentView === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <LoginPage onBack={() => setCurrentView('landing')} />
          </motion.div>
        )}

        {currentView === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <SignupPage onBack={() => setCurrentView('landing')} />
          </motion.div>
        )}

        {currentView === 'dashboard' && isAuthenticated && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <Layout>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
