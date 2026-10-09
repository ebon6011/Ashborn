import { ClassPicker } from '../components/ClassPicker';
import { SystemWindow } from '../components/SystemWindow';

/** After the Trial: choose a class now, or Later from the Class button. Silent until a tap. */
export function ClassChoiceOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose your class"
      className="safe-x fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void/90 py-6"
    >
      <div className="level-burst relative w-full max-w-sm">
        <SystemWindow title="System">
          <p className="mb-3 text-lg text-ink">Trial complete. Choose your class.</p>
          <ClassPicker onChosen={onClose} onLater={onClose} />
        </SystemWindow>
      </div>
    </div>
  );
}
