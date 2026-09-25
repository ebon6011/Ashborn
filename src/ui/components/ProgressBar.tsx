export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-glow-soft/30"
    >
      <div className="h-full bg-glow shadow-[0_0_8px_var(--color-glow)] transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}
