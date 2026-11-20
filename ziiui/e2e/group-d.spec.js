import { test, expect } from '@playwright/test';

test('Group D: AI editor initial code loads', async ({ page }) => {
  await page.goto('/ai.html?component=splitsection');
  const editor = page.locator('#aiCodeEditor');
  await expect(editor).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => (await editor.inputValue()).length, { timeout: 15000 }).toBeGreaterThan(0);
});
