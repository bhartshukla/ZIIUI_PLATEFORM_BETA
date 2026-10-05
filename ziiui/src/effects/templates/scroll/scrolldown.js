const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));

const wordpink = "#F22A72";
const wordDark = "#57524f";

const cardStart = [
  { rotateX: 58, rotateY: 18, y: 48 },
  { rotateX: 74, rotateY: 5, y: 32 },
  { rotateX: 90, rotateY: 0, y: 18 },
  { rotateX: 74, rotateY: -5, y: 32 },
  { rotateX: 58, rotateY: -18, y: 48 },
];

document.fonts.ready.then(() => {
  document.querySelectorAll(".stand").forEach((section) => {
    const cards = section.querySelectorAll(".card");
    const cardsWrap = section.querySelector(".cards-wrap");
    const copy = section.querySelector(".stand-copy");
    const words = SplitText.create(section.querySelector(".stand-heading"), {
      type: "words", wordsClass: "word",
    }).words;

    cards.forEach((card, i) => {
      gsap.set(card, {
        ...cardStart[i],
        transformOrigin: "50% 100%",
        transformPerspective: 1560,
      });
    });

    gsap.set(copy, { y: -10 });
    gsap.set(cardsWrap, { marginTop: "2.5rem" });
    gsap.set(words, { color: wordpink });

    gsap.timeline({
      scrollTrigger: { trigger: section, start: "top 40%", end: "top 0%", scrub: 1 },
    })
      .to(cards, { rotateX: 0, rotateY: 0, y: 0, ease: "power1.inOut", duration: 1 }, 0)
      .to(copy, { y: 0 }, 0)
      .to(words, { color: wordDark, stagger: 0.2 }, 0.1);
  });
});
