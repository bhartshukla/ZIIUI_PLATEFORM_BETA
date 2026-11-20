/* ════════════════════════════════════════════════════════
   SETUP
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
gsap.registerPlugin(ScrollTrigger);

/* â”€â”€ Reduced Motion Check â”€â”€ */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* â”€â”€ Lenis â”€â”€ */
let lenis = null;
let lenisRaf = null;

if (!reducedMotion) {
  lenis = new Lenis({
    duration: 1.3,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
  lenisRaf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);
  lenis.on('scroll', ScrollTrigger.update);
}

/* â”€â”€ Elements â”€â”€ */
const stage = document.getElementById('stage');
const wraps = [
  document.getElementById('wrap1'),
  document.getElementById('wrap2'),
  document.getElementById('wrap3'),
];
const cards = [
  document.getElementById('card1'),
  document.getElementById('card2'),
  document.getElementById('card3'),
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CLIP-PATH SPLIT LOGIC
   ───────────────────────────────────────────────────────
   Strategy: each wrap is exactly 1/3 of stage width (flex:1).
   We apply clip-path inset() in px to hide half the gap on
   each inner edge, making the gap appear between rendered areas.

   wrap1: clip right edge inward by halfGap
   wrap2: clip left & right edges inward by halfGap each
   wrap3: clip left edge inward by halfGap

   We also push the flex gap open so the wraps actually move apart
   (this is what creates the physical space; clip-path reveals the
   correct image slice inside each wrap's moved position).

   Together: the image appears to seamlessly split with a clean gap.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const GAP_TARGET = 6; // final gap in px
const proxy = { gap: 0 };

function applyGap(gapPx) {
  // Set flex gap on stage
  stage.style.gap = `${gapPx}px`;

  // Each wrap is (stageW - gapPx * 2) / 3 wide — but since we use
  // flex:1, each wrap naturally accounts for gap via flex layout.
  // We compute clip inset as % of wrap's current rendered width.
  const wrapW = wraps[0].offsetWidth;
  if (!wrapW) { return; }

  const half = gapPx / 2;
  const pct  = (half / wrapW * 100).toFixed(6); // % of wrap width

  // wrap1: clip right side
  wraps[0].style.clipPath = `inset(0 ${pct}% 0 0)`;
  // wrap2: clip both sides
  wraps[1].style.clipPath = `inset(0 ${pct}% 0 ${pct}%)`;
  // wrap3: clip left side
  wraps[2].style.clipPath = `inset(0 0 0 ${pct}%)`;
}

// Init at zero gap
applyGap(0);

let tl = null;

if (!reducedMotion) {
  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     MASTER SCROLL TIMELINE
     â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     500vh scroll budget — progress 0 → 1

     Phase A  0.00 – 0.12   Stage enters (scale 1.06 → 1)
     Phase B  0.12 – 0.36   Shrink inward (scale → 0.84)
     Phase C  0.36 – 0.60   Gap opens 0 → 4px  (the split)
     Phase D  0.62 – 1.00   Cards flip (staggered)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  const section = document.getElementById('flip-section');

  tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.6,
    }
  });

  /* Phase A */
  tl.to(stage, {
    scale: 1,
    duration: 0.12,
    ease: 'power2.out',
  }, 0);

  /* Phase B */
  tl.to(stage, {
    scale: 0.84,
    duration: 0.24,
    ease: 'power1.inOut',
  }, 0.12);

  /* Phase C — gap opens */
  tl.to(proxy, {
    gap: GAP_TARGET,
    duration: 0.24,
    ease: 'power2.inOut',
    onUpdate() { applyGap(proxy.gap); },
  }, 0.36);

  /* Phase D — staggered card flips */
  const FLIP_START    = 0.62;
  const FLIP_DURATION = 0.20;
  const FLIP_STAGGER  = 0.09;

  cards.forEach((card, i) => {
    tl.to(card, {
      rotateY: -180,
      duration: FLIP_DURATION,
      ease: 'power2.inOut',
    }, FLIP_START + i * FLIP_STAGGER);
  });

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     HERO PARALLAX
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  gsap.to('.hero h1', {
    yPercent: -28,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    }
  });
  gsap.to('.hero p, .hero-label', {
    yPercent: -16, opacity: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: '25% top',
      end: 'bottom top',
      scrub: true,
    }
  });
} else {
  /* ── Reduced Motion: Set final static state ── */
  // Stage at final scale
  gsap.set(stage, { scale: 0.84 });
  // Gap fully open
  applyGap(GAP_TARGET);
  // Cards flipped to show back
  gsap.set(cards, { rotateY: -180 });
  // Hero text at final position
  gsap.set('.hero h1', { yPercent: -28 });
  gsap.set('.hero p, .hero-label', { yPercent: -16, opacity: 0 });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESIZE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const onResize = () => {
  applyGap(proxy.gap);
  if (!reducedMotion) {
    ScrollTrigger.refresh();
  }
};
window.addEventListener('resize', onResize);

window.__ziiuiCleanup = () => {
  if (!reducedMotion) {
    lenis.destroy();
    gsap.ticker.remove(lenisRaf);
  }
  tl.kill();
  gsap.killTweensOf(cards);
  gsap.killTweensOf(stage);
  gsap.killTweensOf('.hero h1');
  gsap.killTweensOf('.hero p, .hero-label');
  ScrollTrigger.getAll().forEach(st => st.kill());
  window.removeEventListener('resize', onResize);
};
