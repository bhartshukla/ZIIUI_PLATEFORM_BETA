if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Skip Lenis smooth scroll — use native scroll
} else {
  const lenis = new Lenis();
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}
