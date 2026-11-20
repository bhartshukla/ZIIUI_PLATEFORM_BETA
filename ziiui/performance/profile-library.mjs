// Phase 5A / 5J — library interaction profiling.
//
// Usage:
//   npm run preview   (production build on http://localhost:5174)
//   node performance/profile-library.mjs [--final]
//
// Measures: initial paint, time to first component preview, rapid
// component-switching cycle times, and preview create/destroy timing.
//
// Note: srcdoc iframes expose no readable contentDocument in headless
// Chromium (opaque-origin sandbox), so preview readiness is detected via
// the frame's srcdoc attribute plus the iframe load event.

import { chromium } from 'playwright';
import { writeJson, outPath } from './capture.mjs';

const PORT = 5174;
const URL = `http://localhost:${PORT}/`;
const DIR = process.argv.includes('--final') ? 'final' : 'baseline';

// Wait until the preview iframe has been populated with new HTML (srcdoc set)
// then give the iframe time to fire its load event.
async function waitForPreviewInjected(page, timeoutMs = 15000) {
  await page.waitForFunction(() => {
    const f = document.getElementById('frame');
    return !!(f && f.srcdoc && f.srcdoc.length > 50);
  }, { timeout: timeoutMs });
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');

  const results = { url: URL, dir: DIR, collectedAt: new Date().toISOString(), samples: [] };

  const sample = (name, fn) => async () => {
    const t0 = process.hrtime.bigint();
    await fn();
    const ms = Number(process.hrtime.bigint() - t0) / 1_000_000;
    results.samples.push({ name, ms: Math.round(ms * 10) / 10 });
    process.stdout.write(`  ${name}: ${results.samples[results.samples.length - 1].ms} ms\n`);
  };

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  await (await sample('initial-paint', async () => {
    await page.waitForSelector('#componentGrid', { state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('.component-card').length > 0);
  }))();

  const cards = page.locator('.component-card');
  const count = await cards.count();
  results.componentCount = count;

  // Select the first component and measure time until the preview frame loads content.
  await (await sample('select-first-component', async () => {
    await cards.first().click();
    await waitForPreviewInjected(page);
  }))();

  // Rapid switching: select N components in sequence, measuring each switch.
  // After each selection the page shows the detail view, so we return to
  // discovery before selecting the next card.
  const switches = Math.min(10, count - 1);
  for (let i = 1; i <= switches; i++) {
    await (await sample(`switch-${i}`, async () => {
      await page.click('#backToComponents');
      await page.waitForFunction(() => document.getElementById('catalogSection')?.hidden === false);
      const currentCards = page.locator('.component-card');
      await currentCards.nth(i % (await currentCards.count())).click();
      await waitForPreviewInjected(page);
    }))();
  }

  // Preview destruction: return to discovery (clears the iframe), then recreate.
  await (await sample('destroy-preview', async () => {
    await page.click('#backToComponents');
    await page.waitForFunction(() => document.getElementById('catalogSection')?.hidden === false);
  }))();
  await (await sample('recreate-preview', async () => {
    await cards.first().click();
    await waitForPreviewInjected(page);
  }))();

  const mem = await client.send('Performance.getProcessMemory').catch(() => null);
  results.memory = mem;

  results.vitals = await page.evaluate(() => window.__ziiuiVitals ? window.__ziiuiVitals() : null);

  writeJson(DIR, 'library-interaction.json', results);

  await client.detach();
  await context.close();
  await browser.close();
  process.stdout.write(`\nWrote performance/${DIR}/library-interaction.json\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
