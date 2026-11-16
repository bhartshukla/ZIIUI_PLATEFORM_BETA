# ZiiUI — Complete Component Inventory & Documentation Audit

**Scope:** Read-only audit of the ZiiUI project (ZiiUI Components Library). No project files were modified.
**Files inspected:** All component templates under `ziiui/src/effects/templates/`, `ziiui/src/effects/registry.js`, `ziiui/src/effects/builders.js`, `ziiui/src/effects/templates.js`, `ziiui/docs.html` (1222 lines), `ziiui/src/pages/docs.js`, `ziiui/src/pages/library.js`, `ziiui/src/pages/library/viewer.js`, `ziiui/index.html`, `ziiui/src/ai/client.js` (partial).

---

# PART 1 — Component Library Inventory

## A. Complete Component Inventory (27 components, 7 categories)

| # | Component Name | Category | Component Type | Slug / ID | Source Location | Status |
|---|---|---|---|---|---|---|
| 1 | Split Section | Web | Scroll-driven image split & card-flip effect | `splitsection` | `templates/interactive/splitsection.{css,html,js}` | Available |
| 2 | Block Reveal | Menus | Fullscreen overlay menu with square reveal | `blockreveal` | `templates/menus/blockreveal.{css,html,js}` | Available |
| 3 | Reveal Menu | Menus | Animated hamburger menu with SVG blob | `revealmenu` | `templates/menus/revealmenu.{css,html,js}` | Available |
| 4 | Mask Drag | Interactive | Draggable video masks via Canvas | `maskdrag` | `templates/interactive/maskdrag.{css,html,js}` | Available |
| 5 | Micro Hover | Interactive | Photo burst on keyword hover/focus | `microhover` | `templates/interactive/microhover.{css,html,js}` | Available |
| 6 | Hover Section | Interactive | Follow-along thumbnail gallery | `hoversection` | `templates/interactive/hoversection.{css,html,js}` | Available |
| 7 | Snake Hover | Interactive | SVG ink-stroke reveal on hover | `snakehover` | `templates/interactive/snakehover.{css,html,js}` | Available |
| 8 | Image Trail | Interactive | Pointer-following image trail | `imagetrail` | `templates/interactive/imagetrail.{css,html,js}` | Available |
| 9 | Footer 1 | Footer | Lenis-scrolling footer reveal | `footer1` | `templates/footer/footer1.{css,html,js}` | Available |
| 10 | Footer 2 | Footer | Character-stagger footer with link tilt | `footer2` | `templates/footer/footer2.{css,html,js}` | Available |
| 11 | Folder Footer | Footer | Photo folders with tilt-on-hover | `folderfooter` | `templates/footer/folderfooter.{css,html,js}` | Available |
| 12 | Effect (fade/blur/etc.) | Text | Staggered character reveal with presets | `effect` | `templates/text/effect.{css,js}` (+ build/split/tail) | Available |
| 13 | Fancy | Text | Random color/transform character pop-in | `fancy` | `templates/text/fancy.{css,js}` | Available |
| 14 | Roll | Text | Dual-character roll animation | `roll` | `templates/text/roll.{css,js}` | Available |
| 15 | Roll 2 | Text | Dual-character roll animation (variant) | `roll2` | `templates/text/roll.{css,js}` | Available |
| 16 | Scramble | Text | Character scrambling reveal | `scramble` | `templates/text/scramble.{css,js}` | Available |
| 17 | Shimmer | Text | Monochrome shimmer glow animation | `shimmer` | `templates/text/shimmer.css` | Available |
| 18 | Wave | Text | 3D wave translateZ/rotateY animation | `wave` | `templates/text/wave.{css,js}` | Available |
| 19 | Wave 2 | Text | 3D wave translateZ/rotateY animation (variant) | `wave2` | `templates/text/wave.{css,js}` | Available |
| 20 | List Reveal | Scroll | Scroll-synced list with image preview | `listreveal` | `templates/scroll/list.{css,html,js}` | Available |
| 21 | Scroll Down | Scroll | 3D card stand-up on scroll | `scrolldown` | `templates/scroll/scrolldown.{css,html,js}` | Available |
| 22 | Scroll Mask | Scroll | Scale-up masked title over video | `scrollmask` | `templates/scroll/scrollmask.{css,html,js}` | Available |
| 23 | Pin Rotate | Scroll | Pin & rotate cards on scroll | `pinrotate` | `templates/scroll/pinrotate.{css,html,js}` | Available |
| 24 | Image Flow | Scroll | 3D image flow field on scroll | `imageflow` | `templates/scroll/imageflow.{css,html,js}` | Available |
| 25 | Clip Reveal | Scroll | Clip-path panel scroll reveal | `clipreveal` | `templates/scroll/clipreveal.{css,html,js}` | Available |
| 26 | Noisy Pixel | Shader | WebGL/Three.js noisy pixel shader reveal | `noisypixel` | `templates/shader/noisy.{css,html,js}` | Available |
| 27 | Mirror | Shader | Three.js dissolve mirror shader | `mirror` | `templates/shader/mirror.{css,html,js}` | Available |

**Total: 27 components across 7 categories.**

All components are "Available" (no incomplete/experimental status found in source). The registry marks all as active; no disabled/incomplete flags exist.

## B. Detailed Component Reference

