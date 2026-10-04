const dur = 1000;
const at = (z, s, r, c) => ({
  transform: 'translateZ(' + z + 'px) scale(' + s + ') rotateY(' + r + 'deg)', color: c
});
build(el, text, ch => {
  const s = document.createElement('span');
  s.textContent = ch;
  return s;
});
const spans = el.querySelectorAll('.w span');
spans.forEach((s, i) => {
  if (!s.animate) return;
  s.animate(
    [at(0, 1, 0, '@@BASE@@'), at(@@Z@@, @@S@@, @@R@@, '@@GRAD@@'), at(0, 1, 0, '@@BASE@@')],
    { duration: dur, delay: i * dur / Math.max(spans.length, 1), iterations: Infinity, easing: 'ease-in-out' }
  );
});
