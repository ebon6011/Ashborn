const C = 'currentColor';

/** Original emblem frames, drawn for Ashborn (viewBox "-2 -4 64 66", in the theme accent). */
export const FRAME_PATHS: Record<string, string> = {
  'frame-hex': `<path d="M30 3 L53 16 L53 44 L30 57 L7 44 L7 16 Z" fill="none" stroke="${C}" stroke-width="2"/>`,
  'frame-iron-hex': `<path d="M30 3 L54 16 L54 44 L30 57 L6 44 L6 16 Z" fill="none" stroke="${C}" stroke-width="3"/><path d="M30 8 L50 19 L50 41 L30 52 L10 41 L10 19 Z" fill="none" stroke="${C}" stroke-width="1" opacity=".5"/>`,
  'frame-thorned-crest': `<circle cx="30" cy="30" r="22" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M30 2 L33 9 L27 9Z M58 30 L51 33 L51 27Z M30 58 L27 51 L33 51Z M2 30 L9 27 L9 33Z M50 10 L46 17 L43 14Z M10 10 L17 14 L14 17Z M50 50 L43 46 L46 43Z M10 50 L14 43 L17 46Z" fill="${C}"/>`,
  'frame-winged-seal': `<circle cx="30" cy="30" r="17" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M13 30 C6 22 2 18 1 10 C8 16 12 18 15 22 M47 30 C54 22 58 18 59 10 C52 16 48 18 45 22" fill="none" stroke="${C}" stroke-width="2"/>`,
  'frame-crown-rim': `<circle cx="30" cy="33" r="20" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M16 15 L20 4 L26 12 L30 2 L34 12 L40 4 L44 15 Z" fill="${C}"/>`,
  'frame-runic-circle': `<circle cx="30" cy="30" r="25" fill="none" stroke="${C}" stroke-width="1.5"/><circle cx="30" cy="30" r="20" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M30 5 L30 10 M55 30 L50 30 M30 55 L30 50 M5 30 L10 30 M47 13 L44 16 M13 47 L16 44 M47 47 L44 44 M13 13 L16 16" stroke="${C}" stroke-width="2"/>`,
  'frame-fang-ring': `<circle cx="30" cy="30" r="21" fill="none" stroke="${C}" stroke-width="3"/><path d="M22 9 L25 18 L28 10 M38 9 L35 18 L32 10 M22 51 L25 42 L28 50 M38 51 L35 42 L32 50" fill="none" stroke="${C}" stroke-width="2"/>`,
  'frame-star-sigil': `<path d="M30 2 L36 22 L57 22 L40 35 L47 56 L30 43 L13 56 L20 35 L3 22 L24 22 Z" fill="none" stroke="${C}" stroke-width="2.5"/>`,
  'frame-chain-loop': `<g fill="none" stroke="${C}" stroke-width="2.2"><ellipse cx="30" cy="6" rx="6" ry="4"/><ellipse cx="54" cy="30" rx="4" ry="6"/><ellipse cx="30" cy="54" rx="6" ry="4"/><ellipse cx="6" cy="30" rx="4" ry="6"/><ellipse cx="47" cy="13" rx="5" ry="4" transform="rotate(45 47 13)"/><ellipse cx="47" cy="47" rx="5" ry="4" transform="rotate(-45 47 47)"/><ellipse cx="13" cy="47" rx="5" ry="4" transform="rotate(45 13 47)"/><ellipse cx="13" cy="13" rx="5" ry="4" transform="rotate(-45 13 13)"/></g>`,
  'frame-flame-halo': `<circle cx="30" cy="32" r="18" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M18 18 C14 10 20 6 18 0 C26 6 24 12 26 14 M42 18 C46 10 40 6 42 0 C34 6 36 12 34 14 M30 13 C26 6 32 3 30 -2 C36 4 34 9 34 13" fill="none" stroke="${C}" stroke-width="2"/>`,
  'frame-frost-shard': `<path d="M30 2 L38 22 L58 30 L38 38 L30 58 L22 38 L2 30 L22 22 Z" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M30 12 L30 48 M12 30 L48 30" stroke="${C}" stroke-width="1" opacity=".5"/>`,
  'frame-serpent-coil': `<path d="M30 8 C46 8 52 20 52 30 C52 44 42 52 30 52 C16 52 8 42 8 30 C8 18 18 12 26 12" fill="none" stroke="${C}" stroke-width="3"/><path d="M26 12 L18 8 L22 15 Z" fill="${C}"/>`,
  'frame-shield-crest': `<path d="M30 3 L53 11 L51 34 C49 46 40 53 30 57 C20 53 11 46 9 34 L7 11 Z" fill="none" stroke="${C}" stroke-width="2.5"/>`,
  'frame-eclipse-ring': `<circle cx="30" cy="30" r="23" fill="none" stroke="${C}" stroke-width="2"/><path d="M30 7 A23 23 0 0 1 30 53 A17 23 0 0 0 30 7 Z" fill="${C}" opacity=".8"/>`,
  'frame-antler-crest': `<circle cx="30" cy="34" r="18" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M20 20 L12 6 M16 13 L8 12 M14 9 L16 2 M40 20 L48 6 M44 13 L52 12 M46 9 L44 2" fill="none" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>`,
  'frame-blade-cross': `<circle cx="30" cy="30" r="17" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M6 6 L54 54 M54 6 L6 54" stroke="${C}" stroke-width="2.5"/><path d="M4 4 L10 6 L6 10Z M56 4 L50 6 L54 10Z" fill="${C}"/>`,
};
