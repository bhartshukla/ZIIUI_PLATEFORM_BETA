import { test, expect } from '@playwright/test';

test.describe('AI editor', () => {
  test('loads editor code and renders preview for a component', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/ai.html?component=splitsection');
    const editor = page.locator('#aiCodeEditor');
    await expect(editor).toBeVisible({ timeout: 15000 });
    await expect.poll(async () => (await editor.inputValue()).length, { timeout: 15000 }).toBeGreaterThan(0);

    const frame = page.locator('#aiPreviewFrame');
    if ((await frame.count()) > 0) {
      await expect(frame).toBeVisible({ timeout: 15000 });
    }

    const runBtn = page.locator('#aiRun');
    if ((await runBtn.count()) > 0) {
      await runBtn.click();
      await page.waitForTimeout(500);
    }

    expect(errors).toEqual([]);
  });
});
