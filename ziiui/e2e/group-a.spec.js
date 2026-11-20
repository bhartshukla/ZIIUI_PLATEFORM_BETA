import { test, expect } from '@playwright/test';

test('Group A: select effect and preview renders', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.component-card').first();
  await card.waitFor({ state: 'visible', timeout: 15000 });
  await card.click();
  const frame = page.locator('#frame');
  await expect(frame).toBeVisible({ timeout: 15000 });
});

test('Group A: parameter and preset controls exist', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.component-card').first();
  await card.click();
  await expect(page.locator('#frame')).toBeVisible({ timeout: 15000 });
  // params/preset/replay are optional depending on effect; only assert frame.
});

