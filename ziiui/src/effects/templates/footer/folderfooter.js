const root = document.querySelector('.folder-footer');
gsap.defaults({ overwrite: 'auto' });

const tiltRange = [
  [-20, -10],
  [-10, 10],
  [10, 20]
];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function muteOthers(allFolders, active, on) {
  for (const folder of allFolders) {
    folder.classList.toggle('muted', on && folder !== active);
  }
}

function animatePhotos(photoEls, opening) {
  photoEls.forEach((element, index) => {
    const [lo, hi] = tiltRange[index];
    gsap.to(element, {
      y: opening ? '-120%' : '0%',
      rotation: opening ? gsap.utils.random(lo, hi) : 0,
      duration: 0.25,
      ease: 'back.out(1.7)',
      delay: opening ? index * 0.03 : index * 0.05
    });
  });
}

const allFolders = root.querySelectorAll('.folder');
for (const folder of allFolders) {
  const target = folder.querySelector('.target');
  const photos = folder.querySelectorAll('.photo');

  target.addEventListener('pointerenter', () => {
    muteOthers(allFolders, folder, true);
    if (reducedMotion) {
      // Skip photo tilt animation — keep photos in final static state
      return;
    }
    animatePhotos(photos, true);
  });
  target.addEventListener('pointerleave', () => {
    muteOthers(allFolders, folder, false);
    if (reducedMotion) { return; }
    animatePhotos(photos, false);
  });
}
