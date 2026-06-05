import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { useColorScheme } from './hooks/useColorScheme';

function ThemeInit() {
  useColorScheme();
  return null;
}
import AppRouter from './router';
import { registerServiceWorker } from './lib/pwa';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeInit />
    <AppRouter />
  </StrictMode>,
);
