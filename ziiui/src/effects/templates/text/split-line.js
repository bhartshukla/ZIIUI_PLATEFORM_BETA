text.split('\n').forEach((part, i) => {
  const s = document.createElement('span');
  s.className = 'u';
  s.style.setProperty('--i', i);
  s.textContent = part;
  el.append(s);
});
