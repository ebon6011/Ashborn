import { useId, useState } from 'react';
import { parseNumberInput, type NumberRule } from '../../domain/input';

interface Props {
  label: string;
  unit?: string;
  /** Initial value only. Give the field a new `key` to reset it. */
  value: number | null;
  onChange: (value: number | null) => void;
  rule: NumberRule;
  decimal?: boolean;
}

export function NumberField({ label, unit, value, onChange, rule, decimal = false }: Props) {
  const id = useId();
  const [text, setText] = useState(value === null ? '' : String(value));
  const invalid = text.trim() !== '' && parseNumberInput(text, rule) === null;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-muted">
        {label}
        {unit ? ` (${unit})` : ''}
      </label>
      <input
        id={id}
        inputMode={decimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        value={text}
        aria-invalid={invalid}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseNumberInput(e.target.value, rule));
        }}
        className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink focus:border-glow focus:outline-none"
      />
      {invalid && (
        <p className="mt-1 text-sm text-danger">
          Enter a number from {rule.min} to {rule.max}.
        </p>
      )}
    </div>
  );
}
