build(el, text, (ch, i) => {
  const c = document.createElement('span');
  const a = document.createElement('i');
  const b = document.createElement('i');
  c.className = 'c';
  a.textContent = b.textContent = ch;
  a.style.transitionDelay = (i * @@A@@) + 's';
  b.style.transitionDelay = (i * @@A@@ + @@B@@) + 's';
  c.append(a, b);
  return c;
});
requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('go')));
