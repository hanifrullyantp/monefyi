import './lib/passwordRecoveryIntent';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { useColorScheme } from './hooks/useColorScheme';
import { initOfflineSync } from './lib/offlineSync';

function ThemeInit() {
  useColorScheme();
  return null;
}
import AppRouter from './router';
import { registerServiceWorker } from './lib/pwa';
import { initEstimatorPwaDocument } from './lib/pwaBrand';

initEstimatorPwaDocument();
registerServiceWorker();
initOfflineSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeInit />
    <AppRouter />
  </StrictMode>,
);
