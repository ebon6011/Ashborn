import type { ReactNode } from 'react';

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="safe-top safe-x mx-auto max-w-md pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <h1 className="pb-3 pt-4 text-lg font-semibold tracking-wide text-ink">{title}</h1>
      <div className="space-y-4">{children}</div>
    </main>
  );
}
