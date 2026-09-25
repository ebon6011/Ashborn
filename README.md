# Ashborn

Ashborn turns your workouts and daily habits into a game. You get a glowing "System" status window, daily quests, levels, ranks from E to S, and stats you build in real life.

It's a free web app that you install on your iPhone from Safari. It works offline. It has no accounts, no ads and no tracking, and all your data stays on your phone.

**Live app:** https://ebon6011.github.io/ashborn/

---

## 1. Run it on your PC

You need Node.js (LTS) and Git.

```bash
npm install
npx playwright install webkit
npm run dev
```

Open the address it prints (http://localhost:5173/ashborn/).

Useful commands:

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app locally while you work on it |
| `npm test` | Runs the unit tests |
| `npm run e2e` | Runs the iPhone (WebKit) browser tests |
| `npm run check` | Type check + lint + unit tests + build, all in one |
| `npm run icons` | Remakes the app icons from `public/icon.svg` |

## 2. Publish it to GitHub Pages (one-time setup)

1. On github.com, create a new **public** repository named `ashborn` under the `ebon6011` account. Leave it empty: no README and no licence.
2. In that repository, go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. On your PC, in this folder, run:
   ```bash
   git remote add origin https://github.com/ebon6011/ashborn.git
   ```
   ```bash
   git push -u origin main
   ```
4. Open the **Actions** tab on GitHub and wait for "Deploy to GitHub Pages" to show a green tick (about 2 minutes).
5. Your app is live at https://ebon6011.github.io/ashborn/.

After that, every `git push` to `main` publishes a new version automatically.

## 3. Install it on your iPhone

1. Open **Safari** on your iPhone. It must be Safari, not another browser.
2. Go to https://ebon6011.github.io/ashborn/.
3. Tap the **Share** button (the square with an arrow pointing up).
4. Scroll down and tap **Add to Home Screen**, then **Add**.
5. Open **Ashborn** from your home screen. It opens full screen like a normal app.
6. Create your player there, in the installed app. On iPhone, Safari and the installed app keep separate data.

After the first open, the app works without internet. Updates download by themselves the next time you open it online.

## 4. Back up and restore

Your progress lives **only on your phone**. It is erased if you delete the Ashborn icon or clear Safari's website data. Back it up regularly. The app reminds you when your last backup is more than 7 days old.

**Back up:** Settings → **Export backup** → choose **Save to Files** (iCloud Drive is a good place).

**Restore:** Settings → **Import backup** → pick your `ashborn-backup-YYYY-MM-DD.json` file. The app checks the file and shows you what it contains, and nothing changes until you tap **Replace my data**.

Backups from older versions of Ashborn still import. They are upgraded automatically.

## 5. What's done and what's planned

**Done in version 1**

- Awakening (onboarding): gentle beginner and no-equipment modes, plus a health notice
- Status window: level, E–S rank, title, XP bar, and five stats with points you assign yourself
- Daily Quest: small safe penalty quests for missed days, streaks, a midnight reset in your time zone, and rest days that are never penalised
- Side quests you create yourself, and an optional Urgent Quest (at most once a day)
- Weekly workout plan and logging of sets, reps and kg, with personal records and an E–S rank per exercise based on your own progress
- Nutrition targets (Mifflin-St Jeor, with a safe minimum) and a manual food and water log
- Achievements and titles
- Level-up screen with sound; glowing system windows; typewriter messages
- Offline support, iPhone install guide, backup and restore, and storage protection
- Offline mode is covered by an automated service-worker cache test; a full offline relaunch is checked by hand on the iPhone
- Unit tests and iPhone WebKit browser tests; automatic deployment

**Known limits (iPhone web apps can't do these)**

- No Apple Health or step counting. You enter steps and workouts yourself.
- No home screen widgets.
- No reminders yet. Notifications need a small server (see phase 2).
- The iPhone silent switch also mutes app sounds.

**Planned (phase 2, after version 1 works on your phone)**

- Daily reminder notifications through web push, using a free scheduled sender (for example a Cloudflare Worker). Cost and setup will be explained first.
- Optional cloud sync between devices
- Progress charts

## Balance tweaks

Every game number (XP curve, rank levels, stat points, quest sizes, penalty and urgent quests, exercise-rank thresholds) is in [`src/config/progression.ts`](src/config/progression.ts). The nutrition formulas and their sources are in [`src/domain/nutrition.ts`](src/domain/nutrition.ts).
