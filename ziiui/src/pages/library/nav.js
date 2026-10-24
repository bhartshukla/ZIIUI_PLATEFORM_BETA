/* Category navigation, searchable component list, and mobile drawer. */
import { $ } from '../../lib/dom.js';
import { EFFECTS, CATEGORIES } from '../../effects/registry.js';
import { getComponentVideoSource } from '../../effects/videos.js';

const CATEGORY_ICONS = {
  All: 'ri-apps-2-line',
  Web: 'ri-layout-4-line',
  Menus: 'ri-menu-line',
  Interactive: 'ri-cursor-line',
  Footer: 'ri-layout-bottom-line',
  Text: 'ri-font-size-2',
  Scroll: 'ri-scroll-to-bottom-line',
  Shader: 'ri-contrast-2-line'
};

let onSelectEffect = null;
let onShowCategory = () => {};
let activeCategory = 'All';
let activeEffectId = null;
let navigationLocked = false;
let displayEffects = [...EFFECTS];
let visibleCardCount = 12;
const CARD_INCREMENT = 12;
const collapsedCategories = new Set();

function searchQuery() {
  const input = $('searchInput');
  return input ? input.value.trim().toLowerCase() : '';
}

function setActiveCategory(category) {
  activeCategory = category;
  visibleCardCount = CARD_INCREMENT;
  document.querySelectorAll('[data-category].category-filter, .category-nav-filter, #allComponentsFilter')
    .forEach((filter) => {
      filter.setAttribute('aria-pressed', String(filter.dataset.category === activeCategory));
    });
  renderList();
}

function matchesSearch(effect, query) {
  if (!query) return true;
  const terms = query.split(/\s+/).filter(Boolean);
  const searchable = [
    effect.name,
    effect.note,
    effect.cat,
    ...(effect.categories || [])
  ].filter(Boolean).join(' ').toLowerCase();

  return terms.every((term) => searchable.includes(term));
}

function updateCategoryFilterCounts(searched) {
  const filters = $('categoryFilters');
  if (!filters) return;
  filters.querySelectorAll('.category-filter').forEach((button) => {
    const category = button.dataset.category;
    const total = button.querySelector('.category-count');
    if (!total) return;
    const count = category === 'All'
      ? searched.length
      : searched.filter((effect) => belongsToCategory(effect, category)).length;
    total.textContent = String(count);
  });
}

function belongsToCategory(effect, category) {
  return (effect.categories || [effect.cat]).includes(category);
}

