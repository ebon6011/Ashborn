import { useState } from 'react';
import { applyUpdate, useUpdateReady } from '../../platform/updates';
import { useIsBusy } from '../busy';
import { Button } from '../components/Button';

/** "A new update is ready" above the tab bar. Hidden while the set logger is open; never reloads on its own. */
export function UpdateBanner() {
  const ready = useUpdateReady();
  const busy = useIsBusy();
  const [applying, setApplying] = useState(false);
  if (!ready || busy) return null;
  return (
    <div role="status" className="safe-x fixed inset-x-0 z-30" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
      <div className="system-window mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm text-ink">A new update is ready</p>
        <Button
          disabled={applying}
          onClick={() => {
            setApplying(true);
            void applyUpdate();
          }}
        >
          Update now
        </Button>
      </div>
    </div>
  );
}
