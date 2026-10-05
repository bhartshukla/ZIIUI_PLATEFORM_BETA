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

const CARD_ICONS = {
  Web: 'ri-layout-grid-line',
  Interactive: 'ri-cursor-line',
  Footer: 'ri-layout-bottom-line',
  Text: 'ri-font-size-2',
  Cursor: 'ri-mouse-line',
  Scroll: 'ri-scroll-to-bottom-line',
  Shader: 'ri-contrast-2-line'
};

let onSelectEffect = null;
let activeCategory = 'All';
let activeEffectId = null;
let navigationLocked = false;
let displayEffects = [...EFFECTS];

function searchQuery() {
  const input = $('searchInput') || $('sideSearchInput');
  return input ? input.value.trim().toLowerCase() : '';
}

function setActiveCategory(category) {
  activeCategory = category;
  document.querySelectorAll('[data-category].category-filter, .category-nav-filter, #allComponentsFilter')
    .forEach((filter) => {
      filter.setAttribute('aria-pressed', String(filter.dataset.category === activeCategory));
    });
  renderList();
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
    button.addEventListener('click', () => setActiveCategory(category));
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

  const query = searchQuery();
  const visible = displayEffects.filter((effect) =>
    (activeCategory === 'All' || effect.cat === activeCategory) &&
    matchesSearch(effect, query)
  );

  if (nav) {
    nav.replaceChildren();

    CATEGORIES.forEach((category) => {
      if (activeCategory !== 'All' && activeCategory !== category) return;
      const effects = visible.filter((effect) => effect.cat === category);
      if (!effects.length) return;

      const group = document.createElement('section');
      const heading = document.createElement('button');
      const icon = document.createElement('i');
      const label = document.createElement('span');
      const total = document.createElement('span');
      const list = document.createElement('div');
      group.className = 'component-group';
      group.dataset.category = category;
      heading.type = 'button';
      heading.className = 'component-group-heading category-nav-filter';
      heading.dataset.category = category;
      heading.setAttribute('aria-pressed', String(category === activeCategory));
      heading.disabled = navigationLocked;
      icon.className = CATEGORY_ICONS[category] || 'ri-shapes-line';
      icon.setAttribute('aria-hidden', 'true');
      label.textContent = category;
      total.className = 'component-group-count';
      total.textContent = String(effects.length).padStart(2, '0');
      total.setAttribute('aria-hidden', 'true');
      heading.append(icon, label, total);
      heading.addEventListener('click', () => setActiveCategory(category));
      list.className = 'component-group-list';
      effects.forEach((effect) => {
        list.append(makeEffectButton(effect, EFFECTS.indexOf(effect) + 1));
      });
      group.append(heading, list);
      nav.append(group);
    });
  }

  if (empty) empty.hidden = visible.length !== 0;
  const galleryEmpty = $('galleryEmpty');
  if (galleryEmpty) galleryEmpty.hidden = visible.length !== 0;
  if (count) {
    count.textContent = `${visible.length} ${visible.length === 1 ? 'component' : 'components'}`;
  }
  const allCount = $('allComponentsCount');
  if (allCount) allCount.textContent = String(EFFECTS.length);
  const allFilter = $('allComponentsFilter');
  if (allFilter) {
    allFilter.setAttribute('aria-pressed', String(activeCategory === 'All'));
    allFilter.disabled = navigationLocked;
  }
  renderCards(visible);
}

function renderCards(effects) {
  const grid = $('componentGrid');
  if (!grid) return;
  grid.replaceChildren();

  effects.forEach((effect) => {
    const card = document.createElement('button');
    const art = document.createElement('span');
    const category = document.createElement('span');
    const number = document.createElement('span');
    const icon = document.createElement('i');
    const body = document.createElement('span');
    const name = document.createElement('span');
    const note = document.createElement('span');
    const tag = document.createElement('span');
    const action = document.createElement('span');
    const actionIcon = document.createElement('i');
    const index = EFFECTS.indexOf(effect) + 1;

    card.type = 'button';
    card.className = 'component-card';
    card.dataset.id = effect.id;
    card.setAttribute('aria-current', String(effect.id === activeEffectId));
    card.setAttribute('aria-label', `${effect.name}: ${effect.note}`);
    card.title = `Preview ${effect.name}`;
    card.disabled = navigationLocked;
    art.className = 'component-card-art';
    art.dataset.category = effect.cat.toLowerCase();
    category.className = 'component-card-category';
    category.textContent = effect.cat;
    number.className = 'component-card-number';
    number.textContent = String(index).padStart(2, '0');
    number.setAttribute('aria-hidden', 'true');
    icon.className = CARD_ICONS[effect.cat] || 'ri-shapes-line';
    icon.setAttribute('aria-hidden', 'true');
    art.append(category, number, icon);

    body.className = 'component-card-body';
    name.className = 'component-card-name';
    name.textContent = effect.name;
    note.className = 'component-card-note';
    note.textContent = effect.note;
    tag.className = 'component-card-tag';
    tag.textContent = effect.cat;
    action.className = 'component-card-action';
    actionIcon.className = 'ri-arrow-right-line';
    actionIcon.setAttribute('aria-hidden', 'true');
    action.append(actionIcon);
    body.append(name, note, tag, action);
    card.append(art, body);
    card.addEventListener('click', () => {
      if (onSelectEffect) onSelectEffect(effect, true);
    });
    grid.append(card);
  });
}

export function buildNav(onSelect) {
  onSelectEffect = onSelect;
  const total = $('catalogTotal');
  if (total) total.textContent = `${EFFECTS.length} components`;
  const allFilter = $('allComponentsFilter');
  if (allFilter) allFilter.addEventListener('click', () => setActiveCategory('All'));
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
  activeEffectId = effect.id;
  const nav = $('nav');
  [nav, $('componentGrid')].filter(Boolean).forEach((container) => {
    container.querySelectorAll('[data-id]').forEach((button) => {
      const selected = button.dataset.id === effect.id;
      button.setAttribute('aria-current', String(selected));
      if (selected && scrollIntoView && container === nav && button.scrollIntoView) {
        button.scrollIntoView({ block: 'nearest' });
      }
    });
  });
}

export function applySearch(event) {
  const source = event && event.currentTarget;
  const query = source ? source.value.trim().toLowerCase() : searchQuery();
  [$('searchInput'), $('sideSearchInput')].filter(Boolean)
    .forEach((input) => { if (input.value.trim().toLowerCase() !== query) input.value = query; });
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
  navigationLocked = !!locked;
  const nav = $('nav');
  if (nav) {
    nav.classList.toggle('locked', navigationLocked);
    nav.querySelectorAll('.component-link').forEach((button) => { button.disabled = navigationLocked; });
  }
  const grid = $('componentGrid');
  if (grid) grid.querySelectorAll('.component-card').forEach((button) => { button.disabled = navigationLocked; });
  const allFilter = $('allComponentsFilter');
  if (allFilter) allFilter.disabled = navigationLocked;
  if (nav) nav.querySelectorAll('.category-nav-filter').forEach((button) => { button.disabled = navigationLocked; });
  const filters = $('categoryFilters');
  if (filters) filters.querySelectorAll('button').forEach((button) => { button.disabled = navigationLocked; });
  [$('searchInput'), $('sideSearchInput')].filter(Boolean)
    .forEach((input) => { input.disabled = navigationLocked; });
  const shuffle = $('shuffleComponents');
  if (shuffle) shuffle.disabled = navigationLocked;
  const banner = $('aiLockBanner');
  if (banner) banner.hidden = !navigationLocked;
}
