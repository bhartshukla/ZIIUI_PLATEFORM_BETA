const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const chars = graphemes(text);
const total = Math.round(1 / 0.03);
let step = 0;
let timer = null;
const stop = () => { clearInterval(timer); timer = null; };
const tick = () => {
  step++;
  const done = Math.floor(chars.length * step / total);
  el.textContent = chars.map((c, i) =>
    /\s/.test(c) || i < done ? c : glyphs[Math.floor(Math.random() * glyphs.length)]
  ).join('');
  if (step >= total) { stop(); el.textContent = text; }
};
stop();
tick();
// Reduced motion: skip the scrambling interval and show the resolved text immediately
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  stop();
  el.textContent = text;
} else {
  timer = setInterval(tick, 30);
}
window.addEventListener('pagehide', stop);
