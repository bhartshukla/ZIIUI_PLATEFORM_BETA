if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Skip Lenis smooth scroll — use native scroll
} else {
  const lenis = new Lenis();
  const lenisRaf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(lenisRaf);
  function raf(time) {
    lenis.raf(time);
    rafId = requestAnimationFrame(raf);
  }
  let rafId = requestAnimationFrame(raf);

  window.__ziiuiCleanup = () => {
    cancelAnimationFrame(rafId);
    lenis.destroy();
  };
}