function renderCategories() {
  const filters = $('categoryFilters');
  if (!filters) return;
  filters.replaceChildren();

  ['All', ...CATEGORIES].forEach((category) => {
    const count = category === 'All'
      ? EFFECTS.length
      : EFFECTS.filter((effect) => belongsToCategory(effect, category)).length;
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

function makeEffectButton(effect) {
  const button = document.createElement('button');
  const name = document.createElement('span');
  button.type = 'button';
  button.className = 'component-link';
  button.dataset.id = effect.id;
  button.setAttribute('aria-current', 'false');
  name.className = 'component-link-name';
  name.textContent = effect.name;
  button.title = effect.name + ' — ' + effect.note;
  button.append(name);
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
  const searched = displayEffects.filter((effect) => matchesSearch(effect, query));
  const visible = searched.filter((effect) =>
    activeCategory === 'All' || belongsToCategory(effect, activeCategory)
  );

  if (nav) {
    nav.replaceChildren();

    CATEGORIES.forEach((category) => {
      const effects = searched.filter((effect) => belongsToCategory(effect, category));
      if (!effects.length) return;

      const group = document.createElement('section');
      const heading = document.createElement('button');
      const icon = document.createElement('i');
      const label = document.createElement('span');
      const total = document.createElement('span');
      const toggle = document.createElement('button');
      const toggleIcon = document.createElement('i');
      const list = document.createElement('div');
      const listId = `component-group-${category.toLowerCase()}`;
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
      total.textContent = String(effects.length);
      total.setAttribute('aria-hidden', 'true');
      heading.append(icon, label, total);
      heading.addEventListener('click', () => onShowCategory(category));
      toggle.type = 'button';
      toggle.className = 'component-group-toggle';
      toggle.setAttribute('aria-label', `${collapsedCategories.has(category) ? 'Expand' : 'Collapse'} ${category} components`);
      toggle.setAttribute('aria-expanded', String(!collapsedCategories.has(category)));
      toggle.setAttribute('aria-controls', listId);
      toggle.disabled = navigationLocked;
      toggleIcon.className = 'ri-arrow-down-s-line';
      toggleIcon.setAttribute('aria-hidden', 'true');
      toggle.append(toggleIcon);
      toggle.addEventListener('click', () => {
        const collapsed = !list.hidden;
        list.hidden = collapsed;
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${category} components`);
        if (collapsed) collapsedCategories.add(category);
        else collapsedCategories.delete(category);
      });
      list.className = 'component-group-list';
      list.id = listId;
      list.hidden = collapsedCategories.has(category);
      effects.forEach((effect) => {
        list.append(makeEffectButton(effect));
      });
      group.append(heading, toggle, list);
      nav.append(group);
    });
  }

  if (empty) empty.hidden = visible.length !== 0;
  const galleryEmpty = $('galleryEmpty');
  if (galleryEmpty) {
    galleryEmpty.hidden = visible.length !== 0;
    const emptyText = $('galleryEmptyText');
    if (emptyText) {
      emptyText.textContent = query
        ? `No components found matching "${query}".`
        : 'No components found.';
    }
  }
  if (count) {
    count.textContent = `${visible.length} ${visible.length === 1 ? 'component' : 'components'}`;
  }
  const allCount = $('allComponentsCount');
  if (allCount) allCount.textContent = String(EFFECTS.length);
  const allFilter = $('allComponentsFilter');
  if (allFilter) {
    allFilter.setAttribute('aria-pressed', String(activeCategory === 'All' && !activeEffectId));
    allFilter.disabled = navigationLocked;
  }
  updateCategoryFilterCounts(searched);
  syncSearchClearButton();
  renderCards(visible);
}

let cardObserver = null;
let userInteracted = false;

function prefersReducedMotion() {
  return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function unlockAutoplayOnUserGesture() {
  if (userInteracted || typeof window === 'undefined') return;
  userInteracted = true;
  window.removeEventListener('pointerdown', unlockAutoplayOnUserGesture);
  window.removeEventListener('keydown', unlockAutoplayOnUserGesture);
  window.removeEventListener('scroll', unlockAutoplayOnUserGesture);

  const grid = $('componentGrid');
  if (!grid || prefersReducedMotion()) return;
  grid.querySelectorAll('.component-card-video').forEach((video) => {
    const card = video.closest('.component-card');
    if (card && card.dataset.videoState !== 'playing' && video.dataset.failed !== 'true') {
      playCardVideo(card, video);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAutoplayOnUserGesture, { passive: true, once: true });
  window.addEventListener('keydown', unlockAutoplayOnUserGesture, { passive: true, once: true });
  window.addEventListener('scroll', unlockAutoplayOnUserGesture, { passive: true, once: true });
}

const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

function loadCardVideo(video) {
  if (!video || video.dataset.loaded === 'true') return;
  const src = video.dataset.src;
  if (!src) return;
  video.src = src;
  video.dataset.loaded = 'true';
  if (!isJsdom && typeof video.load === 'function') {
    try { video.load(); } catch (_) {}
  }
}

function playCardVideo(card, video) {
  if (!card || !video || video.dataset.failed === 'true') return;
  if (prefersReducedMotion()) {
    pauseCardVideo(card, video);
    return;
  }

  loadCardVideo(video);

  if (isJsdom) {
    card.dataset.videoState = 'playing';
    video.dataset.videoState = 'playing';
    return;
  }

  try {
    const playPromise = typeof video.play === 'function' ? video.play() : null;
    if (playPromise !== undefined && playPromise !== null) {
      playPromise
        .then(() => {
          card.dataset.videoState = 'playing';
          video.dataset.videoState = 'playing';
        })
        .catch(() => {
          card.dataset.videoState = 'paused';
          video.dataset.videoState = 'paused';
        });
    }
  } catch (_) {
    card.dataset.videoState = 'paused';
    video.dataset.videoState = 'paused';
  }
}

function pauseCardVideo(card, video) {
  if (!card || !video) return;
  if (!isJsdom && typeof video.pause === 'function') {
    try {
      video.pause();
    } catch (_) {}
  }
  card.dataset.videoState = 'paused';
  video.dataset.videoState = 'paused';
}

function bindCardVideo(card, video) {
  if (!card || !video) return;

  // Video autoplay is driven by viewport visibility, remaining independent of hover.
  // If video is missing or fails to load, remove it cleanly without fake/default video.
  video.addEventListener('error', () => {
    video.dataset.failed = 'true';
    pauseCardVideo(card, video);
    video.remove();
  });
}

export function pauseAllCardVideos() {
  const grid = $('componentGrid');
  if (!grid) return;
  grid.querySelectorAll('.component-card-video').forEach((video) => {
    const card = video.closest('.component-card');
    pauseCardVideo(card, video);
  });
}

function renderCards(effects) {
  const grid = $('componentGrid');
  if (!grid) return;
  grid.replaceChildren();

  // Reset any active observer
  if (cardObserver) {
    cardObserver.disconnect();
    cardObserver = null;
  }

  const observer = ('IntersectionObserver' in window && !prefersReducedMotion())
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const card = entry.target;
        const video = card.querySelector('.component-card-video');
        if (!video || video.dataset.failed === 'true') return;

        // Autoplay when visible in viewport; pause when outside for performance
        if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
          playCardVideo(card, video);
        } else if (!entry.isIntersecting) {
          pauseCardVideo(card, video);
        }
      });
    }, {
      root: null,
      threshold: [0, 0.1, 0.5],
      rootMargin: '100px 0px 100px 0px'
    })
    : null;

  cardObserver = observer;

  effects.slice(0, visibleCardCount).forEach((effect) => {
    const card = document.createElement('button');
    const media = document.createElement('div');

    card.type = 'button';
    card.className = 'component-card';
    card.dataset.id = effect.id;
    card.setAttribute('aria-current', String(effect.id === activeEffectId));
    card.setAttribute('aria-label', `Open ${effect.name} component`);
    card.title = effect.name;
    card.disabled = navigationLocked;

    media.className = 'component-card-art';
    media.dataset.category = effect.cat.toLowerCase();
    media.dataset.component = effect.id;
    media.setAttribute('aria-hidden', 'true');

    const videoSrc = getComponentVideoSource(effect);
    if (videoSrc) {
      const video = document.createElement('video');
      video.className = 'component-card-video';
      video.dataset.src = videoSrc;
      video.dataset.loaded = 'false';
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = true;
      video.autoplay = true;
      video.controls = false;
      video.preload = 'metadata';
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('loop', '');
      video.removeAttribute('controls');
      video.setAttribute('aria-hidden', 'true');

      media.append(video);
      bindCardVideo(card, video);
      if (cardObserver) {
        cardObserver.observe(card);
      } else if (!prefersReducedMotion() && !(typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || ''))) {
        playCardVideo(card, video);
      }
    }

    card.append(media);

    card.addEventListener('click', () => {
      if (onSelectEffect) onSelectEffect(effect, true);
    });

    grid.append(card);
  });

  const more = $('seeMore');
  if (more) {
    const remaining = Math.max(0, effects.length - visibleCardCount);
    more.hidden = remaining === 0;
    more.innerHTML = `<i class="ri-arrow-down-line" aria-hidden="true"></i> See more components (${remaining} remaining)`;
    more.disabled = navigationLocked;
  }
}

export function buildNav(onSelect, showCategory) {
  onSelectEffect = onSelect;
  onShowCategory = typeof showCategory === 'function' ? showCategory : setActiveCategory;
  const total = $('catalogTotal');
  if (total) total.textContent = `${EFFECTS.length} components`;
  const allFilter = $('allComponentsFilter');
  if (allFilter) allFilter.addEventListener('click', () => onShowCategory('All'));
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

  const grid = $('componentGrid');
  if (grid && !grid.__wiredGridKeys) {
    grid.__wiredGridKeys = true;
    grid.addEventListener('keydown', (event) => {
      const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'];
      if (!keys.includes(event.key)) return;
      const cards = [...grid.querySelectorAll('.component-card:not(:disabled)')];
      const current = cards.indexOf(document.activeElement);
      if (current < 0 || !cards.length) return;

      if (event.key === 'Escape') {
        const search = $('searchInput');
        if (search) search.focus();
        return;
      }

      event.preventDefault();
      let next = current;
      const columns = typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1;

      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = cards.length - 1;
      else if (event.key === 'ArrowRight') next = Math.min(cards.length - 1, current + 1);
      else if (event.key === 'ArrowLeft') next = Math.max(0, current - 1);
      else if (event.key === 'ArrowDown') next = Math.min(cards.length - 1, current + columns);
      else if (event.key === 'ArrowUp') next = Math.max(0, current - columns);

      if (cards[next]) cards[next].focus();
    });
  }

  const filterChips = $('categoryFilters');
  if (filterChips && !filterChips.__wiredFilterKeys) {
    filterChips.__wiredFilterKeys = true;
    filterChips.addEventListener('keydown', (event) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      const buttons = [...filterChips.querySelectorAll('.category-filter:not(:disabled)')];
      const current = buttons.indexOf(document.activeElement);
      if (current < 0 || !buttons.length) return;
      event.preventDefault();
      let next = current;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === 'ArrowRight') next = (current + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
      if (buttons[next]) {
        buttons[next].focus();
        buttons[next].click();
      }
    });
  }

  const more = $('seeMore');
  if (more) more.addEventListener('click', showMoreComponents);
}

export function markCurrent(effect, scrollIntoView) {
  activeEffectId = effect ? effect.id : null;
  if (effect) {
    pauseAllCardVideos();
  }
  const nav = $('nav');
  [nav, $('componentGrid')].filter(Boolean).forEach((container) => {
    container.querySelectorAll('[data-id]').forEach((button) => {
      const selected = !!effect && button.dataset.id === effect.id;
      button.setAttribute('aria-current', String(selected));
      if (selected && scrollIntoView && container === nav && button.scrollIntoView) {
        button.scrollIntoView({ block: 'nearest' });
      }
    });
  });
  const allFilter = $('allComponentsFilter');
  if (allFilter) allFilter.setAttribute('aria-pressed', String(!effect && activeCategory === 'All'));
}

export function syncSearchClearButton() {
  const input = $('searchInput');
  const clearBtn = $('searchClearBtn');
  const searchBox = $('componentSearch');
  const hasText = !!(input && input.value.trim().length > 0);
  if (clearBtn) clearBtn.hidden = !hasText;
  if (searchBox) searchBox.classList.toggle('has-query', hasText);
}

export function applySearch(event) {
  const source = event && event.currentTarget;
  const query = source ? source.value.trim().toLowerCase() : searchQuery();
  visibleCardCount = CARD_INCREMENT;
  if (source && source.value.trim().toLowerCase() !== query) source.value = query;
  syncSearchClearButton();
  renderList();
}

export function showAllComponents(category = 'All') {
  activeCategory = category;
  visibleCardCount = CARD_INCREMENT;
  document.querySelectorAll('[data-category].category-filter, .category-nav-filter, #allComponentsFilter')
    .forEach((filter) => filter.setAttribute('aria-pressed', String(filter.dataset.category === category)));
  renderList();
  markCurrent(null, false);
}

export function showMoreComponents() {
  visibleCardCount += CARD_INCREMENT;
  renderList();
  const more = $('seeMore');
  if (more && !more.hidden) more.focus();
}

export function shuffleComponents() {
  CATEGORIES.forEach((category) => {
    const group = displayEffects.filter((effect) => belongsToCategory(effect, category));
    for (let index = group.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [group[index], group[swapIndex]] = [group[swapIndex], group[index]];
    }
    const queue = [...group];
    displayEffects = displayEffects.map((effect) =>
      belongsToCategory(effect, category) ? queue.shift() : effect
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
  if (syncSidebarAccessibility(side, true)) {
    const close = $('sideClose');
    if (close) close.focus();
  }
}

export function closeSidebar() {
  const side = $('sidePanel');
  const overlay = $('sideOverlay');
  const toggle = $('menuToggle');
  if (!side || !overlay) return;
  const restoreFocus = side.contains(document.activeElement);
  side.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  const compact = syncSidebarAccessibility(side, false);
  if (restoreFocus) {
    if (compact && toggle) toggle.focus();
    else if (!compact) {
      const search = $('searchInput');
      if (search) search.focus();
    }
  }
}

function syncSidebarAccessibility(side, opened) {
  const compact = window.matchMedia &&
    window.matchMedia('(max-width: 900px)').matches;
  if (compact) {
    side.inert = !opened;
    side.setAttribute('aria-hidden', String(!opened));
  } else {
    side.inert = false;
    side.removeAttribute('aria-hidden');
  }
  return compact;
}

/** Disable component selection and search while an AI request is running. */
export function setNavigationLocked(locked) {
  navigationLocked = !!locked;
  const nav = $('nav');
  if (nav) {
    nav.classList.toggle('locked', navigationLocked);
    nav.querySelectorAll('.component-link, .component-group-toggle').forEach((button) => { button.disabled = navigationLocked; });
  }
  const grid = $('componentGrid');
  if (grid) grid.querySelectorAll('.component-card').forEach((button) => { button.disabled = navigationLocked; });
  const allFilter = $('allComponentsFilter');
  if (allFilter) allFilter.disabled = navigationLocked;
  if (nav) nav.querySelectorAll('.category-nav-filter').forEach((button) => { button.disabled = navigationLocked; });
  const filters = $('categoryFilters');
  if (filters) filters.querySelectorAll('button').forEach((button) => { button.disabled = navigationLocked; });
  const search = $('searchInput');
  if (search) search.disabled = navigationLocked;
  const clearBtn = $('searchClearBtn');
  if (clearBtn) clearBtn.disabled = navigationLocked;
  const more = $('seeMore');
  if (more) more.disabled = navigationLocked;
  const shuffle = $('shuffleComponents');
  if (shuffle) shuffle.disabled = navigationLocked;
  const banner = $('aiLockBanner');
  if (banner) banner.hidden = !navigationLocked;
}
