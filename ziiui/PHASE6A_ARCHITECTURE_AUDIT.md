ZIIUI — PHASE 6A: ARCHITECTURE AND CODEBASE AUDIT
================================================================================

1. EXECUTIVE SUMMARY
================================================================================

The ZiiUI codebase is a clean, well-structured Vite multi-page frontend
application with clear module boundaries and no circular imports. The
architecture follows a logical separation of concerns:

- src/ai        — AI Editor, context engine, state, proxy client (frozen)
- src/effects   — Component registry, template builders, per-effect templates
- src/lib       — Shared utilities (preview iframe lifecycle, DOM, storage,
                  theme, clipboard)
- src/pages     — Page controllers (library, AI Editor, context, docs)
- src/styles    — Page-level CSS

No new backend, database, or unnecessary dependencies are introduced. The
existing Vite multi-page architecture is preserved.

No critical architectural defects were found. The main findings are
informational/SEO-related (missing canonical/OG/Twitter metadata on 3 of 4
pages) and a CSP `'unsafe-inline'` script-src allowance required by the
inline theme script. No code changes are mandated by this audit; all findings
are documented for downstream workstreams (6B security, 6F SEO).

================================================================================
2. ENTRY POINTS AND MULTI-PAGE ROUTING
================================================================================

Vite config (vite.config.js):
- base: './' (relative asset URLs; deployable from any sub-path)
- 4 entry points: index.html, ai.html, context.html, docs.html
- Each entry is a standalone HTML page; no client-side router

Entry pages:
- index.html  — Component library (gallery + preview)
- ai.html     — AI Editor
- context.html — AI Context Command Center
- docs.html   — Documentation

Routing: Multi-page (server/navigational). Each page is a full document load.
No client-side routing library. This is intentional and appropriate for a
static creative-effects playground. Preserved as-is.

================================================================================
3. MODULE STRUCTURE AND BOUNDARIES
================================================================================

src/ai (frozen subsystem — not refactored):
- config.js       AI config, model list, proxy/key selection
- client.js       OpenRouter fetch client with fallback cascade
- context-engine.js  Task intent, context retrieval, metrics
- prompt.js       System prompt builder, code normalization/validation
- request.js      Active-request tracking (AbortController, timeout)
- state.js        localStorage-backed AI session/version state
- chat-view.js    Chat UI rendering

src/effects:
- registry.js     EFFECTS catalogue (id, name, cat, code() factory)
- templates.js    tpl() template loader + lazy loadTemplate() with cache
- builders.js     templatePage(), textPage(), js()/css() asset tags,
                  fontPreconnect()
