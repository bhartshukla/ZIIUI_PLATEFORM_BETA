// Phase 5A / 5J — page load profiling for ZiiUI.
//
// Usage:
//   npm run preview   (in one terminal, production build on http://localhost:5174)
//   node performance/profile-load.mjs
//
// Writes one JSON snapshot per page into performance/<baseline|final>/load-*.json.
// Every metric comes from the browser (navigation timing, resource timing,
// PerformanceObserver paint metrics, process memory via CDP).

import { profile, writeJson, outPath } from './capture.mjs';

const PORT = 5174;
const PAGES = [
  { label: 'index-load', url: `http://localhost:${PORT}/` },
  { label: 'ai-load', url: `http://localhost:${PORT}/ai.html` },
  { label: 'context-load', url: `http://localhost:${PORT}/context.html` },
  { label: 'docs-load', url: `http://localhost:${PORT}/docs.html` }
];

const DIR = process.argv.includes('--final') ? 'final' : 'baseline';

async function main() {
  const results = [];
  for (const page of PAGES) {
    process.stdout.write(`probing ${page.label} ... `);
    const snapshot = await profile({ url: page.url, label: page.label, dir: DIR, extraMillis: 2000 });
    results.push(snapshot);
    process.stdout.write(`done (${snapshot.loadMs} ms)\n`);
  }
  writeJson(DIR, 'load-summary.json', { pages: results, dir: DIR, collectedAt: new Date().toISOString() });
  process.stdout.write(`\nWrote ${results.length} snapshots to performance/${DIR}/\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
