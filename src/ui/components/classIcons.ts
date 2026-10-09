import type { ClassId } from '../../domain/types';

const C = 'currentColor';

/** Original class icons, drawn for Ashborn (viewBox "0 0 60 60", in the theme accent). */
export const CLASS_ICON_PATHS: Record<ClassId, string> = {
  ironclad: `<path d="M30 4 L52 14 L52 34 C52 46 42 54 30 57 C18 54 8 46 8 34 L8 14 Z" fill="none" stroke="${C}" stroke-width="3"/><path d="M20 22 L40 22 L40 30 L36 30 L36 40 L24 40 L24 30 L20 30 Z" fill="${C}"/><path d="M27 40 L27 46 L33 46 L33 40" fill="${C}" opacity=".6"/>`,
  galestrider: `<circle cx="30" cy="30" r="25" fill="none" stroke="${C}" stroke-width="3"/><path d="M14 36 C22 30 30 28 46 18 M14 44 C24 38 34 34 48 28 M18 28 C24 24 30 22 40 14" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`,
  bulwark: `<rect x="8" y="8" width="44" height="44" rx="6" fill="none" stroke="${C}" stroke-width="3"/><path d="M16 42 L16 24 L30 16 L44 24 L44 42 Z" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M22 42 L22 30 L38 30 L38 42 Z" fill="${C}" opacity=".85"/>`,
  wayfarer: `<circle cx="30" cy="30" r="25" fill="none" stroke="${C}" stroke-width="3"/><path d="M30 8 L34 30 L30 52 L26 30 Z" fill="${C}"/><path d="M8 30 L30 26 L52 30 L30 34 Z" fill="${C}" opacity=".6"/>`,
};
