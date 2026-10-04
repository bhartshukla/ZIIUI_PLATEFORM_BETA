/* Sidebar: grouped effect list, search, mobile drawer, AI lock. */
import { $ } from '../../lib/dom.js';
import { EFFECTS, CATEGORIES, BY_ID } from '../../effects/registry.js';

export function buildNav(onSelect) {
  const nav = $('nav');
  if (!nav) return;
  nav.innerHTML = '';
  CATEGORIES.forEach((c) => {
    const list = EFFECTS.filter((e) => e.cat === c);
    if (!list.length) return;

    const g = document.createElement('div');
    g.className = 'grp';
    g.setAttribute('role', 'group');
    g.setAttribute('aria-labelledby', 'gl-' + c);

    const h = document.createElement('button');
    h.type = 'button';
    h.className = 'gl';
    h.id = 'gl-' + c;
    h.setAttribute('aria-expanded', 'true');
    h.setAttribute('aria-controls', 'gitems-' + c);
    const chev = document.createElement('i');
    chev.className = 'ri-arrow-down-s-line gl-chev';
    chev.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'gl-label';
    label.textContent = c;
    const cnt = document.createElement('span');
    cnt.className = 'gl-count';
    cnt.textContent = list.length;
    cnt.setAttribute('aria-hidden', 'true');
    h.append(chev, label, cnt);

    const items = document.createElement('div');
    items.className = 'items';
    items.id = 'gitems-' + c;
    list.forEach((e) => {
      const b = document.createElement('button');
      const n = document.createElement('span');
      b.type = 'button';
      b.dataset.id = e.id;
      n.className = 'nm';
      n.textContent = e.cat === 'Cursor' ? e.name.replace(/^Cursor:\s*/, '') : e.name;
      b.append(n);
      b.title = e.name + ' — ' + e.note;
      b.addEventListener('click', () => onSelect(e, true));
      items.append(b);
    });

    h.addEventListener('click', () => {
      const collapsed = g.classList.toggle('collapsed');
      h.setAttribute('aria-expanded', String(!collapsed));
      chev.className = (collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line') + ' gl-chev';
    });
    g.append(h, items);
    nav.append(g);
  });

  // Roving focus: arrows / Home / End move between visible effects.
  nav.addEventListener('keydown', (ev) => {
    const k = ev.key;
    const btns = [...nav.querySelectorAll('button[data-id]')].filter((b) => b.offsetParent !== null);
    let i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    if (k === 'Home') i = 0;
    else if (k === 'End') i = btns.length - 1;
    else if (k === 'ArrowDown' || k === 'ArrowRight') i = (i + 1) % btns.length;
    else if (k === 'ArrowUp' || k === 'ArrowLeft') i = (i - 1 + btns.length) % btns.length;
    else return;
    ev.preventDefault();
    btns[i].focus();
  });
}

/** Highlight the selected effect in the sidebar. */
export function markCurrent(effect, scrollIntoView) {
  const nav = $('nav');
  if (!nav) return;
  nav.querySelectorAll('button[data-id]').forEach((b) => {
    if (b.dataset.id === effect.id) {
      b.setAttribute('aria-current', 'true');
      if (scrollIntoView && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else {
      b.removeAttribute('aria-current');
    }
  });
}

export function applySearch() {
  const input = $('searchInput'), sideEmpty = $('sideEmpty'), nav = $('nav');
  if (!input || !nav) return;
  const q = input.value.trim().toLowerCase();
  let groupsShown = 0;
  nav.querySelectorAll('.grp').forEach((grp) => {
    let anyVisible = false;
    grp.querySelectorAll('button[data-id]').forEach((btn) => {
      const e = BY_ID[btn.dataset.id];
      if (!e) return;
      const match = !q || [e.name, e.note, e.cat].some((s) => s.toLowerCase().includes(q));
      btn.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });
    grp.style.display = anyVisible ? '' : 'none';
    if (anyVisible) groupsShown++;
    if (q && anyVisible) {
      grp.classList.remove('collapsed');
      const head = grp.querySelector('.gl');
      const chev = grp.querySelector('.gl-chev');
      if (head) head.setAttribute('aria-expanded', 'true');
      if (chev) chev.className = 'ri-arrow-down-s-line gl-chev';
    }
  });
  if (sideEmpty) sideEmpty.classList.toggle('show', groupsShown === 0 && !!q);
}

export function openSidebar() {
  const s = $('sidePanel'), o = $('sideOverlay'), m = $('menuToggle');
  if (!s || !o) return;
  s.classList.add('open');
  o.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (m) m.setAttribute('aria-expanded', 'true');
}

export function closeSidebar() {
  const s = $('sidePanel'), o = $('sideOverlay'), m = $('menuToggle');
  if (!s || !o) return;
  s.classList.remove('open');
  o.classList.remove('active');
  document.body.style.overflow = '';
  if (m) m.setAttribute('aria-expanded', 'false');
}

/** Disable navigation + search while an AI request is running. */
export function setNavigationLocked(locked) {
  const nav = $('nav');
  if (nav) {
    nav.classList.toggle('locked', !!locked);
    nav.querySelectorAll('button[data-id], .gl').forEach((b) => { b.disabled = !!locked; });
  }
  const search = $('searchInput');
  if (search) search.disabled = !!locked;
  const banner = $('aiLockBanner');
  if (banner) banner.hidden = !locked;
}
