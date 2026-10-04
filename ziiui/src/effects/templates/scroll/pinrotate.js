window.addEventListener('load', () => {
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  const pinCards = gsap.utils.toArray('.pin-card');

  pinCards.forEach((card) => {
    const content = card.querySelector('.pin-card-content');
    const overlay = card.querySelector('.overlay');
    const number = card.querySelector('span');

    gsap.set(overlay, { opacity: 0 });
    gsap.set(content, { rotate: 12, scale: 0.85, opacity: 0, y: 40 });
    gsap.set(number, { opacity: 0, x: -20 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: card,
        start: 'top top',
        end: '+=80%',
        pin: true,
        scrub: 1,
      }
    });

    tl.to(overlay, { opacity: 1, duration: 0.4 })
      .to(content, {
        rotate: 0, scale: 1, opacity: 1, y: 0,
        duration: 0.8, ease: 'power3.out'
      }, 0.15)
      .to(number, { opacity: 1, x: 0, duration: 0.4 }, 0.25);
  });
});
