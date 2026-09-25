import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

export function MedicalNotice({ onAccept, acceptLabel = 'I understand' }: { onAccept?: () => void; acceptLabel?: string }) {
  return (
    <SystemWindow title="Health notice">
      <div className="space-y-3 text-base text-ink">
        <p>Ashborn is a game for building habits. It is not medical advice.</p>
        <p>
          Check with a doctor before starting a new exercise or nutrition program, especially if you have a health condition,
          an injury, or are pregnant.
        </p>
        <p>Stop any exercise that causes pain, dizziness or shortness of breath. Rest days are always allowed and never penalised.</p>
      </div>
      {onAccept && (
        <Button className="mt-4 w-full" onClick={onAccept}>
          {acceptLabel}
        </Button>
      )}
    </SystemWindow>
  );
}
