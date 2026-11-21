import { test, expect } from '@playwright/test';

test.describe('preview lifecycle', () => {
  test('destroy and recreate preview without errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    const card = page.locator('.component-card').first();
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.click();
    await expect(page.locator('#frame')).toBeVisible({ timeout: 15000 });

    // Return to discovery (destroys the preview).
    const back = page.locator('#backToComponents');
    if ((await back.count()) > 0) {
      await back.click();
      await expect(page.locator('#catalogSection')).toBeVisible({ timeout: 15000 });
    }

    // Recreate the preview.
    await page.locator('.component-card').first().click();
    await expect(page.locator('#frame')).toBeVisible({ timeout: 15000 });
    expect(errors).toEqual([]);
  });

  test('rapid component switching keeps latest preview and no errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
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
});
