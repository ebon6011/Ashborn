export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  legend: string;
  options: ReadonlyArray<Choice<T>>;
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2;
}

export function ChoiceGroup<T extends string>({ legend, options, value, onChange, columns = 2 }: Props<T>) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm text-muted">{legend}</legend>
      <div className={`grid gap-2 ${columns === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-11 rounded border px-3 py-2 text-left text-base transition-colors duration-150 ${
                selected ? 'border-glow bg-glow/15 text-ink' : 'border-glow-soft text-muted'
              }`}
            >
              <span className="block">{option.label}</span>
              {option.hint && <span className="block text-sm text-muted">{option.hint}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
