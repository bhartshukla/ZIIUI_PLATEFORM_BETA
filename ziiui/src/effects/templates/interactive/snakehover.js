document.querySelectorAll('.tile').forEach((t) => {
  const paths = [...t.querySelectorAll('.path')];
  const lbl = t.querySelector('.label');
  const lens = paths.map((p) => {
    const len = typeof p.getTotalLength === 'function' ? p.getTotalLength() : 3000;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    return len;
  });

  t.onmouseenter = () => {
    gsap.killTweensOf([...paths, lbl]);
    gsap.to(paths, { strokeDashoffset: 0, attr: { 'stroke-width': 700 }, duration: 1.5, ease: 'power2.out' });
    gsap.to(lbl, { opacity: 1, duration: 0.5, delay: 0.4, ease: 'power2.out' });
  };

  t.onmouseleave = () => {
    gsap.killTweensOf([...paths, lbl]);
    gsap.to(paths, { strokeDashoffset: (i) => lens[i], attr: { 'stroke-width': 100 }, duration: 1, ease: 'power2.out' });
    gsap.to(lbl, { opacity: 0, duration: 0.3 });
  };
});
