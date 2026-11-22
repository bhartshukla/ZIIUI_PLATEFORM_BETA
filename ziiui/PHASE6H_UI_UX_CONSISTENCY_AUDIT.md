ZIIUI — PHASE 6H: UI/UX CONSISTENCY AUDIT
================================================================================

1. EXECUTIVE SUMMARY
================================================================================

The ziiui library UI was audited for visual, interaction, and accessibility
consistency across all 4 pages (index.html, ai.html, context.html, docs.html)
and the component detail view. The UI uses a unified design token system
(CSS custom properties) with dark/light theme support. Overall consistency is
good, but 5 findings were identified ranging from Low to Medium severity.

Key strengths:
- Unified CSS custom property design system with dark/light themes
- Consistent skeleton loading states across sidebar and catalog
- Consistent focus-visible outline styling
- Consistent skip-to-content and ARIA live region patterns
- Consistent Remix Icon usage across navigation and controls

Findings: 1 Medium, 4 Low.

================================================================================
2. AUDIT SCOPE
================================================================================

Pages audited:
- index.html — Component library (catalog + detail view)
- ai.html — AI component editor
- context.html — Context management
- docs.html — Documentation

UI surfaces audited:
- Topbar (logo, navigation, search, theme toggle, GitHub)
- Sidebar (category navigation, component list, mobile drawer)
- Catalog (category filters, component grid, empty states, see-more)
- Detail view (preview, controls, code view, view toggle, back button)
- AI panel (side panel + modal dialog)
- AI FAB (floating action button)
- Toasts/status (say() status messages, live region)

================================================================================
3. CONSISTENCY FINDINGS
================================================================================

M1 (Medium): Two divergent button style systems

The codebase maintains two separate button styling systems with different
design tokens, border-radius, and padding:

  System A — style.css `button.b` (src/styles/style.css:1188):
    - background: var(--bg), color: var(--fg)
    - border: 1px solid var(--line), border-radius: 8px
    - padding: .55rem .75rem, font-size: .9rem
    - min-height: 40px
    - Used by: main library buttons (Replay, Copy, Back, See more, etc.)

  System B — ai-editor.css `.ai-btn` (src/styles/ai-editor.css:86):
    - background: var(--surface), color: var(--text-primary)
    - border: 1px solid var(--border-hover), border-radius: 9px
    - padding: .45rem .65rem, font-size: .8rem
    - Used by: AI panel buttons (Generate, Apply, Cancel, etc.)

The `.ai-btn.primary` variant adds a box-shadow accent but no background
color change, making primary vs secondary distinction subtle.

Impact: Buttons look slightly different between the library and AI editor
surfaces, creating a visual seam. Primary action emphasis is inconsistent.

Recommendation: Unify button variants under a single system (`.btn` base
with `.btn--primary`, `.btn--ghost`, `.btn--sm` modifiers) using shared
design tokens. Map `.ai-btn` to the unified system.

L1 (Low): Mixed icon systems — Remix Icon classes + inline SVG

Two icon systems are used side by side:

  - Remix Icon (`<i class="ri-*">`) — used throughout topbar, sidebar,
    detail view controls, AI panel actions
  - Inline SVG (`<svg>`) — used in AI FAB (`<svg class="ai-fab-icon">`),
    AI panel badges (`<svg class="ai-sparkle-svg">`), AI modal sparkle

Impact: Minor visual inconsistency; two icon sources to maintain.
Recommendation: Standardize on Remix Icon where possible, or wrap SVG icons
in consistent components.

L2 (Low): Search duplicated across topbar and sidebar

The search input appears in two places:
- Topbar: `#componentSearch` (desktop, always visible)
- Sidebar: rendered via `#searchDrawerSlot` (mobile drawer)

Both use the same placeholder ("Search components…") and `Ctrl K` hint, but
are separate DOM nodes with separate event handlers. The topbar search also
has a `search-navbar-slot` placeholder div that is empty.

Impact: Redundant code, potential for search state to diverge.
Recommendation: Consolidate into a single search component shared across
breakpoints, or ensure both instances stay in sync.

L3 (Low): Button `type` attribute inconsistency

Most buttons explicitly set `type="button"` (good practice to prevent form
submission), but some do not:

  - `<button class="b sm preview-action-btn" id="previewOpenWindow">` — no type
  - `<button class="b sm preview-action-btn" id="previewFullscreen">` — no type
  - `<button class="b" id="replay">` — no type
  - AI modal buttons — mixed (some have type, some don't)

Impact: Buttons inside forms could accidentally submit. Low risk since no
forms wrap these buttons currently, but fragile.
Recommendation: Add `type="button"` to all non-submit buttons.

L4 (Low): Primary action emphasis inconsistency

The `.ai-btn.primary` variant (AI editor) only differs from `.ai-btn` by a
box-shadow — no background or text color change. Meanwhile library primary
actions (Copy, Export HTML) use the same `button.b` style as secondary
actions (Replay, Open in new window), differing only by position.

Impact: Users may not clearly identify the primary action in a group.
Recommendation: Add a distinct `.btn--primary` variant with background color
using `--accent`, applied to the main action in each button group.

================================================================================
4. CONSISTENT PATTERNS (POSITIVE)
================================================================================

P1. Design tokens: All colors, spacing, and radii use CSS custom properties
with dark/light theme overrides. No hardcoded colors found in component CSS.

P2. Focus management: All interactive elements show `focus-visible` outline
(2px solid var(--acc), outline-offset: 1px). Skip-to-content link present.

P3. ARIA live regions: `#status` (aria-live="polite"), `aiLockBanner`
(role="status", aria-live="polite"), `aiModalStatus` (role="status").

P4. Skeleton loading: Consistent skeleton shimmer animation across sidebar
and catalog, respects `prefers-reduced-motion`.

P5. Empty states: `catalog-empty` and `gallery-empty` share the same "No
components found" message pattern with clear search button.

P6. Icon consistency (within Remix Icon): All navigation, action, and state
icons use the `ri-*` class system consistently outside the AI FAB/badge.

P7. Theme toggle: Consistent dark/light toggle with `data-theme` attribute
and `localStorage` persistence, respects `prefers-color-scheme`.

================================================================================
5. RECOMMENDATIONS SUMMARY
================================================================================

| ID | Severity | Finding | Effort |
|----|----------|---------|--------|
| M1 | Medium | Two divergent button style systems | High |
| L1 | Low | Mixed icon systems (Remix Icon + SVG) | Low |
| L2 | Low | Search duplicated in topbar and sidebar | Medium |
| L3 | Low | Missing `type="button"` on some buttons | Low |
| L4 | Low | Primary action emphasis inconsistent | Medium |

================================================================================
6. SIGN-OFF
================================================================================

Phase 6H UI/UX Consistency Audit complete. 5 findings documented
(1 Medium, 4 Low). No blocking defects. The UI is functionally consistent
with a solid design token foundation; recommended fixes are cosmetic/
refactoring-level and do not block release.
