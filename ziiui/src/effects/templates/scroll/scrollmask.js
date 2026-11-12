/* ── Reduced Motion Check ── */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion) {
  gsap.to('h2', {
    scale: 100,
    scrollTrigger: {
      trigger: '.container',
      scrub: 1, pin: true, start: 'top top', end: '+=1000', ease: 'none'
    },
  });
} else {
  /* ── Reduced Motion: Show final scaled state ── */
  gsap.set('h2', { scale: 100 });
}