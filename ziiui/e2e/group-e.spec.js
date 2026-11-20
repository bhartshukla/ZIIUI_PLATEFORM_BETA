import { test, expect } from '@playwright/test';

test('Group E: iframe sandbox attributes', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.component-link');
  await links.first().waitFor({ state: 'visible', timeout: 15000 });
  await links.nth(0).click();
  const frame = page.locator('#frame');
  await expect(frame).toBeVisible({ timeout: 15000 });
  const sandbox = await frame.getAttribute('sandbox');
  expect(sandbox).toBeTruthy();
  expect(sandbox).not.toContain('allow-same-origin');
});

test('Group E: reduced motion no console errors', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
  await context.close();
});
