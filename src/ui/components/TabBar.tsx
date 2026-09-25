export type Tab = 'status' | 'quests' | 'training' | 'nutrition' | 'settings';

const TABS: ReadonlyArray<{ id: Tab; label: string; icon: string }> = [
  { id: 'status', label: 'Status', icon: 'M12 2l8.66 5v10L12 22l-8.66-5V7z' },
  { id: 'quests', label: 'Quests', icon: 'M5 21V4h12l-2 4 2 4H5' },
  { id: 'training', label: 'Training', icon: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12' },
  { id: 'nutrition', label: 'Nutrition', icon: 'M12 3c3.5 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.5 6-11z' },
  { id: 'settings', label: 'Settings', icon: 'M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M7 16v4' },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-glow-soft bg-void/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <li key={t.id} className="flex-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onChange(t.id)}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs ${active ? 'text-glow' : 'text-muted'}`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.icon} />
                </svg>
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
