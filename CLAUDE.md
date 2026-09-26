# Ashborn

Offline-first iPhone PWA (Vite + React + TypeScript + Tailwind + Dexie), hosted on GitHub Pages at https://ebon6011.github.io/Ashborn/.

## Update Rules

1. Use the Superpowers workflow for every update: brainstorming first (ask me questions one at a time), then writing-plans, then test-driven-development, then verification-before-completion. Never say something works unless you ran the build and tests.
2. Never lose user data. Any change to stored data needs a versioned Dexie migration plus a test that upgrades old data and checks nothing was lost.
3. Every release bumps the app version in package.json and adds a plain-language entry to src/data/changelog.ts (short, friendly, no tech words).
4. The app stays original. No names, characters, art, or text from Solo Leveling, Arise, or any other app or series.
5. No backend, accounts, ads, or tracking unless I approve it in writing for that update.
6. iPhone Safari first: check safe areas, 16px inputs, no Vibration API, sound only after a tap, works offline.
7. Ask before installing any package. Explain why it is needed.
8. Keep all balance numbers (XP, rewards, drop rates) in the existing config file (`src/config/progression.ts`).
9. Commit after each finished task with a clear message.
