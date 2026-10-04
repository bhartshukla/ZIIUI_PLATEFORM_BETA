(() => {
  const heroSection = document.querySelector("#about-hero");
  const photoElements = heroSection.querySelectorAll(".about-hero__photo");
  const keywordTriggers = heroSection.querySelectorAll(".about-hero__keyword");
  const randomBetween = gsap.utils.random;

  let burstTimeline = null;

  const hidePhotosOffscreen = () =>
    gsap.set(photoElements, {
      left: "50%", top: "50%",
      xPercent: -50, yPercent: -50,
      x: 0, y: 0, rotation: 0,
      clipPath: "inset(100% 0 0 0)",
    });

  const stopBurst = () => {
    burstTimeline?.kill();
    burstTimeline = null;
    gsap.killTweensOf(photoElements);
    hidePhotosOffscreen();
  };

  const scatterPhotosForBurst = () => {
    photoElements.forEach((photo, index) => {
      gsap.set(photo, {
        left: randomBetween(2, 98) + "%",
        top: randomBetween(2, 98) + "%",
        x: randomBetween(-48, 48),
        y: randomBetween(50, 110),
        rotation: randomBetween(-12, 12) * 0.2,
        zIndex: index,
      });
    });
  };

  const playBurst = () => {
    stopBurst();
    scatterPhotosForBurst();

    const staggerSeconds = 0.09;
    const revealDuration = 0.34;
    const exitDuration = 0.3;
    const exitStaggerSeconds = 0.07;
    const photoCount = photoElements.length;
    const revealEndTime = (photoCount - 1) * staggerSeconds + revealDuration;

    burstTimeline = gsap.timeline({ onComplete: stopBurst });

    photoElements.forEach((photo, index) => {
      burstTimeline.to(photo, {
        x: randomBetween(-40, 40),
        y: randomBetween(-30, 30),
        rotation: randomBetween(-12, 12),
        clipPath: "inset(0% 0 0 0)",
        ease: "power3.out",
        duration: revealDuration,
      }, index * staggerSeconds);
    });

    photoElements.forEach((photo, index) => {
      burstTimeline.to(photo, {
        y: "+=" + randomBetween(180, 280),
        x: "+=" + randomBetween(-55, 55),
        rotation: "+=" + randomBetween(-10, 10),
        clipPath: "inset(0% 0 100% 0)",
        ease: "power2.in",
        duration: exitDuration,
      }, revealEndTime + index * exitStaggerSeconds);
    });
  };

  hidePhotosOffscreen();

  keywordTriggers.forEach((trigger) => {
    trigger.addEventListener("mouseenter", playBurst);
    trigger.addEventListener("focus", playBurst);
  });
  heroSection.addEventListener("mouseleave", stopBurst);
})();
