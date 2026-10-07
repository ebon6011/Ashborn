/** Earned-only rewards. Ids are stored on phones and in backups: never rename or remove one. */
export type ItemKind = 'theme' | 'frame' | 'title';

export interface ThemeItem {
  id: string;
  kind: 'theme';
  name: string;
  /** --color-glow */
  glow: string;
  /** --color-glow-soft */
  soft: string;
}
export interface FrameItem {
  id: string;
  kind: 'frame';
  name: string;
}
export interface TitleItem {
  id: string;
  kind: 'title';
  name: string;
}
export type ItemDef = ThemeItem | FrameItem | TitleItem;

export const DEFAULT_THEME: ThemeItem = { id: 'theme-default', kind: 'theme', name: 'System Blue', glow: '#3ab8ff', soft: '#1d5c85' };
export const DEFAULT_FRAME: FrameItem = { id: 'frame-hex', kind: 'frame', name: 'Plain Hex' };

/** Accents avoid red (warnings) and gold (rewards). `soft` = 45 % accent over #05070d. */
export const THEMES: readonly ThemeItem[] = [
  { id: 'theme-ember', kind: 'theme', name: 'Ember', glow: '#ff8a3d', soft: '#764223' },
  { id: 'theme-verdant', kind: 'theme', name: 'Verdant', glow: '#3dffa0', soft: '#1e774f' },
  { id: 'theme-amethyst', kind: 'theme', name: 'Amethyst', glow: '#b07cff', soft: '#523c7a' },
  { id: 'theme-frost', kind: 'theme', name: 'Frost', glow: '#b4f0ff', soft: '#54707a' },
  { id: 'theme-jade', kind: 'theme', name: 'Jade', glow: '#00c9a7', soft: '#035e52' },
  { id: 'theme-orchid', kind: 'theme', name: 'Orchid', glow: '#e07cff', soft: '#683c7a' },
  { id: 'theme-tidal', kind: 'theme', name: 'Tidal', glow: '#2ee6e6', soft: '#176b6f' },
  { id: 'theme-moss', kind: 'theme', name: 'Moss', glow: '#9ccf3d', soft: '#496123' },
  { id: 'theme-twilight', kind: 'theme', name: 'Twilight', glow: '#7c8cff', soft: '#3b437a' },
  { id: 'theme-coral', kind: 'theme', name: 'Coral', glow: '#ff8f7a', soft: '#76443e' },
  { id: 'theme-ashen', kind: 'theme', name: 'Ashen', glow: '#c8d0dc', soft: '#5d616a' },
  { id: 'theme-blossom', kind: 'theme', name: 'Blossom', glow: '#ff9ecf', soft: '#764b64' },
  { id: 'theme-venom', kind: 'theme', name: 'Venom', glow: '#b6ff3d', soft: '#557723' },
  { id: 'theme-plum', kind: 'theme', name: 'Plum', glow: '#d05c9a', soft: '#602d4c' },
  { id: 'theme-cobalt', kind: 'theme', name: 'Cobalt', glow: '#4d6bff', soft: '#25347a' },
];

export const FRAMES: readonly FrameItem[] = (
  [
    ['iron-hex', 'Iron Hex'], ['thorned-crest', 'Thorned Crest'], ['winged-seal', 'Winged Seal'], ['crown-rim', 'Crown Rim'],
    ['runic-circle', 'Runic Circle'], ['fang-ring', 'Fang Ring'], ['star-sigil', 'Star Sigil'], ['chain-loop', 'Chain Loop'],
    ['flame-halo', 'Flame Halo'], ['frost-shard', 'Frost Shard'], ['serpent-coil', 'Serpent Coil'], ['shield-crest', 'Shield Crest'],
    ['eclipse-ring', 'Eclipse Ring'], ['antler-crest', 'Antler Crest'], ['blade-cross', 'Blade Cross'],
  ] as const
).map(([id, name]) => ({ id: `frame-${id}`, kind: 'frame' as const, name }));

const TITLE_NAMES = [
  'Shieldbearer', 'Dawnstrider', 'Ironheart', 'Ember Soul', 'Stormcaller', 'Unyielding', 'Pathfinder', 'Nightwalker',
  'Stonefist', 'Swiftfoot', 'Steelspine', 'Frostborn', 'Ashwalker', 'Lionheart', 'Moonrunner', 'Rune Seeker',
  'Tidebreaker', 'Skyreach', 'Grim Resolve', 'Bladewise', 'Warden of Dawn', 'Starforged', 'Peakclimber', 'Thunderstep',
  'Silent Blade', 'Endless March', 'Iron Oath', 'Ascendant', 'Gatewalker', 'Last Light',
] as const;
export const TITLES: readonly TitleItem[] = TITLE_NAMES.map((name) => ({
  id: `title-${name.toLowerCase().replace(/ /g, '-')}`,
  kind: 'title' as const,
  name,
}));

export const ALL_ITEMS: readonly ItemDef[] = [...THEMES, ...FRAMES, ...TITLES];

export function getItem(id: string): ItemDef | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

/** The theme for a stored id; null or unknown ids give the default. */
export function getTheme(id: string | null): ThemeItem {
  const item = id ? getItem(id) : undefined;
  return item?.kind === 'theme' ? item : DEFAULT_THEME;
}
