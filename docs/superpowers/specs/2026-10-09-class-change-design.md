# Ashborn — Class Change (v1.7.0)

Date: 2026-10-09
Status: design approved in chat (2 parts); awaiting written-spec review

## Intent
At level 10 the player earns a class through a one-time Trial. The class gently shapes their daily training and rewards the matching stat, so the journey feels more personal without making anything harder or riskier.

## Owner decisions
- **The 4 original classes** (names and icons approved):

  | id | Name | Stat bonus | Daily focus |
  |---|---|---|---|
  | ironclad | Ironclad | strength | pushups |
  | galestrider | Galestrider | agility | cardio |
  | bulwark | Bulwark | endurance | squats |
  | wayfarer | Wayfarer | discipline | none (balanced) |

- **Daily quest mix:** it uses the same 4 exercises.
  - The class's focus item gets **+30%**, and each other item gets **−10%**.
  - Wayfarer changes nothing.
  - No class means today's quest exactly.
- **Stat bonus:** side quests for the class's stat give **+10% XP** (rounded to the nearest whole XP).
- **Class Change Trial:**
  - It unlocks at **level 10 or higher**, once ever, with no deadline.
  - It is the 4 usual exercises at **1.5×** the player's daily amounts for their level.
  - Finishing it gives XP equal to one full daily quest, deals one full session of Boss damage, and opens **Choose your class**.
  - Players already past level 10 see it straight away.
- **Changing class:** the player can change class again after **30 days** (counted in days from the date of the last choice), with no new Trial.
- **Display:** the Status card shows the class icon and name, plus a **Class** button.
- **Storage:** 3 new player fields via a versioned Dexie migration, included in backups.

## 1. Config
- **`src/config/classes.ts`:** `ClassDef { id: ClassId; name: string; tagline: string; stat: StatKey; focus: QuestItemKind | null }`, the `CLASSES` list in the order above, and `getClass(id)`. Icons live in `src/ui/components/classIcons.ts` as original SVG markup per id.
- **`src/config/progression.ts`** adds a `classes` block:

  ```
  classes: {
    unlockLevel: 10,
    changeCooldownDays: 30,
    trialScale: 1.5,
    focusBoost: 0.3,
    otherCut: 0.1,
    sideQuestXpBonus: 0.1,
  }
  ```

## 2. Saved data (Dexie v4; no data lost)
- **`Player` gains:**
  - `classId: ClassId | null` (null means not chosen);
  - `classChosenAt: string | null` (a date key);
  - `trialDone: boolean`.
- **`this.version(4).stores(STORES_V3).upgrade(…)`** sets `classId: null`, `classChosenAt: null` and `trialDone: false` on the existing player. Nothing else changes.
- **Backups:**
  - `SCHEMA_VERSION = 4`, and `backupMigrations[4]` adds the same defaults.
  - The validator checks that `classId` is null or a known id, `classChosenAt` is null or a date key, and `trialDone` is a boolean.
  - A backup with a class but no `classChosenAt` is rejected.
- **Trial progress** is stored in meta as `classTrial: { items: QuestItem[]; createdAt: string }`. Meta is already backed up.
- **`QuestKind`** gains `'trial'`, used for the Trial's XP log entry. The `questLog` validator accepts it.

## 3. Daily quest mix
- `generateDailyItems(experience, level, reference, classId = null)`:
  1. The base target is computed exactly as today (tier × level scale).
  2. Then it's multiplied by `1 + focusBoost` for the focus item, or by `1 − otherCut` for the others, and rounded, with a minimum of 1.
  3. The existing weekly growth cap is applied **after** that, so a newly boosted focus item rises by at most 10% a week.
- With `classId` null or `'wayfarer'`, the output is identical to v1.6.0, and a test checks this.
- `createDayRecord` and `startDay` pass `player.classId`. A class change only affects quests created after it, because today's existing record is never regenerated.

## 4. The Trial
- **Availability:** `trialAvailable(player) = player.level >= unlockLevel && !player.trialDone`.
- **`ensureTrial(database, date)`:** if the Trial is available and there's no `classTrial` in meta, it creates one. The items are `generateDailyItems(experience, level, null, null)` with each target × `trialScale`, rounded, minimum 1. It doesn't use the growth cap or a class.
- **`setTrialProgress(database, itemId, progress, now)`:** updates the stored items. When every item reaches its target:
  - set `trialDone: true` and remove `classTrial`;
  - award `dailyQuestXp(level)` XP as `kind: 'trial'`, counting as a quest;
  - deal `sessionDamage` Boss damage with no category;
  - queue a `{ type: 'classChoice' }` event.
  - All of this happens in one transaction.
