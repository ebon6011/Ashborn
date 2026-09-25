import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

export function BackupReminder({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <SystemWindow title="Warning">
      <p className="text-base">Back up your progress. Your last backup is more than 7 days old, or you have never made one.</p>
      <p className="mt-1 text-sm text-muted">Your data lives only on this phone.</p>
      <Button className="mt-3 w-full" onClick={onOpenSettings}>
        Go to backup
      </Button>
    </SystemWindow>
  );
}
