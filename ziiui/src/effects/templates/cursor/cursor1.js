const wrap1 = document.getElementById('wrap1');
const cur1 = document.getElementById('cur1');
const img1 = document.getElementById('img1');
function moveCur1(e) {
  const r = wrap1.getBoundingClientRect();
  cur1.style.left = (e.clientX - r.left) + 'px';
  cur1.style.top = (e.clientY - r.top) + 'px';
}
wrap1.addEventListener('mousemove', moveCur1);
wrap1.addEventListener('mouseenter', () => cur1.classList.add('show'));
wrap1.addEventListener('mouseleave', () => { cur1.classList.remove('show'); cur1.classList.remove('wide'); });
img1.addEventListener('mouseenter', () => cur1.classList.add('wide'));
img1.addEventListener('mouseleave', () => cur1.classList.remove('wide'));
