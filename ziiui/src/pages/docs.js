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
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

/* ---------- Theme toggle ---------- */
applyThemeIcon();
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', toggleTheme);
}

/* ---------- Mobile drawer ---------- */
const docsMenuToggle = document.getElementById('docsMenuToggle');
const sidePanel = document.getElementById('sidePanel');
const sideOverlay = document.getElementById('sideOverlay');
const sideClose = document.getElementById('sideClose');

function openDrawer() {
  if (sidePanel) sidePanel.classList.add('open');
  if (sideOverlay) sideOverlay.classList.add('open');
  if (docsMenuToggle) docsMenuToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  if (sidePanel) sidePanel.classList.remove('open');
  if (sideOverlay) sideOverlay.classList.remove('open');
  if (docsMenuToggle) docsMenuToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

if (docsMenuToggle) { docsMenuToggle.addEventListener('click', openDrawer); }
if (sideClose) { sideClose.addEventListener('click', closeDrawer); }
if (sideOverlay) { sideOverlay.addEventListener('click', closeDrawer); }

/* Escape key to close mobile drawer */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && sidePanel && sidePanel.classList.contains('open')) {
    closeDrawer();
  }
});

/* ---------- Sidebar collapsible categories ---------- */
document.querySelectorAll('[data-toggle]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const targetId = btn.getAttribute('aria-controls');
    const target = document.getElementById(targetId);
    btn.setAttribute('aria-expanded', String(!expanded));
    if (target) { target.hidden = expanded; }
    const icon = btn.querySelector('i');
    if (icon) { icon.style.transform = !expanded ? 'rotate(0deg)' : 'rotate(-90deg)'; }
  });
});

/* Helper escape */
function escText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- Right TOC: Enhance or generate from actual H2 headings ---------- */
(function () {
  const tocList = document.querySelector('.toc__list');
  const main = document.getElementById('main');
  if (!tocList || !main) { return; }

  // If tocList is empty, dynamically populate from major sections/headings
  if (tocList.children.length === 0) {
    const headings = Array.from(main.querySelectorAll('h2[id]'));
    if (headings.length) {
      let html = '';
      headings.forEach(function (h) {
        html += `<li><a class="toc__link" href="#${h.id}">${escText(h.textContent)}</a></li>`;
      });
      tocList.innerHTML = html;
    }
  }
})();

