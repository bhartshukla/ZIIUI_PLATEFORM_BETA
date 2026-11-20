const projects = gsap.utils.toArray('.project');
const thumbnails = gsap.utils.toArray('.thumbnail');
const projectThumbnail = document.querySelector('.project-thumbnail');
const projectsContainer = document.querySelector('.projects');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion) {
  gsap.set(projectThumbnail, { scale: 0, xPercent: -50, yPercent: -50 });

  const xTo = gsap.quickTo(projectThumbnail, 'x', { duration: 0.4, ease: 'power3.out' });
  const yTo = gsap.quickTo(projectThumbnail, 'y', { duration: 0.4, ease: 'power3.out' });

  const onMouseMove = e => {
    xTo(e.clientX); yTo(e.clientY);
  };
  const onMouseLeave = () => {
    gsap.to(projectThumbnail, {
      scale: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto'
    });
  };

  const projectEnterHandlers = [];

  projectsContainer.addEventListener('mousemove', onMouseMove);
  projectsContainer.addEventListener('mouseleave', onMouseLeave);

  projects.forEach((project, index) => {
    const onMouseEnter = () => {
      gsap.to(projectThumbnail, {
        scale: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto'
      });
      gsap.to(thumbnails, {
        yPercent: -100 * index, duration: 0.4, ease: 'power2.out', overwrite: 'auto'
      });
    };
    project.addEventListener('mouseenter', onMouseEnter);
    projectEnterHandlers.push({ project, handler: onMouseEnter });
  });

  window.__ziiuiCleanup = () => {
    if (!reducedMotion) {
      projectsContainer.removeEventListener('mousemove', onMouseMove);
      projectsContainer.removeEventListener('mouseleave', onMouseLeave);
      projectEnterHandlers.forEach(({ project, handler }) => {
        project.removeEventListener('mouseenter', handler);
      });
      gsap.killTweensOf(projectThumbnail);
      gsap.killTweensOf(thumbnails);
    }
  };
} else {
  gsap.set(projectThumbnail, { display: 'none' });
}