build(el, text, (ch, i) => {
  const s = document.createElement('span');
  s.className = 'u';
  s.style.setProperty('--i', i);
  s.textContent = ch;
  return s;
});
