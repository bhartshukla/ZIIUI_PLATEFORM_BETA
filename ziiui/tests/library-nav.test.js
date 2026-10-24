import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EFFECTS } from '../src/effects/registry.js';

let buildNav;
let applySearch;
let markCurrent;
let setNavigationLocked;
let openSidebar;
let closeSidebar;
let showAllComponents;
let selectedEffect;

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  vi.resetModules();
  ({ buildNav, applySearch, markCurrent, setNavigationLocked, openSidebar, closeSidebar, showAllComponents } =
    await import('../src/pages/library/nav.js'));
  document.body.innerHTML = `
    <button id="menuToggle"></button>
    <div id="sideOverlay"></div>
    <aside id="sidePanel"><button id="sideClose"></button><div class="search" id="componentSearch"><input id="searchInput"><button id="searchClearBtn" hidden></button></div></aside>
    <span id="catalogTotal"></span>
    <span id="catalogCount"></span>
    <span id="allComponentsCount"></span>
    <button id="allComponentsFilter" data-category="All" aria-pressed="true"></button>
    <nav id="categoryFilters"></nav>
    <nav id="nav"></nav>
    <div id="componentGrid"></div>
    <button id="seeMore" hidden></button>
    <p id="catalogEmpty" hidden></p>
    <p id="galleryEmpty" hidden><span id="galleryEmptyText"></span></p>
  `;
  selectedEffect = null;
  buildNav((effect) => {
    selectedEffect = effect;
    markCurrent(effect, false);
  });
});

