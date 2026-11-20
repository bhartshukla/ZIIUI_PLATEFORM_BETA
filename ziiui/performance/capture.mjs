// Shared profiling helpers for ZiiUI Phase 5.
//
// Spawns Chromium via Playwright, navigates to a target URL (typically the
// production preview server), and collects measurable evidence through the
// Chrome DevTools Protocol plus in-page PerformanceObserver instrumentation.
//
// All output is JSON written to performance/<baseline|final>/ so before and
// after runs can be compared deterministically. No metrics are fabricated:
// every number comes from the browser or is explicitly labelled "n/a".

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'performance');
const OUT = (dir) => join(ROOT, dir);

/** In-page instrumentation: reports FCP, LCP, CLS, INP and long tasks. */
const VITALS_SCRIPT = `
(() => {
  const metrics = {};
  const longTasks = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        metrics.lcp = entry.renderTime || entry.loadTime || entry.startTime;
      } else if (entry.entryType === 'first-contentful-paint') {
        metrics.fcp = entry.startTime;
      } else if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
        metrics.cls = (metrics.cls || 0) + entry.value;
      } else if (entry.entryType === 'event') {
        metrics.inp = Math.max(metrics.inp || 0, entry.duration);
      }
    }
  });
  try { observer.observe({ entryTypes: ['largest-contentful-paint','first-contentful-paint','layout-shift','event'] }); } catch (_) {}
  try { new PerformanceObserver((list) => { for (const e of list.getEntries()) longTasks.push({ name: e.name, start: e.startTime, duration: e.duration }); }).observe({ entryTypes: ['longtask'] }); } catch (_) {}
  window.__ziiuiVitals = () => ({ ...metrics, longTasks });
})();
`;

export function outPath(dir, name) {
  const d = OUT(dir);
  if (!existsSync(d)) { mkdirSync(d, { recursive: true }); }
  return join(d, name);
}

export function writeJson(dir, name, data) {
  writeFileSync(outPath(dir, name), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/** Collect navigation + resource timing from the page. */
async function collectTiming(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const resources = performance.getEntriesByType('resource').map((r) => ({
      name: r.name,
      type: r.initiatorType,
      start: Math.round(r.startTime),
      end: Math.round(r.responseEnd),
      duration: Math.round(r.duration),
      encodedBodySize: r.encodedBodySize,
      transferSize: r.transferSize,
      decodedBodySize: r.decodedBodySize
    }));
    const memory = performance.memory
      ? { jsHeapUsedSize: performance.memory.usedJSHeapSize, jsHeapTotalSize: performance.memory.totalJSHeapSize, jsHeapLimit: performance.memory.jsHeapSizeLimit }
      : null;
    return { navigation: nav, resources, memory, vitals: window.__ziiuiVitals ? window.__ziiuiVitals() : null };
  });
}

/** CDP-derived process memory + performance metrics. */
async function collectCdpMetrics(client) {
  const perf = await client.send('Performance.getMetrics');
  const metrics = {};
  for (const m of perf.metrics) {
    metrics[m.name] = m.value;
  }
  let processMem = null;
  try {
    processMem = await client.send('Performance.getProcessMemory');
  } catch (_) { /* not available on all channels */ }
  return { perfMetrics: metrics, processMemory: processMem };
}

/** Run one profiling scenario. */
export async function profile({ url, label, dir, waitFor = 'networkidle', extraMillis = 1500, cdp = true }) {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();

  const client = cdp ? await context.newCDPSession(page) : null;
  if (client) {
    await client.send('Performance.enable');
    try { await client.send('Performance.start'); } catch (_) { /* baseline metric collection only */ }
    if (client.send.name) { /* noop */ }
  }

  await page.exposeFunction('__ziiui_recordVitals', (v) => {
    page.__ziiuiVitalsLast = v;
  });

  await page.addInitScript(VITALS_SCRIPT);

  const startTime = process.hrtime.bigint();
  const response = await page.goto(url, { waitUntil: waitFor, timeout: 60000 });
  const loadMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

  if (extraMillis > 0) {
    await page.waitForTimeout(extraMillis);
  }

  await page.evaluate(() => { if (window.__ziiuiVitals) { window.__ziiui_recordVitals(window.__ziiuiVitals()); } });

  const timing = await collectTiming(page);
  timing.loadMs = Math.round(loadMs);
  timing.status = response ? response.status() : null;
  timing.url = url;
  timing.label = label;

  let cdpMetrics = null;
  if (client) {
    cdpMetrics = await collectCdpMetrics(client);
  }

  // Snapshot for the record.
  const snapshot = { label, url, loadMs, timing, cdp: cdpMetrics, collectedAt: new Date().toISOString() };
  writeJson(dir, `${label.replace(/[^a-z0-9]+/gi, '-')}.json`, snapshot);

  if (client) {
    try { await client.send('Performance.stop'); } catch (_) { /* noop */ }
    await client.detach();
  }
  await context.close();
  await browser.close();
  return snapshot;
}
