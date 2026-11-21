// Phase 5A / 5F — AI Editor profiling (network-independent UI behaviour).
//
// Usage:
//   npm run preview
//   node performance/profile-ai-editor.mjs [--final]
//
// ai.html loads without an API key in this environment, so AI generation is
// not exercised. We measure page load, component picker state, preview
// rendering and console errors (regression signal only).

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

  const t0 = process.hrtime.bigint();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  const loadMs = Math.round(Number(process.hrtime.bigint() - t0) / 1_000_000 * 10) / 10;
  results.loadMs = loadMs;
  process.stdout.write(`  ai-page-load: ${loadMs} ms\n`);

  await page.waitForTimeout(1000);

  const select = page.locator('#aiComponentSelect');
  results.selectExists = (await select.count()) > 0;
  results.selectHidden = await select.getAttribute('hidden') !== null;
  if (results.selectExists) {
    results.optionCount = await select.locator('option').count();
  }
  process.stdout.write(`  picker exists=${results.selectExists} hidden=${results.selectHidden} options=${results.optionCount || 0}\n`);

  const runBtn = page.locator('#aiRun');
  results.runBtnExists = (await runBtn.count()) > 0;
  if (results.runBtnExists) {
    const t1 = process.hrtime.bigint();
    await runBtn.click();
    await page.waitForTimeout(300);
    results.runPreviewClickMs = Math.round(Number(process.hrtime.bigint() - t1) / 1_000_000 * 10) / 10;
    process.stdout.write(`  run-preview-click: ${results.runPreviewClickMs} ms\n`);
  }

  const auto = page.locator('#aiAutoPreview');
  if ((await auto.count()) > 0) {
    await auto.click();
    await page.waitForTimeout(300);
  }

  results.previewFrameExists = (await page.locator('#aiPreviewFrame').count()) > 0;
  results.previewHasContent = await page.evaluate(() => {
    const f = document.getElementById('aiPreviewFrame');
    return f ? !!(f.srcdoc && f.srcdoc.length > 50) : false;
  });

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