describe('component library navigation', () => {
  it('renders components progressively and keeps category filters in sync', () => {
    expect(document.querySelectorAll('.component-card')).toHaveLength(12);
    expect(document.querySelector('#allComponentsCount').textContent).toBe(String(EFFECTS.length));

    document.querySelector('#seeMore').click();
    document.querySelector('#seeMore').click();
    expect(document.querySelectorAll('.component-card')).toHaveLength(EFFECTS.length);

    document.querySelector('#categoryFilters [data-category="Text"]').click();

    expect(document.querySelectorAll('.component-card')).toHaveLength(
      EFFECTS.filter((effect) => effect.cat === 'Text').length
    );
    expect(document.querySelector('#allComponentsFilter').getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('#categoryFilters [data-category="Text"]').getAttribute('aria-pressed')).toBe('true');

    document.querySelector('#allComponentsFilter').click();
    expect(document.querySelectorAll('.component-card')).toHaveLength(12);

    document.querySelector('.category-nav-filter[data-category="Scroll"]').click();
    expect(document.querySelectorAll('.component-card')).toHaveLength(
      EFFECTS.filter((effect) => effect.cat === 'Scroll').length
    );
    expect(document.querySelector('#categoryFilters [data-category="Scroll"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('shows Folder Footer in both categories while keeping one All Components card', () => {
    document.querySelector('#categoryFilters [data-category="Footer"]').click();
    expect(document.querySelectorAll('.component-card[data-id="folderfooter"]')).toHaveLength(1);

    document.querySelector('#categoryFilters [data-category="Interactive"]').click();
    expect(document.querySelectorAll('.component-card[data-id="folderfooter"]')).toHaveLength(1);

    document.querySelector('#allComponentsFilter').click();
    expect(document.querySelectorAll('.component-card[data-id="folderfooter"]')).toHaveLength(1);
    expect(document.querySelectorAll('.component-link[data-id="folderfooter"]')).toHaveLength(2);
  });

  it('uses one search field and shows an empty state for no matches', () => {
    const search = document.querySelector('#searchInput');
    search.value = 'wave';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    applySearch({ currentTarget: search });

    expect(document.querySelectorAll('.component-card')).toHaveLength(
      EFFECTS.filter((effect) => `${effect.name} ${effect.note} ${effect.cat}`.toLowerCase().includes('wave')).length
    );

    search.value = 'not-a-component';
    applySearch({ currentTarget: search });
    expect(document.querySelector('#galleryEmpty').hidden).toBe(false);
    expect(document.querySelector('#catalogEmpty').hidden).toBe(false);
  });

  it('preserves the active card when filters are changed and restored', () => {
    const card = document.querySelector('.component-card');
    const effect = EFFECTS.find((item) => item.id === card.dataset.id);
    card.click();
    expect(selectedEffect.id).toBe(effect.id);

    document.querySelector(`#categoryFilters [data-category="${effect.cat}"]`).click();
    const search = document.querySelector('#searchInput');
    search.value = effect.name;
    applySearch({ currentTarget: search });

    expect(document.querySelectorAll('.component-card[aria-current="true"]')).toHaveLength(1);
    expect(document.querySelector('.component-card[aria-current="true"]').dataset.id).toBe(effect.id);

    search.value = '';
    applySearch({ currentTarget: search });
    expect(document.querySelector('.component-card[aria-current="true"]').dataset.id).toBe(effect.id);
  });

  it('locks gallery, category, and search controls while an AI request is active', () => {
    setNavigationLocked(true);

    expect(document.querySelector('.component-card').disabled).toBe(true);
    expect(document.querySelector('#allComponentsFilter').disabled).toBe(true);
    expect(document.querySelector('.category-nav-filter').disabled).toBe(true);
    expect(document.querySelector('#categoryFilters button').disabled).toBe(true);
    expect(document.querySelector('#searchInput').disabled).toBe(true);

    setNavigationLocked(false);
    expect(document.querySelector('.component-card').disabled).toBe(false);
  });

  it('shows cards progressively and clears the selected card in All Components', () => {
    expect(document.querySelectorAll('.component-card')).toHaveLength(12);
    expect(document.querySelector('#seeMore').hidden).toBe(false);
    document.querySelector('#seeMore').click();
    expect(document.querySelectorAll('.component-card')).toHaveLength(24);
    document.querySelector('#seeMore').click();
    expect(document.querySelectorAll('.component-card')).toHaveLength(EFFECTS.length);
    expect(document.querySelector('#seeMore').hidden).toBe(true);

    document.querySelector('.component-card').click();
    expect(document.querySelector('.component-card[aria-current="true"]')).not.toBeNull();
    showAllComponents();
    expect(document.querySelectorAll('.component-card[aria-current="true"]')).toHaveLength(0);
    expect(document.querySelector('#allComponentsFilter').getAttribute('aria-pressed')).toBe('true');
  });

  it('allows sidebar categories to collapse without losing their state on search updates', () => {
    const toggle = document.querySelector('.component-group-toggle');
    const controlledId = toggle.getAttribute('aria-controls');
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(controlledId).hidden).toBe(true);
    document.querySelector('#searchInput').value = 'split';
    applySearch({ currentTarget: document.querySelector('#searchInput') });
    const restoredToggle = document.querySelector('.component-group-toggle[aria-expanded="false"]');
    expect(restoredToggle).not.toBeNull();
  });

  it('keeps a closed mobile sidebar out of keyboard navigation and restores focus', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', matchMedia);
    const side = document.querySelector('#sidePanel');
    const close = document.querySelector('#sideClose');
    const toggle = document.querySelector('#menuToggle');

    closeSidebar();
    expect(side.inert).toBe(true);
    expect(side.getAttribute('aria-hidden')).toBe('true');

    openSidebar();
    expect(side.inert).toBe(false);
    expect(side.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(close);

    closeSidebar();
    expect(side.inert).toBe(true);
    expect(document.activeElement).toBe(toggle);

    openSidebar();
    matchMedia.mockReturnValue({ matches: false });
    closeSidebar();
    expect(side.inert).toBe(false);
    expect(side.hasAttribute('aria-hidden')).toBe(false);
    expect(document.activeElement).toBe(document.querySelector('#searchInput'));
  });

  it('renders Menus category immediately after Web with its two components', () => {
    const categoryButtons = [...document.querySelectorAll('#categoryFilters .category-filter')];
    const categoryNames = categoryButtons.map((btn) => btn.dataset.category);
    expect(categoryNames).not.toContain('Cursor');
    expect(document.querySelector('.component-group[data-category="Cursor"]')).toBeNull();
    expect(categoryNames).toContain('Menus');
    const webIndex = categoryNames.indexOf('Web');
    const menusIndex = categoryNames.indexOf('Menus');
    expect(menusIndex).toBe(webIndex + 1);

    const menusFilter = document.querySelector('#categoryFilters [data-category="Menus"]');
    menusFilter.click();
    expect(document.querySelectorAll('.component-card')).toHaveLength(2);
    expect(document.querySelector('.component-card[data-id="blockreveal"]')).not.toBeNull();
    expect(document.querySelector('.component-card[data-id="revealmenu"]')).not.toBeNull();

    const sidebarGroup = document.querySelector('.component-group[data-category="Menus"]');
    expect(sidebarGroup).not.toBeNull();
    expect(sidebarGroup.querySelectorAll('.component-link')).toHaveLength(2);
  });

  it('supports multi-token searches across category and component name', () => {
    const search = document.querySelector('#searchInput');
    search.value = 'interactive mask';
    applySearch({ currentTarget: search });

    const visibleCards = document.querySelectorAll('.component-card');
    expect(visibleCards).toHaveLength(1);
    expect(visibleCards[0].dataset.id).toBe('maskdrag');

    search.value = 'interactive trail';
    applySearch({ currentTarget: search });
    const trailCards = [...document.querySelectorAll('.component-card')].map((c) => c.dataset.id);
    expect(trailCards).toEqual(['snakehover', 'imagetrail']);
  });

  it('synchronizes category filter counts with active search results', () => {
    const search = document.querySelector('#searchInput');
    search.value = 'wave';
    applySearch({ currentTarget: search });

    const textFilter = document.querySelector('#categoryFilters [data-category="Text"]');
    const textCount = textFilter.querySelector('.category-count');
    expect(textCount.textContent).toBe('2');

    const menusFilter = document.querySelector('#categoryFilters [data-category="Menus"]');
    const menusCount = menusFilter.querySelector('.category-count');
    expect(menusCount.textContent).toBe('0');
  });

  it('toggles clear button visibility and updates search input state', () => {
    const search = document.querySelector('#searchInput');
    const clearBtn = document.querySelector('#searchClearBtn');
    const searchBox = document.querySelector('#componentSearch');

    search.value = 'split';
    applySearch({ currentTarget: search });
    expect(clearBtn.hidden).toBe(false);
    expect(searchBox.classList.contains('has-query')).toBe(true);

    search.value = '';
    applySearch({ currentTarget: search });
    expect(clearBtn.hidden).toBe(true);
    expect(searchBox.classList.contains('has-query')).toBe(false);
  });

  it('supports arrow key navigation across gallery component cards', () => {
    const grid = document.querySelector('#componentGrid');
    const cards = [...grid.querySelectorAll('.component-card')];
    expect(cards.length).toBeGreaterThan(1);

    cards[0].focus();
    expect(document.activeElement).toBe(cards[0]);

    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(cards[1]);

    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(cards[0]);

    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(cards[cards.length - 1]);

    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(cards[0]);
  });

  it('supports arrow key navigation across category filter chips', () => {
    const filters = document.querySelector('#categoryFilters');
    const chips = [...filters.querySelectorAll('.category-filter')];
    expect(chips.length).toBeGreaterThan(1);

    chips[0].focus();
    expect(document.activeElement).toBe(chips[0]);

    filters.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(chips[1]);

    filters.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(chips[0]);
  });
});
