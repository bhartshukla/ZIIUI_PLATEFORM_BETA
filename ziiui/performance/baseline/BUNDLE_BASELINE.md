# ZiiUI — Baseline Production Bundle Sizes (Before Optimization)

Captured from the original production build (`npm run build`) before any Phase 5
changes. Source: `dist/assets/` listing.

| Asset | Raw | Gzip |
|-------|-----|------|
| index-B_6xG8nM.js (main entry) | 45.73 kB | 13.91 kB |
| chat-view-BosExISh.js (AI Editor) | 211.66 kB | 49.17 kB |
| state-DLIv1C2N.js | 7.218 kB | — |
| theme-CuwMvD4f.js | 1.037 kB | — |
| storage-CDd4Igmh.js | 1.684 kB | — |
| clipboard-DfYFTYYo.js | 0.52 kB | 0.34 kB |
| **Total JS (raw / gzip)** | **~304.11 kB** | **~80.37 kB** |
| chat-view-CQPEESkM.css | 15.909 kB | — |
| **Total CSS (raw / gzip)** | **~119.65 kB** | **~24.34 kB** |

Initial resource requests (index load, from resource timing):
- https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.woff2 — 189,704 B (~3.0 s, render-blocking font)
- https://fonts.googleapis.com/css2?family=Inter — 1,114 B (~3.0 s)
- https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css — 15,925 B (~3.0 s)
- /videos/Split Scroll.mp4 — 10,086,590 B (~700 ms) — **10 MB video downloaded on initial load**
- /ziiui-logo.jpg — 17,453 B

Existing lazy-loaded resources:
- AI Editor (chat-view) is a separate Vite chunk loaded only on ai.html.
- Templates are lazy-loaded via `loadTemplate()` on demand.

Observed loading behavior (baseline, production preview):
- index load: ~9,049 ms (dominated by remote fonts + 10 MB video)
- ai.html load: ~1,270 ms
- context.html load: ~889 ms
- docs.html load: ~1,052 ms

Baseline browser verification capabilities available:
- Playwright 1.65.1 + Chromium (installed) ✓
- Google Chrome (stable) ✓
- Chrome DevTools Protocol via Playwright CDP sessions ✓
- PerformanceObserver (FCP/LCP/CLS/INP/longtask) ✓
- Navigation + Resource Timing ✓
- process.memory via CDP ✓
- Lighthouse: NOT installed (not added — no unnecessary dependencies)
