if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  el.querySelectorAll('.u').forEach(u => u.classList.add('on'));
} else {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.querySelectorAll('.u').forEach(u => u.classList.add('on'));
  }));
}
