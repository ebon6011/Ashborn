import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

export function InstallGuide({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install Ashborn"
      className="safe-x fixed inset-0 z-50 flex items-end bg-void/80"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <SystemWindow title="Install Ashborn" className="mx-auto w-full max-w-md">
        <ol className="list-decimal space-y-2 pl-5 text-base">
          <li>
            Tap the <strong>Share</strong> button in Safari (the square with an arrow pointing up).
          </li>
          <li>
            Scroll down, tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
          </li>
          <li>Open Ashborn from the new icon on your home screen. It runs full screen and works offline.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">
          Install first, then create your player. On iPhone, Safari and the installed app keep separate data.
        </p>
        <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
          Continue in Safari
        </Button>
      </SystemWindow>
    </div>
  );
}
