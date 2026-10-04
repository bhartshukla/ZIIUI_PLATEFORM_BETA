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
timer = setInterval(tick, 30);
window.addEventListener('pagehide', stop);
