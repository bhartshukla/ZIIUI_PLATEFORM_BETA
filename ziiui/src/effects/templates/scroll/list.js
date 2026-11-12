window.addEventListener('load', () => {
  /* ── Reduced Motion Check ── */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reducedMotion) {
    const lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  const listWrapper = document.querySelector('.list-wrapper');
  const listItems = document.querySelectorAll('.list-item');
  const container = document.querySelector('.container');
  const previewImage = document.querySelector('.preview-image');

  const itemHeight = listItems[0].offsetHeight + 8;
  const totalScroll = itemHeight * (listItems.length - 1);

  if (!reducedMotion) {
    gsap.to(listWrapper, {
      y: -totalScroll, ease: 'none',
      scrollTrigger: {
        trigger: container, start: 'top top', end: `+=${  totalScroll}`,
        pin: true, scrub: 0.8,
        onUpdate: (self) => {
          const activeIndex = Math.round(self.progress * (listItems.length - 1));
          listItems.forEach((item, i) => {
            item.classList.toggle('active', i === activeIndex);
          });
          previewImage.src = listItems[activeIndex].dataset.img;
        },
        onLeave: () => {
          gsap.to(previewImage, { opacity: 0, duration: 0.3 });
          listItems.forEach(item => item.classList.remove('active'));
        },
        onEnterBack: () => {
          gsap.to(previewImage, { opacity: 1, duration: 0.3 });
        }
      }
    });
  } else {
    /* ── Reduced Motion: All items visible, no pin animation ── */
    gsap.set(listWrapper, { y: 0 });
    // Show all items as active (or just the first)
    listItems.forEach((item, i) => {
      item.classList.toggle('active', i === 0);
    });
    previewImage.src = listItems[0].dataset.img;
    gsap.set(previewImage, { opacity: 1 });
    // Disable pin by not creating ScrollTrigger
  }
});