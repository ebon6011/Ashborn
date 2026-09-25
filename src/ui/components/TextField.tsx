import { useId } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function TextField({ label, value, onChange, maxLength = 60 }: Props) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink focus:border-glow focus:outline-none"
      />
    </div>
  );
}
