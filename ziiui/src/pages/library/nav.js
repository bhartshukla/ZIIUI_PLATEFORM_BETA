/* Category navigation, searchable component list, and mobile drawer. */
import { $ } from '../../lib/dom.js';
import { EFFECTS, CATEGORIES } from '../../effects/registry.js';
import { getComponentVideoSource } from '../../effects/videos.js';

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
let onShowCategory = () => {};
let activeCategory = 'All';
let activeEffectId = null;
let navigationLocked = false;
let displayEffects = [...EFFECTS];
let visibleCardCount = 12;
const CARD_INCREMENT = 12;
const MAX_ACTIVE_CARD_VIDEOS = 3;
const activeCardVideoEntries = new Set();
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

function makeEffectButton(effect) {
  const button = document.createElement('button');
  const name = document.createElement('span');
  button.type = 'button';
  button.className = 'component-link';
  button.dataset.id = effect.id;
  button.setAttribute('aria-current', 'false');
  name.className = 'component-link-name';
  name.textContent = effect.cat === 'Cursor' ? effect.name.replace(/^Cursor:\s*/, '') : effect.name;
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
    activeCategory === 'All' || effect.cat === activeCategory
  );

  if (nav) {
    nav.replaceChildren();

    CATEGORIES.forEach((category) => {
      const effects = searched.filter((effect) => effect.cat === category);
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
  if (galleryEmpty) galleryEmpty.hidden = visible.length !== 0;
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
  renderCards(visible);
}

let activePlayingCard = null;

function hasHoverCapability() {
  return !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
}

function loadCardVideo(video) {
  if (!video || video.dataset.loaded === 'true') return;
  const src = video.dataset.src;
  if (!src) return;
  video.src = src;
  video.dataset.loaded = 'true';
  video.load();
}

function playCardVideo(card, video) {
  if (!card || !video || video.dataset.failed === 'true') return;

  loadCardVideo(video);

  // Ensure inactive videos are paused — only one video plays at a time
  if (activePlayingCard && activePlayingCard.video !== video) {
    pauseCardVideo(activePlayingCard.card, activePlayingCard.video);
  }

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        card.dataset.videoState = 'playing';
        video.dataset.videoState = 'playing';
        activePlayingCard = { card, video };
      })
      .catch(() => {
        card.dataset.videoState = 'paused';
        video.dataset.videoState = 'paused';
      });
  }
}

function pauseCardVideo(card, video) {
  if (!card || !video) return;
  try {
    video.pause();
  } catch (_) {}
  card.dataset.videoState = 'paused';
  video.dataset.videoState = 'paused';
  if (activePlayingCard && activePlayingCard.video === video) {
    activePlayingCard = null;
  }
}

function bindCardVideo(card, video) {
  if (!card || !video) return;

  const onEnter = () => {
    if (hasHoverCapability()) {
      playCardVideo(card, video);
    }
  };

  const onLeave = () => {
    if (hasHoverCapability()) {
      pauseCardVideo(card, video);
    }
  };

  video.addEventListener('error', () => {
    video.dataset.failed = 'true';
    pauseCardVideo(card, video);
    // If an external URL failed, attempt fallback to local placeholder
    if (video.dataset.src && !video.dataset.src.startsWith('/preview-placeholder')) {
      video.dataset.src = '/preview-placeholder-2.mp4';
      video.dataset.failed = 'false';
      video.dataset.loaded = 'false';
      loadCardVideo(video);
      return;
    }
    video.style.display = 'none';
    const fallback = card.querySelector('.component-card-fallback');
    if (fallback) fallback.style.opacity = '1';
  });

  card.addEventListener('mouseenter', onEnter);
  card.addEventListener('mouseleave', onLeave);
  card.addEventListener('focusin', onEnter);
  card.addEventListener('focusout', onLeave);
}

function renderCards(effects) {
  const grid = $('componentGrid');
  if (!grid) return;
  grid.replaceChildren();

  // Reset any active playback reference
  if (activePlayingCard && activePlayingCard.video) {
    try { activePlayingCard.video.pause(); } catch (_) {}
    activePlayingCard = null;
  }

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const card = entry.target;
        const video = card.querySelector('.component-card-video');
        if (!video) return;

        // Lazy load video stream as card approaches/enters viewport
        if (entry.isIntersecting && video.dataset.loaded !== 'true') {
          loadCardVideo(video);
        }

        const isDesktop = hasHoverCapability();

        if (isDesktop) {
          // On desktop: pause if scrolled out of viewport while playing
          if (!entry.isIntersecting) {
            pauseCardVideo(card, video);
          }
        } else {
          // On mobile: play when centered in viewport, pause when exiting
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            playCardVideo(card, video);
          } else if (!entry.isIntersecting) {
            pauseCardVideo(card, video);
          }
        }
      });
    }, {
      root: null,
      threshold: [0, 0.5],
      rootMargin: '60px 0px 60px 0px'
    })
    : null;

  effects.slice(0, visibleCardCount).forEach((effect) => {
    const card = document.createElement('button');
    const media = document.createElement('div');
    const video = document.createElement('video');
    const fallback = document.createElement('span');

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

    video.className = 'component-card-video';
    video.dataset.src = getComponentVideoSource(effect);
    video.dataset.loaded = 'false';
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = 'metadata';
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.setAttribute('aria-hidden', 'true');

    fallback.className = 'component-card-fallback';
    fallback.setAttribute('aria-hidden', 'true');

    media.append(video, fallback);
    card.append(media);

    card.addEventListener('click', () => {
      if (onSelectEffect) onSelectEffect(effect, true);
    });

    bindCardVideo(card, video);
    if (observer) observer.observe(card);
    grid.append(card);
  });

  const more = $('seeMore');
  if (more) {
    const remaining = Math.max(0, effects.length - visibleCardCount);
    more.hidden = remaining === 0;
    more.textContent = `See more components (${remaining} remaining)`;
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
  const more = $('seeMore');
  if (more) more.addEventListener('click', showMoreComponents);

}

export function markCurrent(effect, scrollIntoView) {
  activeEffectId = effect ? effect.id : null;
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

export function applySearch(event) {
  const source = event && event.currentTarget;
  const query = source ? source.value.trim().toLowerCase() : searchQuery();
  visibleCardCount = CARD_INCREMENT;
  if (source && source.value.trim().toLowerCase() !== query) source.value = query;
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
  const more = $('seeMore');
  if (more) more.disabled = navigationLocked;
  const shuffle = $('shuffleComponents');
  if (shuffle) shuffle.disabled = navigationLocked;
  const banner = $('aiLockBanner');
  if (banner) banner.hidden = !navigationLocked;
}
