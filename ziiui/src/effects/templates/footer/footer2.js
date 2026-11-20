gsap.registerPlugin(ScrollTrigger);

/* ── Reduced Motion Check ── */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('.line').forEach(line => {
  const text = line.textContent;
  line.innerHTML = text.split(' ').map(word => `<span class="word">${[...word].map(c => `<span class="char">${c}</span>`).join('')}</span>&nbsp;`).join('');
});

const footerTL = gsap.timeline({ paused: true });

footerTL.from('.char', {
  y: '120%', opacity: 0, stagger: 0.02, duration: 1, ease: 'power4.out'
});

footerTL.from('.footer-link', {
  y: 30, opacity: 0, stagger: 0.15, duration: 0.7, ease: 'power3.out'
}, '-=0.5');

let footerScrollTrigger = null;

if (!reducedMotion) {
  footerScrollTrigger = ScrollTrigger.create({
    trigger: 'footer',
    start: 'top 80%',
    end: 'bottom 20%',
    onEnter: () => footerTL.play(0),
    onLeave: () => footerTL.progress(0).pause(),
    onEnterBack: () => footerTL.play(0),
    onLeaveBack: () => footerTL.progress(0).pause()
  });

  if (!('ontouchstart' in window)) {
    document.querySelectorAll('.footer-link').forEach(link => {
      const span = link.querySelector('span');
      const onMouseMove = e => {
        const r = link.getBoundingClientRect();
        gsap.to(span, {
          x: (e.clientX - r.left - r.width / 2) * 0.35,
          y: (e.clientY - r.top - r.height / 2) * 0.35,
          duration: .3, ease: 'power3.out'
        });
      };
      const onMouseLeave = () => {
        gsap.to(span, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,0.4)' });
      };
      link._mouseMoveHandler = onMouseMove;
      link._mouseLeaveHandler = onMouseLeave;
      link.addEventListener('mousemove', onMouseMove);
      link.addEventListener('mouseleave', onMouseLeave);
    });
  }
} else {
  /* ── Reduced Motion: Show final state immediately ── */
  footerTL.progress(1);
  /* Magnetic hover disabled */
}

window.__ziiuiCleanup = () => {
  if (footerScrollTrigger) {
    footerScrollTrigger.kill();
    footerScrollTrigger = null;
  }
  document.querySelectorAll('.footer-link').forEach(link => {
    if (link._mouseMoveHandler) {
      link.removeEventListener('mousemove', link._mouseMoveHandler);
    }
    if (link._mouseLeaveHandler) {
      link.removeEventListener('mouseleave', link._mouseLeaveHandler);
    }
    const span = link.querySelector('span');
    if (span) {
      gsap.killTweensOf(span);
    }
  });
  gsap.killTweensOf(footerTL);
};