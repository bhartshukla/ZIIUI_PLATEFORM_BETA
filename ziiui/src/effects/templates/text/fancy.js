const rnd = () => `#${  Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let i = 0;
text.split(/(\s+)/).forEach(part => {
  if (!part) {return;}
  if (/^\s+$/.test(part)) { el.append(part); return; }
  const s = document.createElement('span');
  s.textContent = part;
  el.append(s);
  if (!s.animate) {return;}
  if (reducedMotion) {
    // Skip animation — show final static state (opacity 1, no transform)
    s.style.opacity = '1';
    s.style.transform = 'none';
    return;
  }
  s.animate([
    { opacity: 0, color: rnd(), transform: `translateY(${  Math.random() * 100 - 50  }px) rotate(${  Math.random() * 90 - 45  }deg) scale(.3)` },
    { opacity: 1, color: rnd(), transform: 'none' }
  ], { duration: 700, delay: i++ * 50, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
});