- **When `ensureTrial` runs:** `startDay` calls it, and so does `awardXp` after a level-up that reaches the unlock level, so the Trial appears without waiting for the next day.

## 5. Choosing and changing class
- **`canChangeClass(player, today)`:** true when the Trial is done, and either `classId` is null or `daysBetween(classChosenAt, today) >= changeCooldownDays`.
- **`daysUntilClassChange(player, today)`:** gives N for the UI.
- **`chooseClass(database, classId, now)`:** throws "Finish the Class Change Trial first." or "You can change class in N days." when not allowed. Otherwise it sets `classId` and `classChosenAt = todayKey(now)`.
- Choosing the same class again is allowed and simply restarts the timer.

## 6. Side-quest XP bonus
- `completeSideQuest` awards `round(xp × (1 + sideQuestXpBonus))` when `getClass(player.classId)?.stat === quest.stat`. Otherwise it awards `xp` unchanged.
- The bonus is written into the quest log entry's `xp`, so the history shows the real amount.

## 7. Screens
- **Status card:**
  - Under the title: the class icon (18 px, accent colour) and the class name, only when a class is chosen.
  - The row of buttons becomes **Inventory** | **Class**.
  - The Class button's label is "Class", "Class: not chosen", or "Class unlocks at level 10".
- **Quests screen:** a **Class Change · Trial** window with a gold edge sits above the Daily Quest while `classTrial` exists. It has the same item rows and controls as the daily quest, and the reward line "Reward: N XP · then choose your class".
- **`ClassScreen`** is opened from the Class button (the same inline pattern as the Inventory, with a Back button).
  - **Not unlocked:** it explains the level 10 Trial.
  - **Trial not done:** it says "Finish the Trial on the Quests screen".
  - **Otherwise:** it lists the 4 classes. Each shows its icon, name, tagline, stat and focus, and you tap one to select it. Below the list is a **Become {Name}** button (disabled during the cooldown, which shows "You can change class in N days"). There's also the note "You can change class again after 30 days."
  - `achievement` plays when you tap Become.
- **`classChoice` event:** `EventHost` shows a full-screen version of the class list (same component) with **Become …** and **Later**. Later dismisses the event, and the player can choose from the Class button.
- **iPhone:** 44 px targets, safe areas, no new text inputs except the existing number fields in item rows (16 px).

## 8. Tests (TDD)
- **Quest mix:**
  - For each class at a fixed level and tier, the focus item is ×1.3 and the others are ×0.9, rounded.
  - Wayfarer and null match v1.6.0 exactly.
  - The growth cap still limits a boosted item against a reference quest.
  - `startDay` uses the player's class.
- **Cooldown:**
  - Day 29 is refused with "You can change class in 1 day(s)", and day 30 is allowed.
  - A first choice is allowed straight away after the Trial, and refused before the Trial.
  - `classChosenAt` is updated.
- **Side-quest bonus:** an Ironclad Strength side quest of 20 XP gives 22 XP; an Agility one gives 20 XP; no class gives 20 XP.
- **Trial:**
  - It isn't available below level 10.
  - Reaching level 10 creates it, with targets at 1.5×.
  - Partial progress persists.
  - Finishing it gives XP, Boss damage, `trialDone` and a `classChoice` event exactly once.
- **Data safety:**
  - A v3 (v1.6.0) database opens as v4 with everything kept and the new defaults.
  - A v3 backup imports.
  - Export → import → export is identical with a class chosen and a Trial in progress.
  - An invalid `classId` is rejected.
- **UI:**
  - The Status card shows the class icon and name.
  - The Class screen covers all four states.
  - Become respects the cooldown.
  - The Trial card logs progress.
  - The `classChoice` event offers Become and Later.
- **e2e (WebKit):** a level-10 player (seeded through backup restore) finishes the Trial on the Quests screen, picks Ironclad, and sees it on Status.

## 9. Release
- `package.json` becomes 1.7.0, with a changelog entry, for example: "New: Class Change! At level 10, take the Trial and become Ironclad, Galestrider, Bulwark or Wayfarer. Your class shapes your daily quest and boosts one stat. You can switch every 30 days."
- `docs/credits.md` gains the class names and icons as original work.
- No new packages.
