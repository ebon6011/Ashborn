import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { archiveSideQuest, completeSideQuest, createSideQuest, updateSideQuest } from './sideQuests';

describe('side quests', () => {
  it('creates a quest with a trimmed name and XP clamped to 10–50', async () => {
    const db = await setupPlayer();
    const id = await createSideQuest(db, { title: '  Read 10 pages ', xp: 80, stat: 'discipline' });
    expect(await db.sideQuests.get(id)).toMatchObject({ title: 'Read 10 pages', xp: 50, stat: 'discipline', archived: false, completions: 0 });
    await updateSideQuest(db, id, { title: 'Read 20 pages', xp: 5, stat: 'discipline' });
    expect(await db.sideQuests.get(id)).toMatchObject({ title: 'Read 20 pages', xp: 10 });
    await expect(createSideQuest(db, { title: '   ', xp: 20, stat: 'discipline' })).rejects.toThrow('Give the quest a name.');
  });

  it('side quest completes once per day', async () => {
    const db = await setupPlayer();
    const id = await createSideQuest(db, { title: 'Drink water', xp: 20, stat: 'vitality' });
    expect(await completeSideQuest(db, id, at('2026-09-21'))).toBe(true);
    expect(await completeSideQuest(db, id, at('2026-09-21', '21:00'))).toBe(false);
    expect(await db.player.get(1)).toMatchObject({ xp: 20, questsCompleted: 1 });
    expect(await completeSideQuest(db, id, at('2026-09-22'))).toBe(true);
    expect((await db.player.get(1))?.xp).toBe(40);
  });

  it('every 5 completions raise the linked stat by 1', async () => {
    const db = await setupPlayer();
    const id = await createSideQuest(db, { title: 'Study 1 hour', xp: 10, stat: 'discipline' });
    for (const day of ['21', '22', '23', '24', '25']) await completeSideQuest(db, id, at(`2026-09-${day}`));
    expect((await db.player.get(1))?.stats.discipline).toBe(11);
    expect((await db.sideQuests.get(id))?.completions).toBe(5);
  });

  it('archived quests cannot be completed', async () => {
    const db = await setupPlayer();
    const id = await createSideQuest(db, { title: 'Stretch', xp: 10, stat: 'agility' });
    await archiveSideQuest(db, id);
    expect(await completeSideQuest(db, id, at('2026-09-21'))).toBe(false);
  });
});
