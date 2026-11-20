// Phase 5A / 5H — mobile / responsive profiling.
//
// Usage:
//   npm run preview
//   node performance/profile-mobile.mjs [--final]
//
// Checks each viewport for: load success, horizontal overflow, sidebar
// behaviour, component selection + preview render, and console errors.
// Preview readiness detected via frame srcdoc (contentDocument is null for
// srcdoc iframes in headless Chromium).

import { chromium } from 'playwright';
import { writeJson, outPath } from './capture.mjs';

const PORT = 5174;
const DIR = process.argv.includes('--final') ? 'final' : 'baseline';

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 812 },
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'desktop-small', width: 1024, height: 768 },
  { name: 'desktop-hd', width: 1440, height: 900 },
  { name: 'desktop-fhd', width: 1920, height: 1080 }
];

async function waitForPreviewInjected(page, timeoutMs = 15000) {
  await page.waitForFunction(() => {
    const f = document.getElementById('frame');
    return !!(f && f.srcdoc && f.srcdoc.length > 50);
  }, { timeout: timeoutMs });
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const results = { dir: DIR, collectedAt: new Date().toISOString(), viewports: [] };

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1000);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    const nav = document.getElementById('sidePanel');
    const sidebarOpenInitially = nav ? nav.classList.contains('open') : false;
    const cards = page.locator('.component-card');
    const count = await cards.count();

    let selectOk = false;
    let previewOk = false;
    if (count > 0) {
      await cards.first().click();
      try {
        await waitForPreviewInjected(page);
        previewOk = true;
        selectOk = true;
      } catch (_) { /* select/preview failed on this viewport */ }
    }

    results.viewports.push({
      ...vp,
      overflow,
      sidebarOpenInitially,
      componentCount: count,
      selectAndPreview: selectOk,
      previewRendered: previewOk,
      consoleErrors: consoleErrors.slice(0, 10),
      pageErrors: pageErrors.slice(0, 10),
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length
    });
    process.stdout.write(`${vp.name} (${vp.width}x${vp.height}): overflow=${overflow} cards=${count} preview=${previewOk} errors=${consoleErrors.length}\n`);

    await context.close();
  }

  await browser.close();
  writeJson(DIR, 'mobile-viewports.json', results);
  process.stdout.write(`\nWrote performance/${DIR}/mobile-viewports.json\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
