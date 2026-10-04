gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll('.line').forEach(line => {
  const text = line.textContent;
  line.innerHTML = text.split(' ').map(word => {
    return `<span class="word">${[...word].map(c => `<span class="char">${c}</span>`).join('')}</span>&nbsp;`;
  }).join('');
});

const footerTL = gsap.timeline({ paused: true });

footerTL.from('.char', {
  y: '120%', opacity: 0, stagger: 0.02, duration: 1, ease: 'power4.out'
});

footerTL.from('.footer-link', {
  y: 30, opacity: 0, stagger: 0.15, duration: 0.7, ease: 'power3.out'
}, '-=0.5');

ScrollTrigger.create({
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
    link.addEventListener('mousemove', e => {
      const r = link.getBoundingClientRect();
      gsap.to(span, {
        x: (e.clientX - r.left - r.width / 2) * 0.35,
        y: (e.clientY - r.top - r.height / 2) * 0.35,
        duration: .3, ease: 'power3.out'
      });
    });
    link.addEventListener('mouseleave', () => {
      gsap.to(span, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,0.4)' });
    });
  });
}
