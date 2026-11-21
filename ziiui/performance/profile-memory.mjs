// Phase 5A / 5E — memory profiling for ZiiUI.
//
// Usage:
//   npm run preview
//   node performance/profile-memory.mjs [--final]
//
// Uses CDP Performance.getMetrics (JSHeapUsedSize / JSHeapTotalSize) to sample
// heap size before and after repeated component switching + preview destruction.

import { chromium } from 'playwright';
import { writeJson, outPath } from './capture.mjs';

const PORT = 5174;
const URL = `http://localhost:${PORT}/`;
const DIR = process.argv.includes('--final') ? 'final' : 'baseline';

async function heapMetrics(client) {
  const { metrics } = await client.send('Performance.getMetrics');
  const out = {};
  for (const m of metrics) {
    if (/JSHeap/.test(m.name) || m.name === 'Documents' || m.name === 'Nodes' || m.name === 'Frames') {
      out[m.name] = m.value;
    }
  }
  return out;
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');

  const results = { url: URL, dir: DIR, collectedAt: new Date().toISOString(), samples: [] };

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  const snap = (name) => async () => {
    const m = await heapMetrics(client);
    results.samples.push({ name, ...m, ts: Date.now() });
    process.stdout.write(`  ${name}: JSHeapUsed=${Math.round((m.JSHeapUsedSize || 0) / 1024)} kB Nodes=${m.Nodes || 0}\n`);
  };

  await (await snap('after-load'))();

  // Repeated select + destroy cycle to detect retained growth.
  // After each selection the page shows the detail view, so we return to
  // discovery before selecting the next card. Preview readiness is detected
  // via the frame's srcdoc attribute (contentDocument is null for srcdoc
  // iframes in headless Chromium).
  async function selectCard(index) {
    const currentCards = page.locator('.component-card');
    const c = await currentCards.count();
    await currentCards.nth(index % c).click();
    await page.waitForFunction(() => {
      const f = document.getElementById('frame');
      return !!(f && f.srcdoc && f.srcdoc.length > 50);
    }, { timeout: 15000 });
    await page.waitForTimeout(300);
  }

  for (let round = 1; round <= 6; round++) {
    const count = await (await page.locator('.component-card').count()) || 0;
    for (let i = 0; i < Math.min(8, count); i++) {
      if (i > 0) {
        await page.click('#backToComponents');
        await page.waitForFunction(() => document.getElementById('catalogSection')?.hidden === false);
      }
      await selectCard(i);
    }
    await page.click('#backToComponents');
    await page.waitForFunction(() => document.getElementById('catalogSection')?.hidden === false);
    await page.waitForTimeout(500); // let pending work settle
    await (await snap(`after-round-${round}`))();
  }

  const first = results.samples[0];
  const last = results.samples[results.samples.length - 1];
  results.delta = {
    jsHeapUsedSizeKb: Math.round(((last.JSHeapUsedSize || 0) - (first.JSHeapUsedSize || 0)) / 1024),
    nodes: (last.Nodes || 0) - (first.Nodes || 0)
  };

  writeJson(DIR, 'memory-samples.json', results);

  await client.detach();
  await context.close();
  await browser.close();
  process.stdout.write(`\nWrote performance/${DIR}/memory-samples.json\n`);
  process.stdout.write(`Heap delta: ${results.delta.jsHeapUsedSizeKb} kB | Node delta: ${results.delta.nodes}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
