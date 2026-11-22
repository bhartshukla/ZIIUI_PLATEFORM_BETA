ZIIUI — PHASE 6G: ERROR HANDLING AND COMPONENT CONTENT/LINK AUDIT
================================================================================

1. EXECUTIVE SUMMARY
================================================================================

Phase 6G covered two workstreams:

(a) Error handling audit across the preview runtime (viewer.js rebuild path,
    templates.js loadTemplate) — reviewed for crash recovery, graceful
    degradation, and user-visible error reporting. No defects found.

(b) Component content and link audit across all 19 component templates —
    reviewed for missing alt attributes, dead `href="#"` links, external
    dependency exposure, and placeholder content. 48 missing alt attributes
    and 30 dead links were identified. Preview-only link blocking was
    implemented in src/lib/preview.js to prevent `href="#"` navigation inside
    preview iframes.

No runtime crashes or unhandled errors were found during the audit. All
existing error paths (build errors, template load failures, AI request
failures) are caught and reported via `report()` / `say()` UI feedback.

================================================================================
2. ERROR HANDLING AUDIT (viewer.js, templates.js)
================================================================================

2.1 viewer.js — rebuild() (src/pages/library/viewer.js:242-293)

The `rebuild()` function wraps the full build/play pipeline in try/catch.
On error:
- `store.html` is cleared
- `code-out` shows "Could not build this effect: <message>"
- Preview iframe loads `errorDoc('Build error', err.message)`
- `report(err, 'rebuild')` logs the error to the AI error channel
- `hidePreviewLoading()` is called to dismiss the loader

Build ID gating (`currentBuildId`) prevents stale rebuilds from overwriting
newer results. No defects found.

2.2 viewer.js — selectEffect() (src/pages/library/viewer.js:363-392)

Guard: `isBusy()` check blocks component selection while AI is working.
Individual operations (`placeTextField`, `updatePreviewHeight`, `hooks.afterSelect`)
are wrapped in try/catch with `report()` on failure. No defects found.

2.3 viewer.js — showMissingComponent() (src/pages/library/viewer.js:432-454)

Handles unknown component IDs gracefully: hides catalog/detail content, shows
route error panel, clears preview frame, resets store state. No defects found.

2.4 templates.js — loadTemplate (src/effects/templates.js)

Template lazy loader deduplicates in-flight requests and caches loaded
templates. Load failures propagate to the caller's error handling. No
defects found.

2.5 Error reporting pipeline (src/lib/dom.js `report()`)

All caught errors route through `report(err, context)` which sends to the AI
error channel and logs to console. User-visible feedback uses `say()`. No
defects found.

================================================================================
3. COMPONENT CONTENT AND LINK AUDIT
================================================================================

All 19 component templates were inspected:

  menus/          revealmenu.html, blockreveal.html
  footer/         footer1.html, footer2.html, folderfooter.html
  interactive/    splitsection.html, microhover.html, snakehover.html,
                  hoversection.html, imagetrail.html, maskdrag.html
  scroll/         clipreveal.html, imageflow.html, list.html, pinrotate.html,
                  scrollmask.html, scrolldown.html
  shader/         noisy.html, mirror.html

3.1 Missing alt attributes (48 total)

| Template       | Count | Details                          |
|----------------|-------|----------------------------------|
| clipreveal.html| 5     | 5 panel images with `alt=""`     |
| imageflow.html | 28    | 27 flow images + 1 cover image, `alt=""` |
| scrolldown.html| 15    | 15 card images with `alt=""`     |

All other templates either have meaningful alt text or no images.
Recommendation: Replace empty alt with descriptive text or `aria-hidden="true"`
for decorative images.

3.2 Dead `href="#"` links (30 total)

Found earlier in footer1.html, footer2.html, revealmenu.html, blockreveal.html,
splitsection.html. These are placeholder links that navigate nowhere.

