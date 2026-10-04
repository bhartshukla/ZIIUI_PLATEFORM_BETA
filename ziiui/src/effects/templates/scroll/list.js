window.addEventListener("load", () => {
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  const listWrapper = document.querySelector('.list-wrapper');
  const listItems = document.querySelectorAll('.list-item');
  const container = document.querySelector('.container');
  const previewImage = document.querySelector('.preview-image');

  const itemHeight = listItems[0].offsetHeight + 8;
  const totalScroll = itemHeight * (listItems.length - 1);

  gsap.to(listWrapper, {
    y: -totalScroll, ease: "none",
    scrollTrigger: {
      trigger: container, start: "top top", end: "+=" + totalScroll,
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
});
