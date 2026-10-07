import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { DEFAULT_FRAME, DEFAULT_THEME, FRAMES, getTheme, THEMES, TITLES, type ItemDef } from '../../config/items';
import { progression } from '../../config/progression';
import { equipFrame, equipTheme } from '../../db/repo/inventory';
import { ownedTitleIds, setTitle } from '../../db/repo/player';
import { db } from '../../db/schema';
import { ALL_TITLES } from '../../domain/achievements';
import { Button } from '../components/Button';
import { Emblem } from '../components/Emblem';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { applyTheme } from '../hooks/theme';

type TabId = 'themes' | 'frames' | 'titles' | 'shields';
const TABS: { id: TabId; label: string }[] = [
  { id: 'themes', label: 'Themes' },
  { id: 'frames', label: 'Frames' },
  { id: 'titles', label: 'Titles' },
  { id: 'shields', label: 'Shields' },
];
const PREVIEWABLE: readonly ItemDef[] = [DEFAULT_THEME, DEFAULT_FRAME, ...THEMES, ...FRAMES];
/** Defaults are stored as null. */
const storedId = (id: string) => (id === DEFAULT_THEME.id || id === DEFAULT_FRAME.id ? null : id);

/** Earned items: preview a theme or frame live, then equip it. Nothing here can be bought. */
export function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<TabId>('themes');
  const [preview, setPreview] = useState<string | null>(null);
  const player = useLiveQuery(() => db.player.get(1), []);
  const profile = useLiveQuery(() => db.profile.get(1), []);
  const owned = useLiveQuery(async () => new Set((await db.inventory.toArray()).map((r) => r.itemId)), [], new Set<string>());
  const titles = useLiveQuery(() => ownedTitleIds(db), [], [] as string[]);
  const equippedTheme = player?.themeId ?? null;

  // A theme preview recolours the app; the equipped theme always comes back when you leave.
  useEffect(() => {
    if (tab === 'themes' && preview) applyTheme(getTheme(storedId(preview)));
    else applyTheme(getTheme(equippedTheme));
  }, [tab, preview, equippedTheme]);
  useEffect(() => () => applyTheme(getTheme(equippedTheme)), [equippedTheme]);

  if (!player || !profile) return null;

  const selected = preview ? PREVIEWABLE.find((i) => i.id === preview) : undefined;
  const equipSelected = async () => {
    if (!selected) return;
    if (selected.kind === 'theme') await equipTheme(db, storedId(selected.id));
    else await equipFrame(db, storedId(selected.id));
    setPreview(null);
  };

  const grid = (defaultItem: ItemDef, items: readonly ItemDef[], equippedId: string | null) => {
    const equipped = equippedId ?? defaultItem.id;
    return (
      <>
        <p className="mb-2 text-sm text-muted">{`${items.filter((i) => owned.has(i.id)).length + 1} of ${items.length + 1} found`}</p>
        <div className="grid grid-cols-3 gap-2">
          {[defaultItem, ...items].map((item) =>
            item.id === defaultItem.id || owned.has(item.id) ? (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreview(item.id)}
                className={`min-h-16 rounded border p-2 text-sm text-ink ${preview === item.id ? 'border-glow' : 'border-glow-soft'}`}
                style={item.kind === 'theme' ? { borderColor: item.glow } : undefined}
              >
                {item.name}
                {equipped === item.id && <span className="block text-xs text-glow">Equipped</span>}
                {preview === item.id && equipped !== item.id && <span className="block text-xs text-muted">Previewing</span>}
              </button>
            ) : (
              <div key={item.id} className="flex min-h-16 items-center justify-center rounded border border-glow-soft/50 p-2 text-sm text-muted">
                ? ? ?
              </div>
            ),
          )}
        </div>
      </>
    );
  };

  return (
    <Screen title="Inventory">
      <Button variant="ghost" onClick={onBack} className="mb-3">
        Back
      </Button>
      <div role="tablist" aria-label="Inventory" className="mb-3 grid grid-cols-4 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setPreview(null);
            }}
            className={`min-h-11 border-b-2 text-sm ${tab === t.id ? 'border-glow text-glow' : 'border-transparent text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'themes' && (
        <SystemWindow title="Themes">
          {grid(DEFAULT_THEME, THEMES, player.themeId)}
          {selected?.kind === 'theme' && (
            <div className="mt-3">
              <p className="text-sm text-muted">This is how your windows and bars will look.</p>
              <div className="mt-2 h-2 rounded bg-glow-soft">
                <div className="h-2 w-3/5 rounded bg-glow" />
              </div>
              <Button className="mt-3 w-full" onClick={() => void equipSelected()}>{`Equip ${selected.name}`}</Button>
            </div>
          )}
        </SystemWindow>
      )}

      {tab === 'frames' && (
        <SystemWindow title="Frames">
          <div className="mb-3 flex justify-center">
            <Emblem name={profile.name} frameId={selected?.kind === 'frame' ? storedId(selected.id) : player.frameId} size={72} />
          </div>
          {grid(DEFAULT_FRAME, FRAMES, player.frameId)}
          {selected?.kind === 'frame' && (
            <Button className="mt-3 w-full" onClick={() => void equipSelected()}>{`Equip ${selected.name}`}</Button>
          )}
        </SystemWindow>
      )}

      {tab === 'titles' && (
        <SystemWindow title="Titles">
          <p className="mb-2 text-sm text-muted">{`${TITLES.filter((t) => titles.includes(t.id)).length} of ${TITLES.length} item titles found`}</p>
          <ul className="space-y-2">
            {ALL_TITLES.filter((t) => titles.includes(t.id)).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className={player.titleId === t.id ? 'text-glow' : 'text-ink'}>{t.title}</span>
                {player.titleId === t.id ? (
                  <span className="text-xs text-glow">Equipped</span>
                ) : (
                  <Button variant="ghost" aria-label={`Equip ${t.title}`} onClick={() => void setTitle(db, t.id)}>
                    Equip
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}

      {tab === 'shields' && (
        <SystemWindow title="Streak Shields">
          <p className="text-2xl text-ink">{`${player.shields} of ${progression.items.maxShields}`}</p>
          <p className="mt-2 text-sm text-muted">
            A Shield saves your streak when you miss a day. It is used automatically, only when it can keep your streak alive. The penalty quest still comes.
          </p>
        </SystemWindow>
      )}
    </Screen>
  );
}
