const el = document.getElementById('t');
const text = el.textContent;

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  el.textContent = '';
@@BODY@@
}
