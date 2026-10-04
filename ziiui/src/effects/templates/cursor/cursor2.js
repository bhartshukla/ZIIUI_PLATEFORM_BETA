const card2 = document.getElementById('card2');
const cur2 = document.getElementById('cur2');
function moveCur2(e) {
  const r = card2.getBoundingClientRect();
  cur2.style.left = (e.clientX - r.left) + 'px';
  cur2.style.top = (e.clientY - r.top) + 'px';
}
card2.addEventListener('mousemove', moveCur2);
card2.addEventListener('mouseenter', () => cur2.classList.add('show'));
card2.addEventListener('mouseleave', () => cur2.classList.remove('show'));
