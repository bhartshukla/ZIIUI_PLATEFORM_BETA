import { test, expect } from '@playwright/test';

test('Group B: rapid switching keeps latest preview', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const links = page.locator('.component-link');
  await links.first().waitFor({ state: 'visible', timeout: 15000 });
  await links.nth(0).click();
  await expect(page.locator('#frame')).toBeVisible({ timeout: 15000 });
  await links.nth(1).click();
  await expect(page.locator('#frame')).toBeVisible({ timeout: 15000 });
  await links.nth(2).click();
  await expect(page.locator('#frame')).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
});