- videos.js       Component video asset mapping
- templates/*     Per-effect JS/CSS/HTML (text, scroll, shader, menus,
                  interactive, footer)

src/lib (shared utilities):
- preview.js      Secure iframe lifecycle (nonce, generation, sandbox,
                  cleanup ack protocol)
- storage.js      safeGet/safeSet/safeRemove/uid (never-throw localStorage)
- dom.js          $(), esc(), say(), report(), guard(), exportFile(),
                  installGlobalErrorHandlers()
- theme.js        Dark/light theme toggle with persistence
- clipboard.js    copyText() (Clipboard API + execCommand fallback)

src/pages:
- library.js      Library page controller
- library/nav.js  Sidebar navigation, category filters, card rendering,
                  video autoplay via IntersectionObserver
- library/store.js Library view state
- library/viewer.js Preview frame management, build/debounce
- library/ai-panel.js AI edit modal
- ai-editor.js    AI Editor page controller
- context.js      Context command center page
- docs.js         Documentation page

src/styles:
- style.css       Base shell CSS
- ai-editor.css   AI Editor styles
- context.css     Context center styles
- docs.css        Docs styles

Module boundaries: Clean. pages import from lib and effects; lib has no
page dependencies; effects templates are self-contained. No circular imports
detected.

================================================================================
4. DEPENDENCY USAGE
================================================================================

Dev dependencies (package.json): vite, vitest, jsdom, eslint,
eslint-config-prettier, @playwright/test. All justified; no unnecessary
packages.

Runtime dependencies loaded via CDN in effect templates (builders.js):
- GSAP + ScrollTrigger (cdnjs) — animation
- Lenis (jsdelivr) — smooth scroll
- Three.js (cdnjs) — WebGL (shader effects)
- Remixicon (jsdelivr) — icons
- Google Fonts (Inter, etc.) — typography

These are loaded per-effect inside preview iframes, not on the shell pages.
No npm runtime dependencies. No backend. No database.

================================================================================
5. COUPLING AND GLOBAL STATE
================================================================================

Global/module-level state:
- preview.js: `frames` WeakMap (per-iframe lifecycle), `urls` WeakMap
  (blob URLs). Scoped to preview lifecycle; not leaked.
- ai/state.js: AI session state in module scope, persisted to localStorage.
  Single source of truth for AI context (per architectural constraint).
- ai/client.js: `lastSuccessfulModel` module-level cache. Read-only accessor.
- lib/dom.js: `statusTimer`/`statusSeq` for the status live region. UI-only.

Coupling is loose and directional: pages -> lib/effects/ai. lib does not
import pages. No unnecessary global state.

================================================================================
6. UNUSED CODE / DEAD EXPORTS
================================================================================

Scanned for unused exports and duplicate implementations:

- lib/dom.js: `indent()` is exported; usage not found outside templates.
  It is a small pure helper; keeping it is low-risk and may be used by
  templates. Not flagged for removal.
- lib/clipboard.js: `legacyCopy()` is module-private (not exported). Used by
  `copyText()`. No dead code.
- preview.js: `injectDebugHook()` is exported and used by viewer.js,
  ai-editor.js, ai-panel.js. All three call sites inject the debug hook once
  (Phase 5 already deduped double-injection). No dead code.
- effects/templates.js: `hasLazyTemplate`, `preloadTemplates`,
  `clearTemplateCache`, `getTemplateCacheSize` are exported. `preloadTemplates`
  is not called anywhere in src/. It is part of the public template-loader
  contract; kept for API completeness. Low-risk.

No significant dead code found. No changes mandated.

================================================================================
7. ERROR PROPAGATION
================================================================================

- lib/dom.js: `report()` logs to console.error + announces via `say()` (live
  region). `guard()` wraps handlers so thrown errors are reported instead of
  breaking the page.
- lib/preview.js: Preview errors posted from iframes (ziiui:error) are
  handled by installPreviewMessageHandler(); build errors in viewer.js show
  an errorDoc in the frame.
- ai/client.js: Structured AIError with sanitized body (no key exposure).
  Errors: NOKEY, AUTH, NETWORK, ALLMODELS, TIMEOUT, plus HTTP status codes.
- netlify/functions/ai.mjs: Returns JSON errors for 405/400/413/502/401/403/
  429/non-ok upstream. Does not expose the API key.

Error propagation is consistent and user-facing messages are sanitized. No
secrets leaked in error paths.

================================================================================
8. BUILD CONFIGURATION
================================================================================

- vite.config.js: 4-page rollup input, relative base './', jsdom test
  environment, VITE_OPENROUTER_API_KEY test env set to ''.
- Output: dist/ with per-page HTML + hashed asset chunks.
- No minification concerns; Vite/Rollup handles it.
- Build is reproducible and successful (verified: 113 modules transformed).

================================================================================
9. FINDINGS AND CLASSIFICATION
================================================================================

ID  | Severity | Finding                                          | Workstream
----|----------|--------------------------------------------------|-----------
A1  | Info     | Clean module structure, no circular imports      | 6A (documented)
A2  | Info     | Multi-page Vite architecture; no client router   | 6A (documented)
A3  | Info     | AI proxy pattern; no frontend key exposure       | 6B (documented)
A4  | Info     | Preview iframe security (nonce/gen/sandbox)      | 6B (documented)
A5  | Info     | localStorage never-throw wrappers                | 6B/6G (documented)
A6  | Medium   | index.html, ai.html, context.html lack canonical | 6F SEO
      |          | URL, Open Graph, Twitter, robots meta            |
A7  | Medium   | robots.txt + sitemap.xml reference github.io URL | 6F SEO
      |          | that may not match the Netlify deployment target |
A8  | Low      | CSP script-src includes 'unsafe-inline'          | 6B Security
      |          | (required by inline theme script; acceptable)    |

================================================================================
10. CONCLUSION
================================================================================

Architecture is sound, stable, and production-appropriate. No refactoring is
mandated. All findings are informational or addressed by downstream
workstreams (6B security, 6F SEO). The AI module remains frozen and untouched.

No source code changes are required by this audit.
