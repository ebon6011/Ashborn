import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { getTheme, type ThemeItem } from '../../config/items';
import { db } from '../../db/schema';

/** Sets only the accent variables, so warning red and reward gold never change. */
export function applyTheme(theme: ThemeItem, root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--color-glow', theme.glow);
  root.style.setProperty('--color-glow-soft', theme.soft);
}

/** Keeps the app's accent in step with the equipped theme. */
export function useEquippedTheme(enabled: boolean): void {
  const themeId = useLiveQuery(async () => (enabled ? ((await db.player.get(1))?.themeId ?? null) : null), [enabled], null);
  useEffect(() => {
    applyTheme(getTheme(themeId));
  }, [themeId]);
}
