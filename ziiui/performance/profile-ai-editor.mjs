// Phase 5A / 5F — AI Editor profiling (network-independent UI behaviour).
//
// Usage:
//   npm run preview
//   node performance/profile-ai-editor.mjs [--final]
//
// ai.html loads without an API key in this environment, so AI generation is
// not exercised. We measure page load, component selection in the picker,
// preview rendering and console errors (regression signal only).

import { chromium } from 'playwright';
import { writeJson, outPath } from './capture.mjs';

const PORT = 5174;
const URL = `http://localhost:${PORT}/ai.html`;
const DIR = process.argv.includes('--final') ? 'final' : 'baseline';

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), location: msg.location() }); });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push({ message: e.message }));

  const results = { url: URL, dir: DIR, collectedAt: new Date().toISOString(), samples: [] };

  const sample = (name) => async (fn) => {
    const t0 = process.hrtime.bigint();
    await fn();
    const ms = Math.round(Number(process.hrtime.bigint() - t0) / 1_000_000 * 10) / 10;
    results.samples.push({ name, ms });
    process.stdout.write(`  ${name}: ${ms} ms\n`);
  };

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);
  await (await sample('ai-page-load'))(() => page.waitForSelector('#aiComponentSelect', { state: 'visible' }));

  // Component picker: how many options render, and selection latency.
  const select = page.locator('#aiComponentSelect');
  const options = select.locator('option');
  results.optionCount = await options.count();
  process.stdout.write(`  picker options: ${results.optionCount}\n`);

  if (results.optionCount > 0) {
    await (await sample('select-first-ai-component'))(() => select.selectOption({ index: 0 }));
    await page.waitForTimeout(500);
    results.previewHasContent = await page.evaluate(() => {
      const f = document.getElementById('aiPreviewFrame');
      return f ? !!(f.contentDocument && f.contentDocument.body) : false;
    });
  }

  // Toggle auto-preview and run preview — UI-only, no AI call.
  const auto = page.locator('#aiAutoPreview');
  if ((await auto.count()) > 0) {
    await auto.click();
    await page.waitForTimeout(300);
  }
  const runBtn = page.locator('#aiRun');
  if ((await runBtn.count()) > 0) {
    await (await sample('run-preview-click'))(() => runBtn.click());
    await page.waitForTimeout(500);
  }

  results.consoleErrors = consoleErrors.slice(0, 50);
  results.pageErrors = pageErrors.slice(0, 20);
  results.consoleErrorCount = consoleErrors.length;
  results.pageErrorCount = pageErrors.length;

  writeJson(DIR, 'ai-editor-ui.json', results);

  await context.close();
  await browser.close();
  process.stdout.write(`\nWrote performance/${DIR}/ai-editor-ui.json\n`);
  process.stdout.write(`console errors: ${consoleErrors.length}, page errors: ${pageErrors.length}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
