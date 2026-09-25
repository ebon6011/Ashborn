import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import './index.css';

registerSW({
  immediate: true,
  onRegisteredSW(_url, r) {
    if (r) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void r.update();
      });
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
