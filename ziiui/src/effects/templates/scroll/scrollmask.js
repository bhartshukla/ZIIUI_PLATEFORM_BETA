gsap.to("h2", {
  scale: 100,
  scrollTrigger: {
    trigger: ".container",
    scrub: 1, pin: true, start: "top top", end: "+=1000", ease: "none"
  },
});
