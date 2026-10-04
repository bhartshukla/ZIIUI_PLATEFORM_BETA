const rnd = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
let i = 0;
text.split(/(\s+)/).forEach(part => {
  if (!part) return;
  if (/^\s+$/.test(part)) { el.append(part); return; }
  const s = document.createElement('span');
  s.textContent = part;
  el.append(s);
  if (!s.animate) return;
  s.animate([
    { opacity: 0, color: rnd(), transform: 'translateY(' + (Math.random() * 100 - 50) + 'px) rotate(' + (Math.random() * 90 - 45) + 'deg) scale(.3)' },
    { opacity: 1, color: rnd(), transform: 'none' }
  ], { duration: 700, delay: i++ * 50, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
});
