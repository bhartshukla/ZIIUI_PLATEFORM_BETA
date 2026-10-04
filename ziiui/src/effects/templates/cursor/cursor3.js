const wrap3 = document.getElementById('wrap3');
const cur3 = document.getElementById('cur3');
function moveCur3(e) {
  const r = wrap3.getBoundingClientRect();
  cur3.style.left = (e.clientX - r.left) + 'px';
  cur3.style.top = (e.clientY - r.top) + 'px';
}
wrap3.addEventListener('mousemove', moveCur3);
wrap3.addEventListener('mouseenter', () => cur3.classList.add('show'));
wrap3.addEventListener('mouseleave', () => cur3.classList.remove('show'));
