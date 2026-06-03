import { expect } from '@playwright/test';
import { test as authTest } from './fixtures/auth';

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:4000';

authTest.describe('Golden path — login → timer → water', () => {
  authTest('starting the timer shows elapsed time', async ({ authedPage: page }) => {
    await page.goto('/');
    const timerBtn = page.locator('[data-testid="timer-btn"]');
    await expect(timerBtn).toBeVisible({ timeout: 15_000 });

    await timerBtn.click();

    const display = page.locator('[data-testid="timer-display"]');
    // Wait for the display to show something other than the initial state
    await expect(display).not.toHaveText('00:00', { timeout: 5_000 });
  });

  authTest('watering after a completed session resets the timer', async ({ authedPage: page, userId }) => {
    // Seed a completed session so the water button is available
    await fetch(`${SERVER_URL}/test/complete-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    await page.goto('/');

    const timerBtn = page.locator('[data-testid="timer-btn"]');
    await expect(timerBtn).toBeVisible({ timeout: 15_000 });

    await timerBtn.click();

    const display = page.locator('[data-testid="timer-display"]');
    await expect(display).toHaveText('00:00', { timeout: 5_000 });
  });
});
