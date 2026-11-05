/* Entry point for docs.html — collapsible sidebar, mobile drawer, theme toggle, scroll-spy. */
import { copyText } from '../lib/clipboard.js';
import { applyThemeIcon, toggleTheme } from '../lib/theme.js';

/* ---------- Year ---------- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Theme toggle ---------- */
applyThemeIcon();
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

/* ---------- Mobile drawer ---------- */
const menuToggle = document.getElementById('menuToggle');
const sidePanel = document.getElementById('sidePanel');
const sideOverlay = document.getElementById('sideOverlay');
const sideClose = document.getElementById('sideClose');

function openDrawer() {
  sidePanel && sidePanel.classList.add('open');
  sideOverlay && sideOverlay.classList.add('open');
  menuToggle && menuToggle.setAttribute('aria-expanded', 'true');
}
function closeDrawer() {
  sidePanel && sidePanel.classList.remove('open');
  sideOverlay && sideOverlay.classList.remove('open');
  menuToggle && menuToggle.setAttribute('aria-expanded', 'false');
}
if (menuToggle) menuToggle.addEventListener('click', openDrawer);
if (sideClose) sideClose.addEventListener('click', closeDrawer);
if (sideOverlay) sideOverlay.addEventListener('click', closeDrawer);

/* ---------- Sidebar collapsible categories ---------- */
document.querySelectorAll('[data-toggle]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    var targetId = btn.getAttribute('aria-controls');
    var target = document.getElementById(targetId);
    btn.setAttribute('aria-expanded', String(!expanded));
    if (target) target.hidden = expanded;
  });
});

/* ---------- Active link highlighting (scroll spy) ---------- */
(function () {
  var links = Array.from(document.querySelectorAll('.sidebar__link, .toc__list a'));
  var sections = links
    .map(function (link) {
      var href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) return null;
      var id = href.slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (!('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        links.forEach(function (link) {
          var match = link.getAttribute('href') === '#' + id;
          link.classList.toggle('is-active', match);
        });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  sections.forEach(function (section) { observer.observe(section); });
})();

/* ---------- Code copy buttons ---------- */
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', async function () {
    var target = document.querySelector(btn.dataset.copy);
    if (!target) return;
    var original = btn.innerHTML;
    try {
      var copied = await copyText(target.innerText);
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
      var name = tab.dataset.tab;
      tabs.querySelectorAll('.tab').forEach(function (t) {
        var active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
      });
      var panel = tabs.parentElement;
      panel.querySelectorAll('.tabpanel').forEach(function (p) {
        p.hidden = p.id !== 'tab-' + name;
      });
    });
  });
});

/* ---------- Sidebar search ---------- */
var docsSearch = document.getElementById('docsSearch');
if (docsSearch) {
  docsSearch.addEventListener('input', function () {
    var q = docsSearch.value.trim().toLowerCase();
    document.querySelectorAll('.sidebar__link').forEach(function (link) {
      var text = link.textContent.toLowerCase();
      var li = link.closest('li');
      if (li) li.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    });
  });
}

/* ---------- Back to top ---------- */
var backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', function () {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: top, behavior: 'smooth' });
    history.replaceState(null, '', '#' + id);
    closeDrawer();
  });
});
