import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env.local so AUTH_SECRET and other vars are available to fixtures
dotenvConfig({ path: resolve(__dirname, '.env.local') });

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Start Next.js dev server when running locally
  webServer: process.env.CI
    ? undefined
    : {
        command: 'yarn dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
