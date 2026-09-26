# Ashborn — Update System Design (v1.2.0)

Date: 2026-09-27
Status: design approved in chat; awaiting written-spec review

## Intent
The player always gets the newest version, the app never restarts on its own, and after an update they see what changed.

## Decisions (from the owner)
- No feedback/email button.
- "Busy" means only: the set logger is open on the Training screen.
- Updates never erase progress; this update changes no stored-data shapes (no Dexie migration needed).

## 1. Update flow
- Service worker switches from auto-activate (`skipWaiting`/`clientsClaim`, `registerType: 'autoUpdate'`) to prompt mode (`registerType: 'prompt'`). A new version downloads and waits.
- Update checks: on app open, whenever the page becomes visible again, and from Settings → "Check for updates".
- When a new version is waiting, an `UpdateBanner` appears above the tab bar: System-window style, text "A new update is ready", button "Update now". Tapping activates the waiting version and reloads.
- While the set logger is open (Training), the banner is hidden; it appears when the logger closes. Nothing ever reloads without the tap.

## 2. What's New, once per version
- New meta key `lastSeenVersion` (plain key–value; no schema change).
- On launch for a registered player:
  - `lastSeenVersion` missing → baseline is `1.1.0` (every existing install predates this feature), so current players see the 1.2.0 notes once.
  - Entries newer than `lastSeenVersion` exist → show a System window (dialog) with typewriter line "System update complete: Version X", then the notes of every newer entry, and a "Close" button. Close sets `lastSeenVersion` to the current version.
- A brand-new player (registers during this session) gets no window: registration sets `lastSeenVersion` to the current version.
- The window waits while a level-up/title event is pending.
- Selection logic is a pure function `unseenEntries(changelog, lastSeenVersion)`.

## 3. Settings
- Version number and What's New history already exist.
- New "Check for updates" button with result text:
  - update waiting → "An update is ready — tap Update now."
  - none → "You have the latest version."
  - offline → "You're offline — try again later."
  - no service worker (e.g. dev) → "Updates aren't available here."

## 4. Release
- `package.json` → 1.2.0; changelog entry: "Updates now wait for you: tap Update now when you're ready, and see what changed right after."
- README update note corrected to describe the Update now banner.

## Components
- `src/platform/updates.ts`: registration wrapper + tiny external store `{ updateReady }`, `initUpdates()`, `checkForUpdates(): Promise<'available'|'none'|'offline'|'unsupported'>`, `applyUpdate()`.
- `src/ui/busy.ts`: tiny store `setBusy(reason, on)` / `useIsBusy()`; ExerciseLogger marks `'set-logger'` while mounted.
- `src/ui/overlays/UpdateBanner.tsx`, `src/ui/overlays/WhatsNewWindow.tsx`.
- `src/data/changelog.ts`: add `unseenEntries`.

## Testing
- `unseenEntries`: missing baseline, one newer, several newer, none newer.
- WhatsNewWindow: shows once, Close records version, not shown for a new player, waits for pending events.
- UpdateBanner: hidden while set logger open, shows after it closes, "Update now" calls applyUpdate.
- `checkForUpdates`: available / none / offline / unsupported with a fake registration.
- Full `npm run check` + `npm run e2e` before claiming done.
