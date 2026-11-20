// Phase 5A / 5C — preview lifecycle profiling.
//
// Usage:
//   npm run preview
//   node performance/profile-preview.mjs [--final]
//
// Measures create/destroy cycles of the preview iframe and reports console
// errors emitted during preview switching (regression signal for lifecycle bugs).

import { chromium } from 'playwright';
import { writeJson, outPath } from './capture.mjs';

const PORT = 5174;
const URL = `http://localhost:${PORT}/`;
const DIR = process.argv.includes('--final') ? 'final' : 'baseline';
const CYCLES = 15;

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), location: msg.location() }); });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push({ message: e.message }));

  const results = { url: URL, dir: DIR, collectedAt: new Date().toISOString(), cycles: [] };

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  const cards = page.locator('.component-card');
  const count = await cards.count();

  for (let i = 0; i < CYCLES; i++) {
    const card = cards.nth(i % count);
    const t0 = process.hrtime.bigint();
    await card.click();
    await page.waitForFunction(() => {
      const f = document.getElementById('frame');
      return f && f.contentDocument && f.contentDocument.body && f.contentDocument.body.children.length > 0;
    }, { timeout: 15000 });
    const ms = Number(process.hrtime.bigint() - t0) / 1_000_000;
    results.cycles.push({ cycle: i + 1, component: await card.getAttribute('id') || `nth-${i % count}`, ms: Math.round(ms * 10) / 10 });
    process.stdout.write(`cycle ${i + 1}/${CYCLES}: ${results.cycles[i].ms} ms\n`);
  }

  // Destroy: return to discovery.
  const t0 = process.hrtime.bigint();
  await page.click('#backToComponents');
  await page.waitForFunction(() => document.getElementById('catalogSection')?.hidden === false);
  results.destroyMs = Math.round(Number(process.hrtime.bigint() - t0) / 1_000_000 * 10) / 10;

  results.consoleErrors = consoleErrors.slice(0, 50);
  results.pageErrors = pageErrors.slice(0, 20);
  results.consoleErrorCount = consoleErrors.length;
  results.pageErrorCount = pageErrors.length;

  // Validate the frame element is cleared after returning to discovery.
  results.frameCleared = await page.evaluate(() => {
    const f = document.getElementById('frame');
    return f ? (f.srcdoc === '' || !f.srcdoc) : true;
  });

  writeJson(DIR, 'preview-lifecycle.json', results);

  await context.close();
  await browser.close();
  process.stdout.write(`\nWrote performance/${DIR}/preview-lifecycle.json\n`);
  process.stdout.write(`console errors: ${consoleErrors.length}, page errors: ${pageErrors.length}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
