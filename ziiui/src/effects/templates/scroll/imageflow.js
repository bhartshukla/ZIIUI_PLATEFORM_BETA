window.addEventListener("load", () => {
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  const images = gsap.utils.toArray('.flow .img');
  const positions = [
    { x: -0.8, y: -0.6 }, { x: 0.7, y: 0.4 }, { x: -0.5, y: 0.7 },
    { x: 0.6, y: -0.5 }, { x: -0.8, y: 0.2 }, { x: 0.8, y: -0.3 },
    { x: -0.6, y: -0.8 }, { x: 0.4, y: 0.6 }, { x: -0.7, y: 0.5 },
    { x: 0.5, y: -0.7 }, { x: -0.4, y: -0.4 }, { x: 0.3, y: 0.8 },
    { x: -0.8, y: 0.3 }, { x: 0.6, y: 0.2 }, { x: -0.2, y: -0.7 },
    { x: 0.7, y: -0.6 }, { x: -0.5, y: 0.4 }, { x: 0.4, y: -0.4 },
    { x: -0.6, y: 0.6 }, { x: 0.8, y: 0.5 }, { x: -0.3, y: -0.5 },
    { x: 0.5, y: 0.3 }, { x: -0.7, y: -0.2 }, { x: 0.2, y: 0.7 },
    { x: -0.4, y: 0.8 }, { x: 0.6, y: -0.8 }, { x: -0.8, y: 0.1 },
    { x: -0.1, y: 0.6 }, { x: 0, y: 0 }
  ];

  const screenHeight = window.innerHeight;
  const screenWidth = window.innerWidth;
  const isMobile = screenWidth < 800;
  const spread = isMobile ? 1.5 : 0.7;

  const initPos = images.map(() => ({ x: 0, y: 0, z: -1000, scale: 0 }));
  const finalPos = images.map((img, index) => {
    const p = positions[index] || { x: 0, y: 0 };
    return {
      x: p.x * screenWidth * spread,
      y: p.y * screenHeight * spread,
      z: 2000, scale: 1
    };
  });

  images.forEach((eachImage, index) => { gsap.set(eachImage, initPos[index]); });

  ScrollTrigger.create({
    trigger: ".flow",
    start: "top top",
    end: `+=${screenHeight * 10}px`,
    pin: true, pinSpacing: true, scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress;
      images.forEach((eachImage, index) => {
        const imgDelay = index * 0.03;
        const imgProgress = Math.max(0, (progress - imgDelay) * 4);
        const start = initPos[index];
        const end = finalPos[index];
        let x = gsap.utils.interpolate(start.x, end.x, imgProgress);
        let y = gsap.utils.interpolate(start.y, end.y, imgProgress);
        let z = gsap.utils.interpolate(start.z, end.z, imgProgress);
        let scale = gsap.utils.interpolate(start.scale, end.scale, imgProgress);
        if (index === images.length - 1) { x = 0; y = 0; z = z * 0.4; }
        gsap.set(eachImage, { x, y, z, scale });
      });
    }
  });
});
