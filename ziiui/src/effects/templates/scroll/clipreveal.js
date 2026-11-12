/* ── Reduced Motion Check ── */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion) {
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

const panels = gsap.utils.toArray('.panel');
const bar = document.querySelector('.progress__bar');
const nav = document.querySelector('.nav');
const tl = gsap.timeline();

nav.innerHTML = panels.map((_, i) => `<div class="nav__dot${i ? '' : ' active'}"></div>`).join('');
const dots = nav.querySelectorAll('.nav__dot');

if (!reducedMotion) {
  panels.forEach((panel, i) => {
    if (i) {tl.fromTo(
      panel.querySelectorAll('.panel__header, .panel__body, .panel__title'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: 'ease-in-out' }
    );}
    if (i < panels.length - 1) {
      tl.fromTo(
        panel.querySelector('.panel__image'),
        { clipPath: 'inset(0 0 0% 0)' },
        { clipPath: 'inset(0 0 100% 0)', ease: 'none', duration: 1 }
      ).fromTo(
        panels[i + 1].querySelector('img'),
        { scale: 1.2 },
        { scale: 1, duration: 1.3, ease: 'power2.out' },
        '<'
      );
    }
  });

  ScrollTrigger.create({
    animation: tl,
    trigger: '.panels',
    start: 'top top',
    end: () => `+=${tl.totalDuration() * innerHeight}`,
    scrub: 0.6, pin: true,
    onUpdate: ({ progress }) => {
      bar.style.width = `${progress * 100}%`;
      const active = Math.min(panels.length - 1, Math.floor(progress * panels.length));
      dots.forEach((d, i) => d.classList.toggle('active', i === active));
    },
  });
} else {
  /* ── Reduced Motion: Set final static state ── */
  // All panels visible, no clip-path animation
  panels.forEach((panel, i) => {
    if (i) {
      gsap.set(panel.querySelectorAll('.panel__header, .panel__body, .panel__title'), { opacity: 1, y: 0 });
    }
    if (i < panels.length - 1) {
      gsap.set(panel.querySelector('.panel__image'), { clipPath: 'inset(0 0 100% 0)' });
      gsap.set(panels[i + 1].querySelector('img'), { scale: 1 });
    }
  });
  // Progress bar full
  bar.style.width = '100%';
  // Last nav dot active
  dots.forEach((d, i) => d.classList.toggle('active', i === panels.length - 1));
}