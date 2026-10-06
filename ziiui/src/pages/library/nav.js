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

function createCardVisual(effect) {
  const visual = document.createElement('span');
  visual.className = `component-card-visual preview-${effect.cat.toLowerCase()} preview-${effect.id}`;
  visual.dataset.component = effect.id;

  if (effect.cat === 'Text') {
    const text = document.createElement('span');
    text.className = 'preview-word';
    text.textContent = effect.text || effect.name;
    visual.append(text);
    if (/shimmer|wave/i.test(effect.id)) visual.classList.add('is-shimmer');
  } else if (effect.cat === 'Interactive') {
    visual.innerHTML = '<span class="preview-window preview-window-a"></span><span class="preview-window preview-window-b"></span><span class="preview-cursor"></span>';
  } else if (effect.cat === 'Scroll' || effect.cat === 'Web') {
    visual.innerHTML = '<span class="preview-panel preview-panel-a"></span><span class="preview-panel preview-panel-b"></span><span class="preview-panel preview-panel-c"></span>';
  } else if (effect.cat === 'Shader') {
    visual.innerHTML = '<span class="preview-shader"></span><span class="preview-reflection"></span>';
  } else if (effect.cat === 'Footer') {
    visual.innerHTML = '<span class="preview-footer-line"></span><span class="preview-footer-line"></span><span class="preview-footer-line"></span><span class="preview-footer-mark"></span>';
  } else if (effect.cat === 'Cursor') {
    visual.innerHTML = '<span class="preview-cursor-card"></span><span class="preview-cursor-tag"></span><span class="preview-cursor-dot"></span>';
  }
  return visual;
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

function getComponentVideoSource(effect) {
  const sourceMap = {
    maskdrag: 'https://videos.pexels.com/video-files/19026925/19026925-uhd_2560_1440_25fps.mp4',
    microhover: 'https://videos.pexels.com/video-files/2878715/2878715-hd_1920_1080_25fps.mp4',
    scrollmask: 'https://videos.pexels.com/video-files/19026925/19026925-uhd_2560_1440_25fps.mp4',
    pinrotate: 'https://videos.pexels.com/video-files/3837780/3837780-hd_1920_1080_25fps.mp4',
    default: 'https://videos.pexels.com/video-files/19026925/19026925-uhd_2560_1440_25fps.mp4'
  };
  return sourceMap[effect.id] || sourceMap.default;
}

function shouldAutoplayCardVideo() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    return true;
  }
  return false;
}

function setCardVideoPlayback(card, video, shouldPlay) {
  if (!card || !video) return;
  if (!shouldPlay) {
    video.pause();
    if (video.currentTime > 0) video.currentTime = 0;
    card.dataset.videoState = 'paused';
    return;
  }
  if (video.dataset.videoState === 'playing') return;
  video.play().then(() => {
    card.dataset.videoState = 'playing';
  }).catch(() => {
    card.dataset.videoState = 'paused';
  });
}

function bindCardVideo(card, video) {
  if (!card || !video) return;
  const updateOnHover = (shouldPlay) => {
    const canAutoplay = shouldAutoplayCardVideo();
    if (!canAutoplay) {
      setCardVideoPlayback(card, video, false);
      return;
    }
    setCardVideoPlayback(card, video, shouldPlay);
  };

  card.addEventListener('mouseenter', () => updateOnHover(true));
  card.addEventListener('mouseleave', () => updateOnHover(false));
  card.addEventListener('focusin', () => updateOnHover(true));
  card.addEventListener('focusout', () => updateOnHover(false));

  video.addEventListener('ended', () => {
    if (card.matches(':hover') || document.activeElement === card) {
      video.currentTime = 0;
      setCardVideoPlayback(card, video, true);
      return;
    }
    setCardVideoPlayback(card, video, false);
  });
}

function renderCards(effects) {
  const grid = $('componentGrid');
  if (!grid) return;
  grid.replaceChildren();

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const card = entry.target;
        const video = card.querySelector('.component-card-video');
        if (!video) return;
        if (!entry.isIntersecting) {
          setCardVideoPlayback(card, video, false);
          return;
        }
        const isHovered = card.matches(':hover') || document.activeElement === card;
        if (shouldAutoplayCardVideo() && !isHovered) {
          setCardVideoPlayback(card, video, true);
        }
      });
    }, {
      root: null,
      threshold: 0.2,
      rootMargin: '0px 0px -5% 0px'
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
    video.src = getComponentVideoSource(effect);
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = 'metadata';
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.setAttribute('aria-hidden', 'true');
    video.poster = '';

    fallback.className = 'component-card-fallback';
    fallback.setAttribute('aria-hidden', 'true');

    if (!video.canPlayType('video/mp4')) {
      video.removeAttribute('src');
    }

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
