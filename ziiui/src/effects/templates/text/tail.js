requestAnimationFrame(() => requestAnimationFrame(() => {
  el.querySelectorAll('.u').forEach(u => u.classList.add('on'));
}));
