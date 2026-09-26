import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  // Full user flows (onboarding → quests → level-up) are long in software-rendered WebKit.
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4317/Ashborn/',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iphone-webkit',
      use: { ...devices['iPhone 15'], browserName: 'webkit' },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4317/Ashborn/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
