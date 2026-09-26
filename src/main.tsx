import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { checkForUpdates, markUpdateReady, setApplyUpdate, setRegistration } from './platform/updates';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import './index.css';

// Prompt mode: a new version downloads and waits until the player taps "Update now".
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: markUpdateReady,
  onRegisteredSW(_url, r) {
    if (!r) return;
    setRegistration(r);
    void checkForUpdates();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    });
  },
});
setApplyUpdate(() => updateSW(true));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
