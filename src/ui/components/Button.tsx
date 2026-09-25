import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

const STYLES: Record<Variant, string> = {
  primary: 'border-glow bg-glow/15 text-ink active:bg-glow/30',
  ghost: 'border-glow-soft text-muted active:text-ink',
  danger: 'border-danger text-danger active:bg-danger/10',
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`min-h-11 min-w-11 rounded border px-4 py-2 text-base font-medium transition-colors duration-150 disabled:opacity-40 ${STYLES[variant]} ${className}`}
      {...rest}
    />
  );
}
