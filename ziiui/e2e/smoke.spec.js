import { test, expect } from '@playwright/test';

test('library page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ziiui/i);
  await expect(page.locator('#componentGrid, .component-card').first()).toBeVisible({ timeout: 15000 });
});
