# Ashborn — Weekly Boss Design (v1.4.0)

Date: 2026-09-28
Status: design approved in chat; awaiting written-spec review

## Intent
A weekly boss fight that turns the week's workouts and quests into damage. Winning feels great; losing costs nothing.

## Owner decisions
- Loot = each Boss drops its own original title (plus bonus XP). A repeat win gives XP only.
- Both daily quests and training days deal damage; side quests and the penalty quest deal chip damage.
- Everyone needs about 3 sessions to win (HP numbers grow with level/experience, effort does not).
- One original silhouette per Boss, drawn in code.

## 1. Roster (`src/config/bosses.ts`) — original
| id | Name | Epithet | Weakness | Title dropped | Silhouette |
|---|---|---|---|---|---|
| mawgrath | Mawgrath | the Hollow Colossus | legs | Colossus Breaker | colossus |
| vessik | Vessik | the Ironroot Warden | legs | Rootsplitter | treant |
| ulgara | Ulgara | the Coiled Tyrant | core | Tyrant's Bane | serpent |
| brakmor | Brakmor | the Stone-Gut Titan | core | Titanfall | titan |
| sylreth | Sylreth | the Ashwind Wraith | cardio | Windchaser | wraith |
| korrun | Korrun | the Tireless Hound | cardio | Houndrunner | hound |
| grimhald | Grimhald | the Iron-Armed Brute | upper | Armbreaker | brute |
| zereth | Zereth | the Chainbound Knight | upper | Chainbreaker | knight |
Each has a one-line story. Rotation: roster index = (weeks since 2026-01-05, a Monday) mod 8, so consecutive weeks differ.

## 2. Week
- A Boss week runs Monday 00:00 → Sunday 23:59 in the phone's local time (`weekStartOf`, DST-safe date keys).
- The current week's Boss is created on launch/foreground (with the daily reset) and at registration. Its HP scale is fixed at creation from the player's level and experience.
- Undefeated Bosses simply stay in history as not defeated. No penalty of any kind.

## 3. Numbers (`src/config/progression.ts` → `boss`)
- `sessionsToWin: 3`, `sessionDamage: 100`, `weaknessMultiplier: 2`
- `chip: { sideQuest: 0.1, penalty: 0.25 }` (fractions of a session)
- `trainingDailyCapSessions: 1` (base training damage per day, before the weakness bonus)
- `scale: { perLevel: 0.05, byTier: { never: 1, beginner: 1.2, intermediate: 1.5, advanced: 1.8 } }` → `scale = tierFactor × (1 + perLevel × (level − 1))`
- `maxHp = round(sessionsToWin × sessionDamage × scale)`
- `xpReward: { base: 100, perLevel: 10 }` → `base + perLevel × level`

## 4. Damage (all × scale, rounded; × weaknessMultiplier when the category matches)
- Daily quest item completed (crosses its target): `sessionDamage / itemCount`. Categories: push-ups → upper, sit-ups → core, squats → legs, walk/jog/run → cardio.
- Training set logged: `sessionDamage / plannedSetsPerDay` where `plannedSetsPerDay` = this week's planned sets ÷ planned days (min 1). Base training damage per day is capped at `trainingDailyCapSessions × sessionDamage`. Categories: push/pull → upper, legs → legs, core → core.
- Side quest completed: `chip.sideQuest × sessionDamage` (no category).
- Penalty quest completed: `chip.penalty × sessionDamage`; category from its item (squats → legs, walk → cardio).
- Rest days deal no damage. Damage only applies to the current week's Boss and never below 0 HP.

## 5. Victory (exactly once)
- HP reaches 0 → `defeatedAt` set; bonus XP awarded (quest-log kind `boss`); the Boss's title unlocked if not already owned; a `bossDefeated` event queued.
- "BOSS DEFEATED" System window (rank-up fanfare, glow/particles as level-up, reduced motion respected) with XP and title; it queues with level-up/title events.

## 6. Status screen
- Boss window: silhouette, name + epithet, weakness badge, HP bar (hp / maxHp), "N days left" (1 on Sunday: "Last day"), story line. Defeated: "Defeated" + XP and title earned.
- Titles list/select include unlocked Boss titles.

## 7. Data safety (CLAUDE.md rule 2)
- Dexie schema v2 adds table `bosses` (key `weekStart`); all v1 tables unchanged.
- `SCHEMA_VERSION = 2`; backup migration step 2 adds `bosses: []` to v1 backups. Validators accept `bosses` rows and quest-log kind `boss`.
- Test: a v1 database with real data opens as v2 with every row intact and an empty `bosses` table; a v1 backup imports.

## 8. Release
v1.4.0; changelog: "A new Boss appears every Monday. Work out and finish quests to deal damage — hit its weakness for double. Beat it by Sunday for bonus XP and a rare title."

## Testing
- Damage maths (item quarter, weakness double, training per set + daily cap, chips, never below 0).
- Weekly reset: Monday boundary in local time incl. a DST week; rotation never repeats consecutively.
- Scaling: beginner vs advanced both win in exactly 3 full sessions without weakness hits; HP numbers differ.
- Victory rewards once (double tap / later damage).
- Schema v1 → v2 upgrade keeps all data; v1 backup imports.
- Status Boss window; defeated overlay; full check + e2e.
