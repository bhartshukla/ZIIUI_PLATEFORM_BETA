const IMAGES = [
  "https://assets.lummi.ai/assets/QmedKm8YSdHaWnDdvLzjrsWgeiArndQkhcucsvaFjyVgXz?auto=format&w=480",
  "https://assets.lummi.ai/assets/QmcR7gTkJUJgUAfWjM31hbEMJ43txn6aTiJx7hb8LaVQ5X?auto=format&w=480",
  "https://assets.lummi.ai/assets/QmTSgovioSANEhNgNo9XxY3ug5iYfQ1wnjY2P72qZofRwP?auto=format&w=480",
  "https://assets.lummi.ai/assets/Qmb3rGQC9S1bGz7PC5cnQ3y2cX3GnDpUeBYx9vQvSn1H3v?auto=format&w=480",
  "https://assets.lummi.ai/assets/QmXzqMzfHMyvQBySMwJdgUbUYsTNUNbDD2bLCyDt5s7aQU?auto=format&w=480",
  "https://assets.lummi.ai/assets/QmbWtf1Mhr3JCLd7NS4XQ187cA7ukws3zuDXTcbd8fGo5u?auto=format&w=480",
  "https://assets.lummi.ai/assets/QmSoKRoG5ZTST6n9eWmLqggURiirGS3W4LfZ338Wj2puki?auto=format&w=480",
  "https://assets.lummi.ai/assets/Qme6mAjMnD8PLhRzHZ7soZG2cvZL5vHPhzoA5pm6JuaCSX?auto=format&w=480",
  "https://assets.lummi.ai/assets/QmUU9hRVuK34EFbA4DNMEMrQ6X4NnqTg2Dppqv6R3jCMQC?auto=format&w=480",
  "https://assets.lummi.ai/assets/QmStPNbdbM4Acy1UDESHguBMqWLCw53WWUvxXXdqKAcVvq?auto=format&w=480"
];

const SPAWN_DISTANCE = 160;

const imgs = IMAGES.map((src) => {
  const img = new Image();
  img.src = src;
  document.body.appendChild(img);
  return img;
});

let lastSpawn = null;
let index = 0;
let zIndex = 1;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function showImage(x, y) {
  const img = imgs[index++ % imgs.length];

  gsap.killTweensOf(img);

  gsap.timeline()
    .set(img, { zIndex: zIndex++, opacity: 1, xPercent: -50, yPercent: -50, x, y }, 0)
    .fromTo(img,
      { scale: 0, rotation: gsap.utils.random(-30, 30) },
      { scale: gsap.utils.random(0.5, 1.15), rotation: gsap.utils.random(-15, 15), duration: 0.6, ease: "expo.out" }, 0)
    .to(img, { opacity: 0, duration: 0.9, ease: "power1.out" }, 0.55)
    .to(img, { scale: 0.3, duration: 0.9, ease: "power4.out" }, 0.55);
}

const handlePointer = (e) => {
  const mouse = { x: e.clientX, y: e.clientY };

  if (lastSpawn && distance(mouse, lastSpawn) < SPAWN_DISTANCE) return;

  lastSpawn = mouse;
  showImage(mouse.x, mouse.y);
};

addEventListener("pointermove", handlePointer);
addEventListener("pointerdown", handlePointer);
