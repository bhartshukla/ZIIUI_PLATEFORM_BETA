import { test, expect } from '@playwright/test';

test('Group C: copy code', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const links = page.locator('.component-link');
  await links.first().waitFor({ state: 'visible', timeout: 15000 });
  await links.nth(0).click();
  await page.locator('#viewTabCode').click();
  const copyBtn = page.locator('#copy');
  await expect(copyBtn).toBeVisible({ timeout: 15000 });
  await copyBtn.click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip.length).toBeGreaterThan(0);
});

test('Group C: export component', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.component-link');
  await links.first().waitFor({ state: 'visible', timeout: 15000 });
  await links.nth(0).click();
  await page.locator('#viewTabCode').click();
  const exportBtn = page.locator('#exportComponent');
  await expect(exportBtn).toBeVisible({ timeout: 15000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    exportBtn.click(),
  ]);
  expect(download.suggestedFilename()).toBeTruthy();
});
