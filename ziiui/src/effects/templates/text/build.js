function build(el, text, make) {
  let i = 0;
  text.split(/(\s+)/).forEach(part => {
    if (!part) return;
    if (/^\s+$/.test(part)) { el.append(part); return; }
    const w = document.createElement('span');
    w.className = 'w';
    graphemes(part).forEach(ch => w.append(make(ch, i++)));
    el.append(w);
  });
  return i;
}
