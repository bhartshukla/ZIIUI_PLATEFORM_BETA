/* Entry point for docs.html — collapsible sidebar, mobile drawer, theme toggle, scroll-spy, auto TOC, search, prev/next. */
import { copyText } from '../lib/clipboard.js';
import { applyThemeIcon, toggleTheme } from '../lib/theme.js';

/* ---------- Reduced motion ---------- */
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function scrollBehavior() {
  return prefersReducedMotion ? 'auto' : 'smooth';
}

/* ---------- Year ---------- */
const yearEl = document.getElementById('year');
if (yearEl) {yearEl.textContent = new Date().getFullYear();}

/* ---------- Theme toggle ---------- */
applyThemeIcon();
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {themeBtn.addEventListener('click', toggleTheme);}

/* ---------- Mobile drawer ---------- */
const docsMenuToggle = document.getElementById('docsMenuToggle');
if (docsMenuToggle) {docsMenuToggle.addEventListener('click', openDrawer);}
const menuToggle = docsMenuToggle;
const sidePanel = document.getElementById('sidePanel');
const sideOverlay = document.getElementById('sideOverlay');
const sideClose = document.getElementById('sideClose');

function openDrawer() {
  sidePanel && sidePanel.classList.add('open');
  sideOverlay && sideOverlay.classList.add('open');
  menuToggle && menuToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  sidePanel && sidePanel.classList.remove('open');
  sideOverlay && sideOverlay.classList.remove('open');
  menuToggle && menuToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
if (menuToggle) {menuToggle.addEventListener('click', openDrawer);}
if (sideClose) {sideClose.addEventListener('click', closeDrawer);}
if (sideOverlay) {sideOverlay.addEventListener('click', closeDrawer);}

/* ---------- Sidebar collapsible categories ---------- */
document.querySelectorAll('[data-toggle]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const targetId = btn.getAttribute('aria-controls');
    const target = document.getElementById(targetId);
    btn.setAttribute('aria-expanded', String(!expanded));
    if (target) {target.hidden = expanded;}
    const icon = btn.querySelector('i');
    if (icon) {icon.style.transform = !expanded ? 'rotate(0deg)' : 'rotate(-90deg)';}
  });
});

/* ---------- Right TOC: generate from actual H2/H3 headings ---------- */
(function () {
  const tocList = document.querySelector('.toc__list');
  const main = document.getElementById('main');
  if (!tocList || !main) {return;}

  const headings = Array.from(main.querySelectorAll('h2[id], h3[id]'));
  if (!headings.length) { tocList.style.display = 'none'; return; }

  let html = '';
  let currentH2 = null;
  headings.forEach(function (h) {
    if (h.tagName === 'H2') {
      currentH2 = h;
      html += `<li><a class="toc__link" href="#${  h.id  }" data-level="2">${  escText(h.textContent)  }</a></li>`;
    } else if (h.tagName === 'H3' && currentH2) {
      html += `<li style="padding-left:0.9rem"><a class="toc__link" href="#${  h.id  }" data-level="3" style="font-size:0.74rem; opacity:.75">${  escText(h.textContent)  }</a></li>`;
    }
  });
  tocList.innerHTML = html;
})();

