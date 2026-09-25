import { useId, type ReactNode } from 'react';

interface Props {
  title?: string;
  className?: string;
  children: ReactNode;
}

export function SystemWindow({ title, className = '', children }: Props) {
  const id = useId();
  return (
    <section className={`system-window p-4 ${className}`} aria-labelledby={title ? id : undefined}>
      {title && (
        <h2 id={id} className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-glow">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
