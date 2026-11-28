(function () {
  const $ = (i) => document.getElementById(i);
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add(reduce ? 'rm' : 'anim');

  /* ZiiUI-branded geometric artwork drawn in the page's own amber + teal */
  function art(v) {
    const h = 520 + v * 40;
    const cx = 800 + v * 220;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><rect width="1600" height="900" fill="#0A0C0E"/>';
    for (let k = 0; k < 5; k++) {
      s += `<rect y="${h - 340 + k * 66}" width="1600" height="66" fill="#2E6B72" opacity="${0.03 + k * 0.03}"/>`;
    }
    s += `<circle cx="${cx}" cy="${h - 30}" r="150" fill="#E8913C"/>`;
    s += `<rect y="${h}" width="1600" height="400" fill="#0d1c1f"/>`;
    for (let i = 0; i < 14; i++) {
      const w = 300 - i * 19;
      s += `<rect x="${cx - w / 2}" y="${h + 8 + i * 22}" width="${w}" height="7" fill="#E8913C" opacity="${0.8 - i * 0.05}"/>`;
      s += `<rect x="0" y="${h + 20 + i * 26}" width="1600" height="2" fill="#2E6B72" opacity=".55"/>`;
    }
    return `url("data:image/svg+xml,${encodeURIComponent(`${s}</svg>`)}")`;
  }
  $('himg').style.backgroundImage = art(0);

  const hero = $('hero');
  const ta = $('ta');
  const tb = $('tb');
  const title = $('title');

  function clamp(x) {
    return Math.max(0, Math.min(1, x));
  }

  /* Everything is bound to scroll position, so it plays in reverse on the way back up */
  function portal() {
    const p = reduce ? 1 : clamp(-hero.getBoundingClientRect().top / (hero.offsetHeight - innerHeight));

    // panels part outward past the frame
    $('pl').style.transform = `translateX(${-p * 105}%)`;
    $('pr').style.transform = `translateX(${p * 105}%)`;

    // image settles from overscale; duotone wash rises
    $('himg').style.transform = `scale(${1.18 - 0.18 * p})`;
    $('wash').style.opacity = 0.4 * p;

    // dots travel to opposite corners
    $('d1').style.transform = `translate(${-p * 44}vw,${-p * 34}vh)`;
    $('d2').style.transform = `translate(${p * 44}vw,${p * 34}vh)`;

    // wordmark: grows AND tightens, halves travel to opposite edges
    title.style.transform = `scale(${1 + 0.22 * p})`;
    title.style.letterSpacing = `${0.02 - 0.075 * p}em`;
    ta.style.transform = `translateX(${-p * ta.offsetWidth * 0.65}px)`;
    tb.style.transform = `translateX(${p * tb.offsetWidth * 0.65}px)`;
  }

  let tick = false;
  function onScroll() {
    if (tick) {
      return;
    }
    tick = true;
    requestAnimationFrame(() => {
      portal();
      tick = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (document.fonts) {
    document.fonts.ready.then(onScroll);
  }
  portal();

  window.__ziiuiCleanup = () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
  };
})();
