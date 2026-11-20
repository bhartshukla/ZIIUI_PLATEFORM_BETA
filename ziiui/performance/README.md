# ZiiUI — Performance Profiling (Phase 5A)

Reusable profiling infrastructure for the ZiiUI performance phase. All
scripts launch real Chromium (via Playwright, already a dev dependency) and
collect metrics straight from the browser through the Chrome DevTools
Protocol and in-page PerformanceObserver instrumentation. No metrics are
fabricated.

## Tooling discovered in this environment

- Node v22.12.0, npm 10.9.0
- Playwright 1.65.1 with Chromium 1255 installed locally
- Google Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`
- vitest 3.2.7, eslint 9 (both clean on `main`)
- **Not installed:** Lighthouse (no lab-report generator available offline;
  installing it would be a new dev dependency — see `lighthouse` note below)
- Chrome DevTools Protocol: available via `browserContext.newCDPSession()`

## Files

| File | Purpose |
|------|---------|
| `capture.mjs` | Shared helpers: CDP metrics, navigation/resource timing, vitals observer, JSON output |
| `profile-load.mjs` | Page-load metrics for index, ai, context, docs |
| `profile-library.mjs` | Library interactions: first paint, component select, rapid switching, destroy/recreate |
| `profile-preview.mjs` | Preview create/destroy cycles + console/page error regression signal |
| `profile-memory.mjs` | JS heap + DOM node samples across repeated select/destroy cycles |
| `profile-ai-editor.mjs` | ai.html load + UI-only interactions (no AI network calls) |
| `profile-mobile.mjs` | Six viewports: overflow, sidebar, select/preview, errors |
| `baseline/` | Before-optimization snapshots (run `npm run preview` first) |
| `final/` | After-optimization snapshots (same commands with `--final`) |

## How to run

1. Build the production bundle: `cd ziiui && npm run build`
2. Start the preview server: `npm run preview` (serves on port 5174 by default; the scripts target `http://localhost:5174`)
3. In another terminal, run the before snapshots:

```
node performance/profile-load.mjs
node performance/profile-library.mjs
node performance/profile-preview.mjs
node performance/profile-memory.mjs
node performance/profile-ai-editor.mjs
node performance/profile-mobile.mjs
```

4. Implement optimizations, rebuild, restart preview, then re-run with `--final`:

```
node performance/profile-load.mjs --final
...
```

Output lands in `performance/baseline/` or `performance/final/` as JSON.

## Lighthouse

Lighthouse is not installed and was not added as a dependency (no unnecessary
dependencies). Lab scores (Performance/Accessibility/Best Practices/SEO) can be
collected externally with:

```
npm install --save-dev lighthouse
npx lighthouse http://localhost:5174 --preset=desktop --output=json --output-path=performance/baseline/lighthouse-index-desktop.json
npx lighthouse http://localhost:5174 --preset=mobile --output=json --output-path=performance/baseline/lighthouse-index-mobile.json
```

Those commands must run against a served production build with real Chrome.
Results are environment-dependent and are reported as lab metrics, never as
field metrics.

## What is intentionally NOT measured here

- Field (RUM) Core Web Vitals — requires real-user deployment.
- AI generation latency — requires an API key / network; covered by unit
  tests with controlled promises instead (tests/ai.test.js, new AI race tests).
- GPU/FPS for WebGL shaders — headless Chromium software rendering is not
  representative; WebGL disposal is verified by code review + unit tests.
