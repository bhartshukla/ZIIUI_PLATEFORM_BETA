/* Category navigation, searchable component list, and mobile drawer. */
import { $ } from '../../lib/dom.js';
import { EFFECTS, CATEGORIES } from '../../effects/registry.js';

const CATEGORY_ICONS = {
  All: 'ri-apps-2-line',
  Web: 'ri-layout-4-line',
  Interactive: 'ri-cursor-line',
  Footer: 'ri-layout-bottom-line',
  Text: 'ri-font-size-2',
  Cursor: 'ri-mouse-line',
  Scroll: 'ri-scroll-to-bottom-line',
  Shader: 'ri-contrast-2-line'
};

let onSelectEffect = null;
let activeCategory = 'All';
let displayEffects = [...EFFECTS];

function searchQuery() {
  const input = $('searchInput');
  return input ? input.value.trim().toLowerCase() : '';
}

function matchesSearch(effect, query) {
  return !query || [effect.name, effect.note, effect.cat]
    .some((value) => String(value || '').toLowerCase().includes(query));
}

function renderCategories() {
  const filters = $('categoryFilters');
  if (!filters) return;
  filters.replaceChildren();

  ['All', ...CATEGORIES].forEach((category) => {
    const count = category === 'All'
      ? EFFECTS.length
      : EFFECTS.filter((effect) => effect.cat === category).length;
    if (!count) return;

    const button = document.createElement('button');
    const icon = document.createElement('i');
    const label = document.createElement('span');
    const total = document.createElement('span');
    button.type = 'button';
    button.className = 'category-filter';
    button.dataset.category = category;
    button.setAttribute('aria-pressed', String(category === activeCategory));
    icon.className = CATEGORY_ICONS[category] || 'ri-shapes-line';
    icon.setAttribute('aria-hidden', 'true');
    label.textContent = category;
    total.className = 'category-count';
    total.textContent = String(count);
    total.setAttribute('aria-hidden', 'true');
    button.append(icon, label, total);
    button.addEventListener('click', () => {
      activeCategory = category;
      filters.querySelectorAll('.category-filter').forEach((filter) => {
        filter.setAttribute('aria-pressed', String(filter.dataset.category === activeCategory));
      });
      renderList();
    });
    filters.append(button);
  });
}

function makeEffectButton(effect, index) {
  const button = document.createElement('button');
  const name = document.createElement('span');
  const number = document.createElement('span');
  button.type = 'button';
  button.className = 'component-link';
  button.dataset.id = effect.id;
  button.setAttribute('aria-current', 'false');
  name.className = 'component-link-name';
  name.textContent = effect.cat === 'Cursor' ? effect.name.replace(/^Cursor:\s*/, '') : effect.name;
  number.className = 'component-link-number';
  number.textContent = String(index).padStart(2, '0');
  number.setAttribute('aria-hidden', 'true');
  button.title = effect.name + ' — ' + effect.note;
  button.append(name, number);
  button.addEventListener('click', () => {
    if (onSelectEffect) onSelectEffect(effect, true);
  });
  return button;
}

function renderList() {
  const nav = $('nav');
  const empty = $('catalogEmpty');
  const count = $('catalogCount');
  if (!nav) return;

  const query = searchQuery();
  const visible = displayEffects.filter((effect) =>
    (activeCategory === 'All' || effect.cat === activeCategory) &&
    matchesSearch(effect, query)
  );
  nav.replaceChildren();

  CATEGORIES.forEach((category) => {
    if (activeCategory !== 'All' && activeCategory !== category) return;
    const effects = visible.filter((effect) => effect.cat === category);
    if (!effects.length) return;

    const group = document.createElement('section');
    const heading = document.createElement('h3');
    const label = document.createElement('span');
    const total = document.createElement('span');
    const list = document.createElement('div');
    group.className = 'component-group';
    group.dataset.category = category;
    heading.className = 'component-group-heading';
    label.textContent = category;
    total.className = 'component-group-count';
    total.textContent = String(effects.length).padStart(2, '0');
    total.setAttribute('aria-hidden', 'true');
    heading.append(label, total);
    list.className = 'component-group-list';
    effects.forEach((effect) => {
      list.append(makeEffectButton(effect, EFFECTS.indexOf(effect) + 1));
    });
    group.append(heading, list);
    nav.append(group);
  });

  if (empty) empty.hidden = visible.length !== 0;
  if (count) {
    const label = activeCategory === 'All' ? 'All components' : `${activeCategory} components`;
    count.textContent = `${visible.length} ${label}`;
  }
}

export function buildNav(onSelect) {
  onSelectEffect = onSelect;
  const total = $('catalogTotal');
  if (total) total.textContent = `${EFFECTS.length} components`;
  renderCategories();
  renderList();

  const nav = $('nav');
  if (nav) {
    nav.addEventListener('keydown', (event) => {
      const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      const buttons = [...nav.querySelectorAll('.component-link:not(:disabled)')];
      const current = buttons.indexOf(document.activeElement);
      if (current < 0 || !buttons.length) return;
      event.preventDefault();
      let next = current;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === 'ArrowDown') next = Math.min(buttons.length - 1, current + 1);
      else if (event.key === 'ArrowUp') next = Math.max(0, current - 1);
      buttons[next].focus();
    });
  }

}

export function markCurrent(effect, scrollIntoView) {
  const nav = $('nav');
  if (!nav) return;
  nav.querySelectorAll('.component-link').forEach((button) => {
    const selected = button.dataset.id === effect.id;
    if (selected) {
      button.setAttribute('aria-current', 'true');
      if (scrollIntoView && button.scrollIntoView) button.scrollIntoView({ block: 'nearest' });
    } else {
      button.setAttribute('aria-current', 'false');
    }
  });
}

export function applySearch() {
  renderList();
}

export function shuffleComponents() {
  CATEGORIES.forEach((category) => {
    const group = displayEffects.filter((effect) => effect.cat === category);
    for (let index = group.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [group[index], group[swapIndex]] = [group[swapIndex], group[index]];
    }
    const queue = [...group];
    displayEffects = displayEffects.map((effect) =>
      effect.cat === category ? queue.shift() : effect
    );
  });
  renderList();
}

export function openSidebar() {
  const side = $('sidePanel');
  const overlay = $('sideOverlay');
  const toggle = $('menuToggle');
  if (!side || !overlay) return;
  side.classList.add('open');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
}

export function closeSidebar() {
  const side = $('sidePanel');
  const overlay = $('sideOverlay');
  const toggle = $('menuToggle');
  if (!side || !overlay) return;
  side.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

/** Disable component selection and search while an AI request is running. */
export function setNavigationLocked(locked) {
  const nav = $('nav');
  if (nav) {
    nav.classList.toggle('locked', !!locked);
    nav.querySelectorAll('.component-link').forEach((button) => { button.disabled = !!locked; });
  }
  const filters = $('categoryFilters');
  if (filters) filters.querySelectorAll('button').forEach((button) => { button.disabled = !!locked; });
  const search = $('searchInput');
  if (search) search.disabled = !!locked;
  const shuffle = $('shuffleComponents');
  if (shuffle) shuffle.disabled = !!locked;
  const banner = $('aiLockBanner');
  if (banner) banner.hidden = !locked;
}
