import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'small-mobile', width: 320, height: 740 },
  { name: 'mobile-go', width: 360, height: 800 },
  { name: 'iphone-se', width: 375, height: 812 },
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'desktop-small', width: 1024, height: 768 },
  { name: 'desktop-hd', width: 1440, height: 900 }
];

for (const vp of VIEWPORTS) {
  test.describe(`mobile ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('loads the library without horizontal overflow or console errors', async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto('/');
      await expect(page.locator('#componentGrid, .component-card').first()).toBeVisible({ timeout: 15000 });

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(overflow).toBe(false);
      expect(errors).toEqual([]);
    });

    test('selects a component and renders the preview', async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto('/');
      const card = page.locator('.component-card').first();
      await card.waitFor({ state: 'visible', timeout: 15000 });
      await card.click();
      const frame = page.locator('#frame');
      await expect(frame).toBeVisible({ timeout: 15000 });
      expect(errors).toEqual([]);
    });
  });
}
