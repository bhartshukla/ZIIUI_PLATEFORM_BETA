gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.3,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

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

const GAP_TARGET = 6;
const proxy = { gap: 0 };

function applyGap(gapPx) {
  stage.style.gap = gapPx + 'px';
  const wrapW = wraps[0].offsetWidth;
  if (!wrapW) return;
  const half = gapPx / 2;
  const pct = (half / wrapW * 100).toFixed(6);
  wraps[0].style.clipPath = `inset(0 ${pct}% 0 0)`;
  wraps[1].style.clipPath = `inset(0 ${pct}% 0 ${pct}%)`;
  wraps[2].style.clipPath = `inset(0 0 0 ${pct}%)`;
}

applyGap(0);

const section = document.getElementById('flip-section');

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.6,
  }
});

tl.to(stage, { scale: 1, duration: 0.12, ease: 'power2.out' }, 0);
tl.to(stage, { scale: 0.84, duration: 0.24, ease: 'power1.inOut' }, 0.12);
tl.to(proxy, {
  gap: GAP_TARGET, duration: 0.24, ease: 'power2.inOut',
  onUpdate() { applyGap(proxy.gap); },
}, 0.36);

const FLIP_START = 0.62;
const FLIP_DURATION = 0.20;
const FLIP_STAGGER = 0.09;

cards.forEach((card, i) => {
  tl.to(card, {
    rotateY: -180, duration: FLIP_DURATION, ease: 'power2.inOut',
  }, FLIP_START + i * FLIP_STAGGER);
});

gsap.to('.hero h1', {
  yPercent: -28, ease: 'none',
  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
});
gsap.to('.hero p, .hero-label', {
  yPercent: -16, opacity: 0, ease: 'none',
  scrollTrigger: { trigger: '.hero', start: '25% top', end: 'bottom top', scrub: true }
});

window.addEventListener('resize', () => {
  applyGap(proxy.gap);
  ScrollTrigger.refresh();
});
