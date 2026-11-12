document.querySelectorAll('.tile').forEach((t) => {
  const paths = [...t.querySelectorAll('.path')];
  const lbl = t.querySelector('.label');
  const lens = paths.map((p) => {
    const len = typeof p.getTotalLength === 'function' ? p.getTotalLength() : 3000;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    return len;
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  t.onmouseenter = () => {
    gsap.killTweensOf([...paths, lbl]);
    if (reducedMotion) {
      gsap.set(paths, { strokeDashoffset: 0, attr: { 'stroke-width': 700 } });
      gsap.set(lbl, { opacity: 1 });
      return;
    }
    gsap.to(paths, { strokeDashoffset: 0, attr: { 'stroke-width': 700 }, duration: 1.5, ease: 'power2.out' });
    gsap.to(lbl, { opacity: 1, duration: 0.5, delay: 0.4, ease: 'power2.out' });
  };

  t.onmouseleave = () => {
    gsap.killTweensOf([...paths, lbl]);
    if (reducedMotion) {
      gsap.set(paths, { strokeDashoffset: (i) => lens[i], attr: { 'stroke-width': 100 } });
      gsap.set(lbl, { opacity: 0 });
      return;
    }
    gsap.to(paths, { strokeDashoffset: (i) => lens[i], attr: { 'stroke-width': 100 }, duration: 1, ease: 'power2.out' });
    gsap.set(lbl, { opacity: 0 });
  };
});
