let i = 0;
text.split(/(\s+)/).forEach(part => {
  if (!part) return;
  if (/^\s+$/.test(part)) { el.append(part); return; }
  const s = document.createElement('span');
  s.className = 'u';
  s.style.setProperty('--i', i++);
  s.textContent = part;
  el.append(s);
});
