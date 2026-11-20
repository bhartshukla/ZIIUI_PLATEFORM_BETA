// Phase 5A / 5J — library interaction profiling.
//
// Usage:
//   npm run preview   (production build on http://localhost:5174)
//   node performance/profile-library.mjs [--final]
//
// Measures: initial paint, time to first component preview, rapid
// component-switching cycle times, and preview create/destroy timing.

import { chromium } from 'playwright';
import { writeJson, outPath } from './capture.mjs';

const PORT = 5174;
const URL = `http://localhost:${PORT}/`;
const DIR = process.argv.includes('--final') ? 'final' : 'baseline';

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
    await page.waitForSelector('#frame', { state: 'visible' });
    await page.waitForFunction(() => {
      const f = document.getElementById('frame');
      return f && f.contentDocument && f.contentDocument.body && f.contentDocument.body.children.length > 0;
    }, { timeout: 15000 });
  }))();

  // Rapid switching: select N components in sequence, measuring each switch.
  const switches = Math.min(10, count - 1);
  for (let i = 1; i <= switches; i++) {
    await (await sample(`switch-${i}`, async () => {
      await cards.nth(i).click();
      await page.waitForFunction(() => {
        const f = document.getElementById('frame');
        return f && f.contentDocument && f.contentDocument.body && f.contentDocument.body.children.length > 0;
      }, { timeout: 15000 });
    }))();
  }

  // Preview destruction: return to discovery (clears the iframe), then recreate.
  await (await sample('destroy-preview', async () => {
    await page.click('#backToComponents');
    await page.waitForFunction(() => document.getElementById('catalogSection')?.hidden === false);
  }))();
  await (await sample('recreate-preview', async () => {
    await cards.first().click();
    await page.waitForFunction(() => {
      const f = document.getElementById('frame');
      return f && f.contentDocument && f.contentDocument.body && f.contentDocument.body.children.length > 0;
    }, { timeout: 15000 });
  }))();

  const mem = await client.send('Performance.getProcessMemory').catch(() => null);
  results.memory = mem;

  // Snapshot vitals if the page instrumented them.
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
