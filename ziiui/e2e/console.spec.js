import { test, expect } from '@playwright/test';

test('library page has no console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
  expect(errors).toEqual([]);
});

test('mapped gallery videos load and advance in Chromium', async ({ page }) => {
  await page.goto('/');
  const videos = page.locator('#componentGrid .component-card-video');
  await expect(videos).toHaveCount(3);
  expect(await videos.evaluateAll((items) =>
    items.map((video) => video.closest('.component-card').dataset.id)
  )).toEqual(['splitsection', 'blockreveal', 'maskdrag']);

  for (let index = 0; index < await videos.count(); index++) {
    const video = videos.nth(index);
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((item) => item.readyState >= 2), { timeout: 20000 }).toBe(true);
    await video.evaluate((item) => item.play());
    const startTime = await video.evaluate((item) => item.currentTime);
    await expect.poll(() => video.evaluate((item, start) => item.currentTime > start, startTime), { timeout: 5000 }).toBe(true);
  }
});

test('component detail exposes its video or explicit pending status', async ({ page }) => {
  await page.goto('/?component=blockreveal');
  const video = page.locator('#componentMotionVideo');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('src', /assets\/videos\/blockreveal\.mp4$/);
  await expect.poll(() => video.evaluate((item) => item.readyState >= 2), { timeout: 20000 }).toBe(true);
  await expect.poll(() => video.evaluate((item) => item.currentTime > 0), { timeout: 5000 }).toBe(true);

  await page.goto('/?component=revealmenu');
  await expect(page.locator('#componentVideoPanel')).toBeVisible();
  await expect(page.locator('#componentVideoStatus')).toContainText('revealmenu.mp4');
  await expect(page.locator('#componentMotionVideo')).toBeHidden();
});

test('gallery video preview responds to desktop hover and mobile tap', async ({ browser, page }) => {
  await page.goto('/');
  const desktopCard = page.locator('#componentGrid .component-card').first();
  const desktopVideo = desktopCard.locator('.component-card-video');
  await desktopVideo.evaluate((video) => video.pause());
  await desktopCard.hover();
  await expect.poll(() => desktopVideo.evaluate((video) => !video.paused)).toBe(true);

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  try {
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('/');
    const mobileCard = mobilePage.locator('#componentGrid .component-card').first();
    const mobileVideo = mobileCard.locator('.component-card-video');
    await mobileVideo.evaluate((video) => video.pause());
    await mobileCard.locator('.component-card-art').tap();
    await expect.poll(() => mobileVideo.evaluate((video) => !video.paused)).toBe(true);
    await expect(mobilePage.locator('#componentDetail')).toBeHidden();
  } finally {
    await mobileContext.close();
  }
});