function escText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- Active link highlighting (scroll spy) ---------- */
(function () {
  const links = Array.from(document.querySelectorAll('.sidebar__link, .toc__link'));
  const sections = links
    .map(function (link) {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) {return null;}
      const id = href.slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (!('IntersectionObserver' in window) || !sections.length) {return;}

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${  id}`);
        });
      }
    });
  }, { rootMargin: '-24% 0px -72% 0px', threshold: 0 });

  sections.forEach(function (section) { observer.observe(section); });
})();

/* ---------- Code copy buttons ---------- */
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', async function () {
    const target = document.querySelector(btn.dataset.copy);
    if (!target) {return;}
    const original = btn.innerHTML;
    try {
      const copied = await copyText(target.innerText);
      btn.innerHTML = copied
        ? '<i class="ri-check-line" aria-hidden="true"></i> Copied'
        : '<i class="ri-error-warning-line" aria-hidden="true"></i> Copy failed';
    } catch (err) {
      console.error('[ziiui:docs-copy]', err);
      btn.innerHTML = '<i class="ri-error-warning-line" aria-hidden="true"></i> Copy failed';
    }
    setTimeout(function () { btn.innerHTML = original; }, 1600);
  });
});

/* ---------- Tabs ---------- */
document.querySelectorAll('.tabs').forEach(function (tabs) {
  tabs.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      const name = tab.dataset.tab;
      tabs.querySelectorAll('.tab').forEach(function (t) {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
      });
      const panel = tabs.parentElement;
      panel.querySelectorAll('.tabpanel').forEach(function (p) {
        p.hidden = p.id !== `tab-${  name}`;
      });
    });
  });
});

/* ---------- Sidebar search ---------- */
(function () {
  const docsSearch = document.getElementById('docsSearch');
  const clearBtn = document.getElementById('docsSearchClear');
  if (!docsSearch) {return;}

  const groups = Array.from(document.querySelectorAll('.sidebar__group'));
  const allLinks = Array.from(document.querySelectorAll('.sidebar__link'));

  // Search index: sidebar links (sections + component names) and the page's own
  // headings, so results cover actual documentation content.
  const index = allLinks.map(function (link) {
    return { el: link, href: link.getAttribute('href'), text: link.textContent.trim() };
  });
  Array.from(document.querySelectorAll('#main h1[id], #main h2[id], #main h3[id]')).forEach(function (h) {
    index.push({ el: h, href: `#${  h.id}`, text: h.textContent.trim() });
  });

  function setClearVisibility() {
    if (clearBtn) {clearBtn.hidden = !(docsSearch.value.trim().length > 0);}
  }

  docsSearch.addEventListener('input', function () {
    setClearVisibility();
    const q = docsSearch.value.trim().toLowerCase();
    allLinks.forEach(function (link) {
      const text = link.textContent.toLowerCase();
      const li = link.closest('li');
      const show = !q || text.indexOf(q) !== -1;
      if (li) {li.style.display = show ? '' : 'none';}
    });
    groups.forEach(function (group) {
      const visible = group.querySelectorAll('.sidebar__link').length >
        group.querySelectorAll('.sidebar__link[style*="display: none"]').length;
      const toggle = group.querySelector('[data-toggle]');
      if (toggle && !q) {toggle.parentElement.style.display = '';}
      group.style.display = visible || !q ? '' : 'none';
      if (toggle) {toggle.hidden = !visible && !!q ? false : toggle.hidden;}
      if (q && visible) {toggle && toggle.setAttribute('aria-expanded', 'true');}
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      docsSearch.value = '';
      docsSearch.dispatchEvent(new Event('input', { bubbles: true }));
      docsSearch.focus();
    });
  }

  docsSearch.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = docsSearch.value.trim().toLowerCase();
      if (!q) {return;}
      const match = index.find(function (item) {
        const li = item.el.closest && item.el.closest('li');
        const visible = li ? li.style.display !== 'none' : true;
        return visible && item.text.toLowerCase().indexOf(q) !== -1;
      });
      if (!match) {return;}
      const group = match.el.closest('.sidebar__group');
      const toggle = group && group.querySelector('[data-toggle]');
      if (toggle) {toggle.setAttribute('aria-expanded', 'true');}
      const id = match.href.slice(1);
      const target = document.getElementById(id);
      if (target) {
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: scrollBehavior() });
        history.replaceState(null, '', `#${  id}`);
      }
      closeDrawer();
    }
  });
})();

/* ---------- Previous / Next section navigation ---------- */
(function () {
  const container = document.getElementById('main');
  if (!container) {return;}
  const h2s = Array.from(container.querySelectorAll('h2[id]'));
  if (h2s.length < 2) {return;}

  const nav = document.createElement('nav');
  nav.className = 'prev-next';
  nav.setAttribute('aria-label', 'Documentation section navigation');
  nav.innerHTML =
    '<div class="prev-next__inner">' +
    '  <a class="prev-next__link prev-next__link--prev" href="#" style="display:none"></a>' +
    '  <a class="prev-next__link prev-next__link--next" href="#" style="display:none"></a>' +
    '</div>';
  container.appendChild(nav);

  const prevLink = nav.querySelector('.prev-next__link--prev');
  const nextLink = nav.querySelector('.prev-next__link--next');

  function update() {
    const scrollY = window.scrollY + 72 + 60;
    let index = -1;
    h2s.forEach(function (h, i) {
      const top = h.getBoundingClientRect().top + window.scrollY;
      if (top <= scrollY) { index = i; }
    });
    prevLink.style.display = index > 0 ? '' : 'none';
    nextLink.style.display = index >= 0 && index < h2s.length - 1 ? '' : 'none';
    if (index > 0) {
      const p = h2s[index - 1];
      prevLink.href = `#${  p.id}`;
      prevLink.innerHTML = `<span class="prev-next__arrow">&#8592;</span><span class="prev-next__title"><span class="prev-next__dir">Previous</span><span class="prev-next__text">${  escText(p.textContent)  }</span></span>`;
    }
    if (index >= 0 && index < h2s.length - 1) {
      const n = h2s[index + 1];
      nextLink.href = `#${  n.id}`;
      nextLink.innerHTML = `<span class="prev-next__title"><span class="prev-next__dir">Next</span><span class="prev-next__text">${  escText(n.textContent)  }</span></span><span class="prev-next__arrow">&#8594;</span>`;
    }
  }

  update();
  window.addEventListener('scroll', update);
  prevLink.addEventListener('click', function (e) { e.preventDefault(); jump(prevLink.href); });
  nextLink.addEventListener('click', function (e) { e.preventDefault(); jump(nextLink.href); });
})();

function jump(href) {
  const id = href.split('#')[1];
  if (!id) {return;}
  const target = document.getElementById(id);
  if (!target) {return;}
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: scrollBehavior() });
  history.replaceState(null, '', `#${  id}`);
  closeDrawer();
}

/* ---------- Back to top ---------- */
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', function () {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  });
}

document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    const id = a.getAttribute('href').slice(1);
    if (!id) {return;}
    const target = document.getElementById(id);
    if (!target) {return;}
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: scrollBehavior() });
    history.replaceState(null, '', `#${  id}`);
    closeDrawer();
  });
});