### Shared infrastructure (all components)
- **Build system:** `builders.js` (`textPage`, `fullPage`, `templatePage`) wraps CSS/HTML/JS into a standalone HTML document.
- **Text-effect shared templates:** `base.css`, `build.js` (grapheme splitting), `effect.css` (stagger presets), `graphemes.js` (Intl.Segmenter), `roll.css/js`, `scramble.css/js`, `shimmer.css`, `wave.css/js`, `wcss.css`, `wrap.js`, `split-{char,word,line}.js`, `tail.js`.
- **External libraries used (per-project, not per-component):** GSAP (scroll-driven animations), Lenis (smooth scroll), ScrollTrigger (GSAP plugin), Three.js (shaders), SplitText (GSAP plugin, scrolldown), Google Fonts (various), RI icons (`ri-*` classes referenced in HTML but the icon font stylesheet is NOT imported in templates — icons may not render).
- **Text components all respect `prefers-reduced-motion`** via `wrap.js` guard.

---

### 1. Split Section (Web)
- **Purpose:** Scroll-driven experience where an image appears to split into gaps and cards flip to reveal content on the back.
- **What it does:** As user scrolls, the stage scales down, a gap opens between three image cards (using `clip-path` + flex `gap`), and each card flips (rotateY 180°) to show back content.
- **Use cases:** Hero scroll experiences, portfolio reveals, storytelling sections.
- **Implemented features/effects:** Lenis smooth scroll, ScrollTrigger scrub timeline, flex-gap split, clip-path masking, 3D card flip, hero parallax, resize handling.
- **Interactions:** Scroll only (no click/hover).
- **Customization options:** None exposed as controls — hardcoded values (`GAP_TARGET = 6`, `FLIP_START = 0.62`, image URLs, card text).
- **Generated code:** Full standalone HTML via `templatePage('splitsection')`.
- **Libraries:** GSAP, ScrollTrigger, Lenis, Google Fonts (Bebas Neue, DM Sans).
- **Source files:** `templates/interactive/splitsection.{css,html,js}`
- **Limitations:** Requires scroll; no user-configurable controls; images hardcoded from Unsplash.
- **Documentation status:** Documented on Docs page under "Web" section (see Part 2).

