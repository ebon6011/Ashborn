import { Component, type ErrorInfo, type ReactNode } from 'react';
import { exportData } from '../../db/backup';
import { db } from '../../db/schema';
import { backupFileName, buildBackup } from '../../domain/backup';
import { saveBackupFile } from '../../platform/download';
import { Button } from './Button';
import { SystemWindow } from './SystemWindow';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Unhandled error', error, info);
  }

  async exportBackup(): Promise<void> {
    try {
      const now = new Date();
      const json = JSON.stringify(buildBackup(await exportData(db), now), null, 2);
      await saveBackupFile(json, backupFileName(now));
    } catch {
      // Best effort: the fallback screen has nothing else to offer here.
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="safe-top safe-x mx-auto max-w-md pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <SystemWindow title="Something went wrong">
          <p className="text-sm text-muted">
            Ashborn ran into a problem it couldn't recover from. Your data is still on this phone; export a backup before reloading.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => void this.exportBackup()}>
              Export backup
            </Button>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </SystemWindow>
      </main>
    );
  }
}