/* ---------- Active link highlighting (scroll spy) ---------- */
(function () {
  const links = Array.from(document.querySelectorAll('.sidebar__link, .toc__link, .toc__list a'));
  const targets = links
    .map(function (link) {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#') || href === '#top') { return null; }
      const id = href.slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (!('IntersectionObserver' in window) || !targets.length) { return; }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(function (link) {
          const href = link.getAttribute('href') || '';
          link.classList.toggle('is-active', href === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-10% 0px -75% 0px', threshold: 0 });

  targets.forEach(function (target) { observer.observe(target); });
})();

/* ---------- Code copy buttons ---------- */
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', async function () {
    const target = document.querySelector(btn.dataset.copy);
    if (!target) { return; }
    const original = btn.innerHTML;
    try {
      const copied = await copyText(target.innerText || target.textContent);
      btn.innerHTML = copied
        ? '<i class="ri-check-line" aria-hidden="true"></i> Copied'
        : '<i class="ri-error-warning-line" aria-hidden="true"></i> Failed';
    } catch (err) {
      console.error('[ziiui:docs-copy]', err);
      btn.innerHTML = '<i class="ri-error-warning-line" aria-hidden="true"></i> Failed';
    }
    setTimeout(function () { btn.innerHTML = original; }, 1600);
  });
});

/* ---------- Sidebar search ---------- */
(function () {
  const docsSearch = document.getElementById('docsSearch');
  const clearBtn = document.getElementById('docsSearchClear');
  if (!docsSearch) { return; }

  const groups = Array.from(document.querySelectorAll('.sidebar__group'));
  const allLinks = Array.from(document.querySelectorAll('.sidebar__link'));

  const index = allLinks.map(function (link) {
    return { el: link, href: link.getAttribute('href'), text: link.textContent.trim() };
  });

  Array.from(document.querySelectorAll('#main h1[id], #main h2[id], #main h3[id]')).forEach(function (h) {
    index.push({ el: h, href: `#${h.id}`, text: h.textContent.trim() });
  });

  function setClearVisibility() {
    if (clearBtn) { clearBtn.hidden = !(docsSearch.value.trim().length > 0); }
  }

  docsSearch.addEventListener('input', function () {
    setClearVisibility();
    const q = docsSearch.value.trim().toLowerCase();
    allLinks.forEach(function (link) {
      const text = link.textContent.toLowerCase();
      const li = link.closest('li');
      const show = !q || text.indexOf(q) !== -1;
      if (li) { li.style.display = show ? '' : 'none'; }
    });

    groups.forEach(function (group) {
      const linksInGroup = group.querySelectorAll('.sidebar__link');
      if (!linksInGroup.length) return;
      const visible = Array.from(linksInGroup).some(l => {
        const li = l.closest('li');
        return li && li.style.display !== 'none';
      });
      group.style.display = visible || !q ? '' : 'none';
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
      if (!q) { return; }
      const match = index.find(function (item) {
        const li = item.el.closest && item.el.closest('li');
        const visible = li ? li.style.display !== 'none' : true;
        return visible && item.text.toLowerCase().indexOf(q) !== -1;
      });
      if (!match) { return; }
      const id = match.href.slice(1);
      const target = document.getElementById(id);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: scrollBehavior() });
        history.replaceState(null, '', `#${id}`);
      }
      closeDrawer();
    }
  });
})();

/* ---------- Previous / Next section navigation ---------- */
(function () {
  const container = document.getElementById('main');
  if (!container) { return; }
  const h2s = Array.from(container.querySelectorAll('h2[id]'));
  if (h2s.length < 2) { return; }

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
      prevLink.href = `#${p.id}`;
      prevLink.innerHTML = `<span class="prev-next__arrow">&#8592;</span><span class="prev-next__title"><span class="prev-next__dir">Previous</span><span class="prev-next__text">${escText(p.textContent)}</span></span>`;
    }
    if (index >= 0 && index < h2s.length - 1) {
      const n = h2s[index + 1];
      nextLink.href = `#${n.id}`;
      nextLink.innerHTML = `<span class="prev-next__title"><span class="prev-next__dir">Next</span><span class="prev-next__text">${escText(n.textContent)}</span></span><span class="prev-next__arrow">&#8594;</span>`;
    }
  }

  update();
  window.addEventListener('scroll', update);
  prevLink.addEventListener('click', function (e) { e.preventDefault(); jump(prevLink.href); });
  nextLink.addEventListener('click', function (e) { e.preventDefault(); jump(nextLink.href); });
})();

function jump(href) {
  const id = href.split('#')[1];
  if (!id) { return; }
  const target = document.getElementById(id);
  if (!target) { return; }
  const top = target.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: scrollBehavior() });
  history.replaceState(null, '', `#${id}`);
  closeDrawer();
}

/* ---------- Back to top button ---------- */
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', function () {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  });
}

const tocBackToTop = document.getElementById('tocBackToTop');
if (tocBackToTop) {
  tocBackToTop.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    history.replaceState(null, '', '#top');
  });
}

/* Smooth anchor clicks offset */
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    const id = a.getAttribute('href').slice(1);
    if (!id || id === 'top') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
      history.replaceState(null, '', '#top');
      closeDrawer();
      return;
    }
    const target = document.getElementById(id);
    if (!target) { return; }
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: scrollBehavior() });
    history.replaceState(null, '', `#${id}`);
    closeDrawer();
  });
});