### 2. Block Reveal (Menus)
- **Purpose:** Fullscreen navigation menu with an animated square-tile reveal when the hamburger opens.
- **What it does:** Clicking the menu button spawns a grid of 100px squares that fade in/out with random stagger, then the menu overlay slides in.
- **Use cases:** Creative agency navigation, portfolio menus.
- **Implemented features/effects:** GSAP square grid reveal (fade in/out, random stagger), menu slide-in, hamburger toggle, responsive mobile menu.
- **Interactions:** Click (hamburger).
- **Customization options:** None — hardcoded colors (#fd5530, #242424), square size 100px, link text.
- **Generated code:** Full standalone HTML via `templatePage('blockreveal')`.
- **Libraries:** GSAP, Google Fonts (RMNeue, Space Mono, Gridular — custom fonts, may not load).
- **Source files:** `templates/menus/blockreveal.{css,html,js}`
- **Limitations:** Menu toggle only (no close button visible); font dependencies may fail.
- **Documentation status:** Documented on Docs page under "Menus" section.

### 3. Reveal Menu (Menus)
- **Purpose:** Animated hamburger menu with SVG blob morphing background and staggered menu items.
- **What it does:** Hamburger click morphs an SVG path (blob), slides the menu up, and reveals left/right column menu items with staggered entrance.
- **Use cases:** Creative portfolio navigation, brand sites.
- **Implemented features/effects:** SVG path morph (GSAP attr animation), border-radius morph on hamburger, staggered item reveal, keyboard (Enter/Space) activation.
- **Interactions:** Click, keyboard (Enter/Space on hamburger).
- **Customization options:** None — hardcoded paths, colors, item labels.
- **Generated code:** Full standalone HTML via `templatePage('revealmenu')`.
- **Libraries:** GSAP, Custom SVG fonts ("Custom Font", "Bebas Neue", "Instrument Serif" — may not load).
- **Source files:** `templates/menus/revealmenu.{css,html,js}`
- **Limitations:** Font dependencies may fail; paths hardcoded.
- **Documentation status:** Documented on Docs page under "Menus" section.

### 4. Mask Drag (Interactive)
- **Purpose:** Draggable canvas masks over a background video; user drags "windows" to reveal video underneath.
- **What it does:** Six masked canvas boxes overlay a video; user can grab and drag each box. Coordinates shown. Global HUD follows cursor.
- **Use cases:** Creative portfolio, video reveal interactions.
- **Implemented features/effects:** Canvas 2D clipping (drawImage with rect transform), draggable boxes (mousedown/mousemove/mouseup), requestAnimationFrame draw loop, video playback detection.
- **Interactions:** Drag (mouse), hover (mask shows "GRAB"), cursor tracking HUD.
- **Customization options:** None — hardcoded video URL (Pexels), box positions/sizes.
- **Generated code:** Full standalone HTML via `templatePage('maskdrag')`.
- **Libraries:** None external (no GSAP/Three.js in this template).
- **Source files:** `templates/interactive/maskdrag.{css,html,js}`
- **Limitations:** Mouse-only (no touch), external video dependency, canvas-based (no CSS fallback).
- **Documentation status:** Documented on Docs page under "Interactive" section (listed as "Draggable Mask" — name mismatch: docs say "Draggable Mask", component is "Mask Drag").

### 5. Micro Hover (Interactive)
- **Purpose:** Photo burst/scatter effect triggered when hovering or focusing on keywords.
- **What it does:** Hovering a keyword triggers a GSAP burst timeline — photos scatter, rotate, then fly back up and exit.
- **Use cases:** About pages, highlight text interactions.
- **Implemented features/effects:** GSAP burst timeline, clipPath reveal/exit, random positioning/rotation, focus and mouseenter triggers.
- **Interactions:** Mouseenter, focus (keyboard), mouseleave (reset).
- **Customization options:** None — hardcoded picsum.photos image URLs, keyword text.
- **Generated code:** Full standalone HTML via `templatePage('microhover')`.
- **Libraries:** GSAP.
- **Source files:** `templates/interactive/microhover.{css,html,js}`
- **Limitations:** Image URLs external; keyboard only on keyword elements (tabindex=0).
- **Documentation status:** Documented on Docs page under "Interactive" section (listed as "Micro Hover").

### 6. Hover Section (Interactive)
- **Purpose:** Follow-along thumbnail gallery — hovering project rows shows a corresponding thumbnail.
- **What it does:** Thumbnail follows cursor; on project hover, scale up and slide thumbnails to show the matched image.
- **Use cases:** Portfolio project lists, case study galleries.
- **Implemented features/effects:** GSAP quickTo follow, scale toggle, staggered slide, cursor follow.
- **Interactions:** Mousemove (follow), mouseenter (scale + slide), mouseleave (scale down).
- **Customization options:** None — hardcoded project text, picsum image URLs.
- **Generated code:** Full standalone HTML via `templatePage('hoversection')`.
- **Libraries:** GSAP, Google Fonts (Raleway).
- **Source files:** `templates/interactive/hoversection.{css,html,js}`
- **Limitations:** Mouse-only; external images.
- **Documentation status:** Documented on Docs page under "Interactive" section (listed as "Hover Section").

### 7. Snake Hover (Interactive)
- **Purpose:** Gallery tiles with SVG ink-stroke reveal animation on hover.
- **What it does:** Hovering a tile draws two SVG stroke paths (snake-like reveal) and fades in a label.
- **Use cases:** Portfolio galleries, product tiles.
- **Implemented features/effects:** SVG stroke-dasharray draw, label fade, per-tile color schemes, mobile responsive grid.
- **Interactions:** Mouseenter (draw + reveal), mouseleave (reset).
- **Customization options:** None — hardcoded SVG paths, images, colors, labels.
- **Generated code:** Full standalone HTML via `templatePage('snakehover')`.
- **Libraries:** GSAP.
- **Source files:** `templates/interactive/snakehover.{css,html,js}`
- **Limitations:** Mouse-only; 6 fixed tiles only.
- **Documentation status:** Documented on Docs page under "Interactive" section (listed as "Snake Hover").

### 8. Image Trail (Interactive)
- **Purpose:** Pointer-following image trail — images spawn and fade as user moves/clicks.
- **What it does:** On pointermove/pointerdown, an image spawns at cursor with scale/rotation animation, fades out, shrinks.
- **Use cases:** Creative cursors, interactive backgrounds.
- **Implemented features/effects:** GSAP timeline spawn/fade/shrink, pointer distance throttling (SPAWN_DISTANCE=160), z-index stacking.
- **Interactions:** Pointermove, pointerdown.
- **Customization options:** None — hardcoded Lummi.ai image URLs (10 images).
- **Generated code:** Full standalone HTML via `templatePage('imagetrail')`.
- **Libraries:** GSAP.
- **Source files:** `templates/interactive/imagetrail.{css,html,js}`
- **Limitations:** External image URLs; cursor: crosshair, user-select none, touch-action none (may interfere with page scroll).
- **Documentation status:** Documented on Docs page under "Interactive" section (listed as "Image Trail").

### 9. Footer 1 (Footer)
- **Purpose:** Footer that elegantly unfolds on scroll using Lenis smooth scroll.
- **What it does:** Page scrolls with Lenis; footer fixed at bottom with scrolling message area above.
- **Use cases:** Landing page footers, studio sites.
- **Implemented features/effects:** Lenis smooth scroll, footer layout, social links, hover states.
- **Interactions:** Scroll (Lenis), hover (social links, footer links).
- **Customization options:** None — hardcoded text, links (# placeholders).
- **Generated code:** Full standalone HTML via `templatePage('footer1')`.
- **Libraries:** Lenis, Google Fonts (Oi, Raleway).
- **Source files:** `templates/footer/footer1.{css,html,js}`
- **Limitations:** Lenis required; links are # placeholders.
- **Documentation status:** Documented on Docs page under "Footer" section.

### 10. Footer 2 (Footer)
- **Purpose:** Footer with character-stagger entrance and link tilt-on-mouse-move.
- **What it does:** On scroll into view, characters stagger in; links tilt follow mouse; links have underline reveal.
- **Use cases:** Agency footers, contact sections.
- **Implemented features/effects:** ScrollTrigger entrance, character split/stagger, link tilt (mousemove), elastic reset, underline hover.
- **Interactions:** Scroll (entrance), mousemove (link tilt), mouseleave (reset), hover (underline).
- **Customization options:** None — hardcoded links, text, colors (CSS variables).
- **Generated code:** Full standalone HTML via `templatePage('footer2')`.
- **Libraries:** GSAP, ScrollTrigger, Inter font (may not load).
- **Source files:** `templates/footer/footer2.{css,html,js}`
- **Limitations:** Link tilt disabled on touch (`ontouchstart` check).
- **Documentation status:** Documented on Docs page under "Footer" section.

### 11. Folder Footer (Footer)
- **Purpose:** Photo-folder style footer; hovering a folder tilts photos and unmutes others.
- **What it does:** Five folders arranged in layers; pointerenter tilts photos outward, mutes other folders; pointerleave resets.
- **Use cases:** Creative portfolios, design studio footers.
- **Implemented features/effects:** GSAP tilt/y animation, mute/unmute states, pointerenter/leave, layered layout.
- **Interactions:** Pointerenter (open + mute others), pointerleave (close + unmute).
- **Customization options:** None — hardcoded panel colors, photo URLs (Pinterest), labels.
- **Generated code:** Full standalone HTML via `templatePage('folderfooter')`.
- **Libraries:** GSAP.
- **Source files:** `templates/footer/folderfooter.{css,html,js}`
- **Limitations:** External photo URLs; no keyboard fallback (pointer events only).
- **Documentation status:** Documented on Docs page under "Footer" section.

### 12. Effect (Text)
- **Purpose:** Staggered character reveal with preset animations (fade, blur, fade-in-blur, scale, slide).
- **What it does:** Splits text into characters/words/lines and reveals with a chosen preset and stagger delay.
- **Use cases:** Headlines, hero text, animated titles.
- **Implemented features/effects:** Grapheme splitting (Intl.Segmenter), 5 presets (fade, blur, fade-in-blur, scale, slide), split by char/word/line, transition-delay stagger, reduced-motion guard.
- **Interactions:** None (auto on load).
- **Customization options:** Split mode (char/word/line), preset (fade/blur/fade-in-blur/scale/slide), text content.
- **Generated code:** Via `splitEffectPage(per, preset)` in builders.js — CSS + JS (build + split + tail).
- **Libraries:** None external (vanilla JS + CSS).
- **Source files:** `templates/text/effect.css`, `build.js`, `split-*.js`, `tail.js`, `wcss.css`, `base.css`, `wrap.js`.
- **Limitations:** No UI controls exposed in generated code (controls exist in library app only); long text not recommended.
- **Documentation status:** Partially documented — mentioned in docs under "Text Effects" but no dedicated section for "Effect" preset component.

### 13. Fancy (Text)
- **Purpose:** Random color and transform pop-in animation for text parts.
- **What it does:** Splits text by words, each word animates from random opacity/color/transform to final state.
- **Use cases:** Playful headlines, creative titles.
- **Implemented features/effects:** Word splitting, Web Animations API `animate()`, random color/transform, cubic-bezier easing, fill: both.
- **Interactions:** None (auto on load).
- **Customization options:** Text content only.
- **Generated code:** Via `textPage(css, js)` with fancy.css + fancy.js.
- **Libraries:** None external.
- **Source files:** `templates/text/fancy.{css,js}`, `base.css`, `wrap.js`.
- **Limitations:** No preset/split controls; random colors may reduce readability.
- **Documentation status:** Partially documented (grouped under generic "Text Effects").

### 14. Roll (Text)
- **Purpose:** Dual-character roll animation — each character rolls from above/below into place.
- **What it does:** Builds each character as two stacked `<i>` elements that roll into view on staggered delay.
- **Use cases:** Headlines, animated titles.
- **Implemented features/effects:** Grapheme splitting, dual-char roll (translateY from/to), stagger delay, CSS transition.
- **Interactions:** None (auto on load).
- **Customization options:** Duration, ease, from/to values (hardcoded in rollPage call).
- **Generated code:** Via `rollPage(o)` — roll.css + roll.js + build.js.
- **Libraries:** None external.
- **Source files:** `templates/text/roll.{css,js}`, `build.js`, `wcss.css`, `base.css`, `wrap.js`.
- **Limitations:** Two variants (roll/roll2) use identical template with different hardcoded params.
- **Documentation status:** Not individually documented (grouped under "Text Effects").

### 15. Roll 2 (Text)
- **Purpose:** Same as Roll — dual-character roll animation variant.
- **What it does:** Identical implementation to Roll with different hardcoded duration/ease/from/to parameters.
- **Use cases:** Same as Roll.
- **Implemented features/effects:** Same as Roll.
- **Interactions:** None.
- **Customization options:** None exposed.
- **Generated code:** Via `rollPage(o)` with variant params.
- **Libraries:** None external.
- **Source files:** `templates/text/roll.{css,js}` (shared with Roll).
- **Limitations:** Duplicate of Roll with different params; not separately documented.
- **Documentation status:** Not individually documented.

### 16. Scramble (Text)
- **Purpose:** Character scrambling reveal — text cycles through random glyphs before settling.
- **What it does:** Interval-based scramble replaces non-space chars with random glyphs, progressively revealing the real text.
- **Use cases:** Tech headlines, hacker-style reveals, loading text.
- **Implemented features/effects:** Interval scrambling, grapheme handling, pagehide cleanup, final text restore.
- **Interactions:** None (auto on load).
- **Customization options:** Text content only.
- **Generated code:** Via `scramblePage()` — scramble.css + graphemes.js + scramble.js.
- **Libraries:** None external.
- **Source files:** `templates/text/scramble.{css,js}`, `graphemes.js`, `base.css`, `wrap.js`.
- **Limitations:** Monospace font; uppercase transform; no speed control exposed.
- **Documentation status:** Not individually documented.

### 17. Shimmer (Text)
- **Purpose:** Monochrome shimmer glow animation on text.
- **What it does:** CSS keyframe animation alternates color and text-shadow for a shimmer effect.
- **Use cases:** Subtle text highlights, accent text.
- **Implemented features/effects:** CSS `@keyframes shimmer`, `prefers-reduced-motion` override, infinite alternate animation.
- **Interactions:** None.
- **Customization options:** None (CSS-only, hardcoded colors/timing).
- **Generated code:** Via `textPage(shimmer.css, null)` — CSS only, no JS.
- **Libraries:** None external.
- **Source files:** `templates/text/shimmer.css`, `base.css`, `wrap.js`.
- **Limitations:** CSS-only animation; no JS control; reduced-motion disables entirely.
- **Documentation status:** Not individually documented.

### 18. Wave (Text)
- **Purpose:** 3D wave animation — characters translateZ/scale/rotateY in sequence.
- **What it does:** Each character span runs a Web Animations `animate()` with translateZ/scale/rotateY keyframes, staggered across characters.
- **Use cases:** 3D text effects, hero headlines.
- **Implemented features/effects:** Web Animations API, perspective, 3D transforms, infinite loop, stagger delay, base/gradient colors.
- **Interactions:** None.
- **Customization options:** Base color, gradient color, Z depth, scale, rotation (hardcoded in wavePage call).
- **Generated code:** Via `wavePage(o)` — wave.css + wave.js + build.js.
- **Libraries:** None external.
- **Source files:** `templates/text/wave.{css,js}`, `build.js`, `wcss.css`, `base.css`, `wrap.js`.
- **Limitations:** Two variants (wave/wave2) identical template; `s.animate` guard for older browsers.
- **Documentation status:** Not individually documented.

### 19. Wave 2 (Text)
- **Purpose:** Same as Wave — 3D wave animation variant.
- **What it does:** Identical implementation to Wave with different hardcoded params.
- **Use cases:** Same as Wave.
- **Implemented features/effects:** Same as Wave.
- **Interactions:** None.
- **Customization options:** None exposed.
- **Generated code:** Via `wavePage(o)` with variant params.
- **Libraries:** None external.
- **Source files:** `templates/text/wave.{css,js}` (shared with Wave).
- **Limitations:** Duplicate of Wave.
- **Documentation status:** Not individually documented.

### 20. List Reveal (Scroll)
- **Purpose:** Scroll-synced list where each item activates and updates a side image preview.
- **What it does:** Pin the list on scroll; as you scroll, each list item activates (heading slides + index highlights) and the preview image swaps.
- **Use cases:** Feature lists, portfolio item browsers.
- **Implemented features/effects:** Lenis smooth scroll, ScrollTrigger pin+scrub, active item styling, image swap, mobile adjustments.
- **Interactions:** Scroll.
- **Customization options:** None — hardcoded items (10), picsum image URLs.
- **Generated code:** Via `templatePage('list')`.
- **Libraries:** GSAP, ScrollTrigger, Lenis, Google Fonts (Instrument Serif).
- **Source files:** `templates/scroll/list.{css,html,js}`
- **Limitations:** External images; fixed 10 items.
- **Documentation status:** Documented on Docs page under "Scroll" section (listed as "List Reveal").

### 21. Scroll Down (Scroll)
- **Purpose:** 3D card stand-up effect — cards rotate from tilted position to flat as sections scroll into view.
- **What it does:** Each "stand" section has cards that rotateX/Y and translate up to flat position; heading words change color on scroll.
- **Use cases:** Portfolio showcases, work sections.
- **Implemented features/effects:** Lenis smooth scroll, ScrollTrigger scrub, 3D card rotation, SplitText word color stagger, perspective transforms.
- **Interactions:** Scroll.
- **Customization options:** None — hardcoded sections (3), cards (5 each), images.
- **Generated code:** Via `templatePage('scrolldown')`.
- **Libraries:** GSAP, ScrollTrigger, Lenis, SplitText (GSAP plugin), Google Fonts (Outfit).
- **Source files:** `templates/scroll/scrolldown.{css,html,js}`
- **Limitations:** SplitText is a paid GSAP plugin (may not work without license); external images.
- **Documentation status:** Documented on Docs page under "Scroll" section (listed as "Scroll Down").

### 22. Scroll Mask (Scroll)
- **Purpose:** Masked title that scales up over a background video on scroll.
- **What it does:** Video background; heading "ziiui" scales from normal to 100x as you scroll (pin + scrub).
- **Use cases:** Hero masks, title reveals.
- **Implemented features/effects:** GSAP scale animation, ScrollTrigger pin+scrub, mix-blend-mode screen, video background.
- **Interactions:** Scroll.
- **Customization options:** None — hardcoded video URL, text "ziiui".
- **Generated code:** Via `templatePage('scrollmask')`.
- **Libraries:** GSAP, ScrollTrigger.
- **Source files:** `templates/scroll/scrollmask.{css,html,js}`
- **Limitations:** External video dependency; single text; no user text input.
- **Documentation status:** Documented on Docs page under "Scroll" section (listed as "Scroll Mask").

### 23. Pin Rotate (Scroll)
- **Purpose:** Pin & rotate cards on scroll — each section pins and its content rotates/scales into view.
- **What it does:** Each pin-card pins on scroll; overlay fades in, content rotates 12°→0°, scales 0.85→1, number fades/slides.
- **Use cases:** Step-by-step scroll stories, feature walkthroughs.
- **Implemented features/effects:** Lenis smooth scroll, ScrollTrigger pin+scrub, card rotate/scale/opacity, overlay fade, backdrop-filter blur.
- **Interactions:** Scroll.
- **Customization options:** None — hardcoded 5 cards, images, text.
- **Generated code:** Via `templatePage('pinrotate')`.
- **Libraries:** GSAP, ScrollTrigger, Lenis, Google Fonts (Outfit), RI icons.
- **Source files:** `templates/scroll/pinrotate.{css,html,js}`
- **Limitations:** External images; RI icon font may not load.
- **Documentation status:** Documented on Docs page under "Scroll" section (listed as "Pin Rotate").

### 24. Image Flow (Scroll)
- **Purpose:** 3D image flow field — images fly into position as you scroll through a 3D space.
- **What it does:** 28 images positioned in 3D; on scroll they interpolate from off-screen/back to their final positions; cover image at end.
- **Use cases:** Gallery journeys, immersive scroll experiences.
- **Implemented features/effects:** Lenis smooth scroll, ScrollTrigger pin, 3D interpolate (x/y/z/scale), staggered delays, mobile spread adjustment.
- **Interactions:** Scroll.
- **Customization options:** None — hardcoded 28 images + cover, positions array.
- **Generated code:** Via `templatePage('imageflow')`.
- **Libraries:** GSAP, ScrollTrigger, Lenis, Google Fonts (Raleway, Instrument Serif).
- **Source files:** `templates/scroll/imageflow.{css,html,js}`
- **Limitations:** External images (picsum); 28 fixed images.
- **Documentation status:** Documented on Docs page under "Scroll" section (listed as "Image Flow").

### 25. Clip Reveal (Scroll)
- **Purpose:** Clip-path panel scroll reveal — pinned panels reveal content via clip-path animation with progress bar and nav dots.
- **What it does:** Pinned panels; as you scroll, each panel's image clips down, text fades/slides up, next image scales; progress bar and active dot update.
- **Use cases:** Storytelling panels, product showcases, portfolio sections.
- **Implemented features/effects:** GSAP timeline, ScrollTrigger pin+scrub, clip-path animation, progress bar, active nav dots, image scale, mobile adjustments.
- **Interactions:** Scroll.
- **Customization options:** None — hardcoded 5 panels, images, categories, text.
- **Generated code:** Via `templatePage('clipreveal')`.
- **Libraries:** GSAP, ScrollTrigger, Lenis, Google Fonts (Cormorant Unicase, Outfit, DM Mono).
- **Source files:** `templates/scroll/clipreveal.{css,html,js}`
- **Limitations:** External images; scrollbar hidden (overflow-x hidden, scrollbar-width none).
- **Documentation status:** Documented on Docs page under "Scroll" section (listed as "Clip Reveal").

### 26. Noisy Pixel (Shader)
- **Purpose:** WebGL/Three.js noisy pixel shader — image reveals through noisy character blocks on scroll.
- **What it does:** Custom fragment shader reveals an image through a grid of noisy pixel blocks with ASCII/character glyphs; progress shown as %.
- **Use cases:** Creative hero sections, tech/glitch aesthetics.
- **Implemented features/effects:** Three.js ShaderMaterial, custom vertex/fragment shaders, character atlas canvas, Lenis smooth scroll (custom class), ScrollTrigger, progress display, section-end fade.
- **Interactions:** Scroll (progress drives shader).
- **Customization options:** None — hardcoded image URL, character set, pixel size.
- **Generated code:** Via `templatePage('noisy')`.
- **Libraries:** Three.js (WebGL), Google Fonts (none — system-ui).
- **Source files:** `templates/shader/noisy.{css,html,js}`
- **Limitations:** WebGL required (Canvas 2D fallback not provided), external image, custom Lenis implementation (not the npm package).
- **Documentation status:** Documented on Docs page under "Shader" section (listed as "Noisy Pixel").

### 27. Mirror (Shader)
- **Purpose:** Three.js dissolve mirror shader — image dissolves with edge detection and grayscale on scroll.
- **What it does:** Two canvas layers with custom shaders; scroll drives dissolve, grayscale, edge intensity, darkness uniforms; edge/sobel detection + FBM noise.
- **Use cases:** Artistic image reveals, portfolio showcases.
- **Implemented features/effects:** Three.js ShaderMaterial (2 scenes), Sobel edge detection, FBM noise, dissolve/grayscale/edge uniforms driven by scroll, dual-canvas render loop.
- **Interactions:** Scroll.
- **Customization options:** None — hardcoded 2 image URLs, shader uniforms.
- **Generated code:** Via `templatePage('mirror')`.
- **Libraries:** Three.js (WebGL).
- **Source files:** `templates/shader/mirror.{css,html,js}`
- **Limitations:** WebGL required; external images; no fallback.
- **Documentation status:** Documented on Docs page under "Shader" section (listed as "Mirror").

---

## PART 2 — Existing Docs Page Audit

### A. Existing Documentation Structure

The Docs page (`docs.html`, 1222 lines) contains the following sections:

| Section | Title / ID | Location | Summary |
|---|---|---|---|
| Hero | (no id) | Top of main | "ZiiUI Docs" tagline, intro paragraph about generating standalone HTML components with GSAP/Three.js |
| Sidebar navigation | `sidebar` | Left side | Collapsible category list with toggle buttons; categories: Web, Menus, Interactive, Footer, Text, Scroll, Shader, Cursor |
| Quick Start | `quick-start` | Main content | Steps to generate and copy code; mentions "preview", "copy", "export" |
| Installation | `installation` | Main content | "No install required" — standalone HTML, CDN loading |
| Usage | `usage` | Main content | How to use generated HTML (drop into page, iframe, custom block) |
| Components | `components` | Main content | Overview of component categories (Web, Menus, Interactive, Footer, Text, Scroll, Shader) |
| Web section | `web` | Components subsection | Split Section description |
| Menus section | `menus` | Components subsection | Block Reveal, Reveal Menu |
| Interactive section | `interactive` | Components subsection | Draggable Mask, Micro Hover, Hover Section, Snake Hover, Image Trail |
| Footer section | `footer` | Components subsection | Footer 1, Footer 2, Folder Footer |
| Text section | `text` | Components subsection | Effect, Fancy, Roll, Roll 2, Scramble, Shimmer, Wave, Wave 2 |
| Scroll section | `scroll` | Components subsection | List Reveal, Scroll Down, Scroll Mask, Pin Rotate, Image Flow, Clip Reveal |
| Shader section | `shader` | Components subsection | Noisy Pixel, Mirror |
| Cursor section | `cursor` | Components subsection | Cursor: Expand, Cursor: Icon Label, Cursor: Image Reveal (**category does not exist in component registry**) |
| Best practices | `tips` | Main content | 4 tips: reduced motion, text length, one hero per page, host anywhere |
| FAQ | `faq` | Main content | 4 Q&A: install, React/Vue, modify code, preview height |
| Footer | `footer` | Bottom | Copyright 2025 ziiui, links to GSAP and Three.js |

**Navigation/sidebar items (exact titles):** Web, Menus, Interactive, Footer, Text, Scroll, Shader, Cursor

**Hero content:** "ZiiUI Docs" + description paragraph about generating UI components/effects.

**Quick Start:** Brief steps; no detailed numbered list with code blocks observed beyond prose.

**Installation/setup:** "No. The output is a standalone HTML file. It loads any required library from a CDN at the top of the file." (in FAQ, not a dedicated installation section with steps).

**Usage examples:** Prose only; no copy-paste code examples showing how to embed.

**Code examples:** Several code blocks exist (HTML/CSS/JS snippets) but they appear to be generic examples, not per-component.

**Component explanations:** Each component category has a short paragraph description but no per-component detail pages.

**Guides/tutorials:** None (only Quick Start prose).

**FAQs:** 4 questions (install, React/Vue, modify code, preview height).

**Footer sections:** Copyright + GSAP/Three.js credit links.

**Links/CTAs:** "Open an issue on GitHub" (href="#" — placeholder), GSAP link, Three.js link.

### B. Existing Content Details

| Section Title | Location | Content Summary | Code Examples | Links/CTAs | Accuracy | Completeness |
|---|---|---|---|---|---|---|
| Hero | docs.html top | Intro to ziiui docs | No | None | Accurate | Partial |
| Sidebar | docs.html left | 8 category links (incl. non-existent Cursor) | No | Anchor links to sections | Partially accurate (Cursor category doesn't exist) | Partial |
| Quick Start | `#quick-start` | How to generate/copy/export | No | None | Accurate | Partial |
| Installation | `#installation` | "No install required" prose | No | None | Accurate | Partial (FAQ only, no dedicated steps) |
| Usage | `#usage` | How to embed generated HTML | No | None | Accurate | Partial |
| Components overview | `#components` | Category list | No | None | Accurate | Partial |
| Web | `#web` | Split Section description | No | None | Accurate | Partial |
| Menus | `#menus` | Block Reveal, Reveal Menu | No | None | Accurate | Partial |
| Interactive | `#interactive` | Draggable Mask, Micro Hover, Hover Section, Snake Hover, Image Trail | No | None | Accurate | Partial |
| Footer | `#footer` | Footer 1, Footer 2, Folder Footer | No | None | Accurate | Partial |
| Text | `#text` | Effect, Fancy, Roll, Roll 2, Scramble, Shimmer, Wave, Wave 2 | No | None | Accurate | Partial |
| Scroll | `#scroll` | List Reveal, Scroll Down, Scroll Mask, Pin Rotate, Image Flow, Clip Reveal | No | None | Accurate | Partial |
| Shader | `#shader` | Noisy Pixel, Mirror | No | None | Accurate | Partial |
| Cursor | `#cursor` | Cursor: Expand, Icon Label, Image Reveal | No | None | **Inaccurate** — category/components don't exist | Empty |
| Best practices | `#tips` | 4 tips (reduced motion, text length, one hero, host anywhere) | No | None | Accurate | Complete |
| FAQ | `#faq` | 4 Q&A | No | None | Mostly accurate | Complete |
| Footer | docs.html bottom | © 2025 ziiui, GSAP, Three.js links | No | GSAP, Three URLs | Accurate | Complete |

### C. Documentation Gaps

1. **26 of 27 components have no individual documentation.** The Docs page groups components by category with only a one-line description per category. No per-component pages explain purpose, features, interactions, customization, generated code, dependencies, or limitations.

2. **Non-existent "Cursor" category.** Docs page lists `Cursor: Expand`, `Cursor: Icon Label`, `Cursor: Image Reveal` under a Cursor section that does not exist in `registry.js` or any template folder. Evidence: docs.html `#cursor` section vs. registry (Web/Menus/Interactive/Footer/Text/Scroll/Shader only).

3. **Name mismatches.** Docs lists "Draggable Mask" but component is "Mask Drag" (`maskdrag`). Docs lists "Effect", "Fancy", etc. under Text but gives no detail.

4. **No installation/usage code examples.** FAQ states "No install required" but no copy-paste example showing how to embed generated HTML into a page.

5. **No customization guidance.** No documentation of which properties are editable per component (e.g., text presets for Effect, colors for shaders, image URLs).

6. **No interaction explanations.** No documentation of hover/click/scroll/touch/keyboard interactions per component.

7. **No code examples per component.** Each component generates HTML/CSS/JS but the Docs don't show what the generated code looks like or how to use it.

8. **Inaccurate claims.** FAQ says "Cursor, scroll, and shader effects are heavy on GPU" — cursor effects don't exist. Best practices mention "Cursor" effects.

9. **Broken/placeholder links.** "Open an issue on GitHub" uses `href="#"`.

10. **Component count discrepancy.** Docs state "27 components across seven categories" (correct count, but includes non-existent Cursor category components).

---

# PART 3 — Summary and Coverage

| Metric | Value |
|---|---|
| Total components found | 27 |
| Total categories found | 7 |
| Components by category | Web: 1, Menus: 2, Interactive: 5, Footer: 3, Text: 8, Scroll: 6, Shader: 2 |
| Components fully documented | 0 |
| Components partially documented | 27 (mentioned by name in category groups only) |
| Components undocumented (no detail) | 27 |
| Current Docs page section count | ~16 sections (including non-existent Cursor) |
| Main documentation gaps | No per-component docs, non-existent Cursor category, no code examples, no customization/interaction guidance, name mismatches, placeholder links |
| Recommended documentation priorities | 1. Remove/add fix Cursor category; 2. Add per-component reference pages; 3. Add installation/usage code examples; 4. Fix name mismatches (Draggable Mask → Mask Drag); 5. Add customization + interaction docs per component |

---

# PART 4 — Deliverables

## 1. Complete Component Inventory
See Part 1.A above — 27 components across 7 categories with names, categories, types, IDs, source paths, and status.

## 2. Detailed Component Reference
See Part 1.B above — all 27 components with purpose, behavior, use cases, features, interactions, customization, generated code, dependencies, source files, limitations, and documentation status.

## 3. Existing Docs Audit
See Part 2 above — all current Docs sections, structure, content details, and a per-section accuracy/completeness table.

## 4. Documentation Gap Report
See Part 2.C above — 10 identified gaps with evidence.

## 5. Recommended Documentation Plan
Prioritized:
1. **Fix Cursor category** — remove or align with actual components (none exist).
2. **Per-component reference pages** — one section per component using the Part 1.B structure.
3. **Installation/usage code examples** — copy-paste embed examples.
4. **Fix name mismatches** — "Draggable Mask" → "Mask Drag".
5. **Customization + interaction docs** — per-component editable options and interaction types.
6. **Fix placeholder links** — GitHub issue link.
7. **Add generated code previews** — show HTML/CSS/JS output per component.

---

## Files Inspected (read-only, no modifications)

- `ziiui/src/effects/registry.js` — component registry (27 components, 7 categories)
- `ziiui/src/effects/builders.js` — page builders (textPage, fullPage, templatePage, splitEffectPage, rollPage, wavePage, scramblePage, PRESETS, STAGGER)
- `ziiui/src/effects/templates.js` — template loader (tpl, fill, hasTemplate)
- `ziiui/src/effects/templates/text/` — base.css, build.js, effect.css, graphemes.js, roll.css, roll.js, scramble.css, scramble.js, shimmer.css, split-char.js, split-line.js, split-word.js, tail.js, wave.css, wave.js, wcss.css, wrap.js, fancy.css, fancy.js
- `ziiui/src/effects/templates/menus/` — blockreveal.{css,html,js}, revealmenu.{css,html,js}
- `ziiui/src/effects/templates/interactive/` — maskdrag.{css,html,js}, microhover.{css,html,js}, hoversection.{css,html,js}, snakehover.{css,html,js}, imagetrail.{css,html,js}, splitsection.{css,html,js}
- `ziiui/src/effects/templates/footer/` — footer1.{css,html,js}, footer2.{css,html,js}, folderfooter.{css,html,js}
- `ziiui/src/effects/templates/scroll/` — list.{css,html,js}, scrolldown.{css,html,js}, scrollmask.{css,html,js}, pinrotate.{css,html,js}, imageflow.{css,html,js}, clipreveal.{css,html,js}
- `ziiui/src/effects/templates/shader/` — noisy.{css,html,js}, mirror.{css,html,js}
- `ziiui/docs.html` — complete Docs page (1222 lines)
- `ziiui/src/pages/docs.js` — Docs page interactivity (sidebar, scroll-spy, copy, smooth scroll)
- `ziiui/src/pages/library.js` — Library page wiring
- `ziiui/src/pages/library/viewer.js` — Library preview/viewer logic (setView, openInNewWindow, toggleFullscreen)
- `ziiui/index.html` — main library app HTML
- `ziiui/src/ai/client.js` — AI client (partial read)

**Confirmation: No project files were modified during this audit.**