Fix implemented: Preview-only link blocking in src/lib/preview.js
(createDebugHook). A click listener on the preview document intercepts all
anchor clicks and calls `preventDefault()`/`stopPropagation()` when `href` is
`"#"` or empty. The blocked link is reported to the parent window via
`ziiui:blocked:link` postMessage (logged as `[ziiui:preview] blocked dead link`).
This is preview-only — production copies of the component code are unaffected.

3.3 External dependencies (potential failure points)

External resources referenced by templates:

| Source                  | Templates                            | Risk                       |
|-------------------------|--------------------------------------|----------------------------|
| picsum.photos           | microhover, hoversection, clipreveal, imageflow, list, pinrotate, scrolldown | Image may fail/slow |
| images.unsplash.com     | snakehover, noisy, mirror            | Image may fail/slow        |
| i.pinimg.com            | folderfooter                         | Image may fail/slow        |
| videos.pexels.com       | maskdrag, scrollmask                 | Video may fail/slow        |
| assets.lummi.ai         | imagetrail                           | Image may fail/slow        |
| three.js (CDN)          | noisy, mirror                        | Script may fail/slow       |
| gsap / ScrollTrigger    | many templates                       | Script may fail/slow       |
| Lenis                   | many templates                       | Script may fail/slow       |
| SplitText               | scrolldown                           | Script may fail/slow       |
| Remix Icon              | pinrotate, scrolldown                | Font/CSS may fail/slow     |
| Google Fonts            | various                              | Font may fail/slow         |

Mitigation: All templates already check `prefers-reduced-motion` and degrade
to static state. Three.js/WebGL templates dispose renderers on cleanup.
External image failures do not break layout (img tags are intrinsic).

3.4 Placeholder / lorem content

No lorem ipsum or placeholder text found. All template copy is product-facing
(ziiui studio, creative interfaces, motion design, etc.).

================================================================================
4. CHANGES MADE
================================================================================

4.1 src/lib/preview.js — createDebugHook()

Added preview-only link blocking click listener:
- Intercepts all anchor clicks in the preview document (capture phase)
- `preventDefault()` + `stopPropagation()` for `href="#"` or `href=""`
- Reports blocked link to parent via `ziiui:blocked:link` postMessage
- Parent logs as `[ziiui:preview] blocked dead link: <href>`

4.2 src/lib/preview.js — handlePreviewMessage()

Added `ziiui:blocked:link` to the accepted message types so the parent
handler does not reject it.

4.3 src/lib/preview.js — installPreviewMessageHandler()

Added `console.warn` logging for `ziiui:blocked:link` messages.

4.4 tests/preview.test.js — new "link blocking" describe block

- Verifies link blocking script is injected into preview HTML
- Verifies `preventDefault` is present in the injected code
- Verifies normal external anchors are not broken by the injection

4.5 tests/preview-handler.test.js — new tests

- `ziiui:blocked:link` is accepted by handlePreviewMessage
- `ziiui:blocked:link` with missing href is still accepted

================================================================================
5. TEST RESULTS
================================================================================

Unit tests (vitest): 335+ tests pass (includes new link blocking tests).
Playwright E2E: 27/27 pass (mobile.spec.js, preview-lifecycle.spec.js,
ai-editor.spec.js).

No regressions introduced by link blocking or error handling changes.

================================================================================
6. RECOMMENDATIONS (LOW PRIORITY)
================================================================================

F1 (Low): Replace empty alt attributes in clipreveal.html (5), imageflow.html
(28), scrolldown.html (15) with descriptive text or aria-hidden="true".

F2 (Low): Consider replacing `href="#"` placeholder links in source templates
with `javascript:void(0)` or removing them, since preview-only blocking does
not affect copied production code.

F3 (Low): External dependency failures (picsum.photos, unsplash.com, etc.)
gracefully degrade but may leave blank image placeholders. Consider local
fallback images for production demos.

================================================================================
7. SIGN-OFF
================================================================================

Phase 6G complete. Error handling verified across preview runtime. Component
content/link audit complete across all 19 templates. Preview-only link
blocking implemented and tested. No defects found in error recovery paths.
