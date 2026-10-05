import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EFFECTS } from '../src/effects/registry.js';

let buildNav;
let applySearch;
let markCurrent;
let setNavigationLocked;
let selectedEffect;

beforeEach(async () => {
  vi.resetModules();
  ({ buildNav, applySearch, markCurrent, setNavigationLocked } = await import('../src/pages/library/nav.js'));
  document.body.innerHTML = `
    <input id="searchInput">
    <input id="sideSearchInput">
    <span id="catalogTotal"></span>
    <span id="catalogCount"></span>
    <span id="allComponentsCount"></span>
    <button id="allComponentsFilter" data-category="All" aria-pressed="true"></button>
    <nav id="categoryFilters"></nav>
    <nav id="nav"></nav>
    <div id="componentGrid"></div>
    <p id="catalogEmpty" hidden></p>
    <p id="galleryEmpty" hidden></p>
  `;
  selectedEffect = null;
  buildNav((effect) => {
    selectedEffect = effect;
    markCurrent(effect, false);
  });
});

describe('component library navigation', () => {
  it('renders all registered components and keeps category filters in sync', () => {
    expect(document.querySelectorAll('.component-card')).toHaveLength(EFFECTS.length);
    expect(document.querySelector('#allComponentsCount').textContent).toBe(String(EFFECTS.length));

    document.querySelector('#categoryFilters [data-category="Text"]').click();

    expect(document.querySelectorAll('.component-card')).toHaveLength(
      EFFECTS.filter((effect) => effect.cat === 'Text').length
    );
    expect(document.querySelector('#allComponentsFilter').getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('#categoryFilters [data-category="Text"]').getAttribute('aria-pressed')).toBe('true');

    document.querySelector('#allComponentsFilter').click();
    expect(document.querySelectorAll('.component-card')).toHaveLength(EFFECTS.length);

    document.querySelector('.category-nav-filter[data-category="Scroll"]').click();
    expect(document.querySelectorAll('.component-card')).toHaveLength(
      EFFECTS.filter((effect) => effect.cat === 'Scroll').length
    );
    expect(document.querySelector('#categoryFilters [data-category="Scroll"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('synchronizes both search fields and shows an empty state for no matches', () => {
    const sideSearch = document.querySelector('#sideSearchInput');
    sideSearch.value = 'wave';
    sideSearch.dispatchEvent(new Event('input', { bubbles: true }));
    applySearch({ currentTarget: sideSearch });

    expect(document.querySelector('#searchInput').value).toBe('wave');
    expect(document.querySelectorAll('.component-card')).toHaveLength(
      EFFECTS.filter((effect) => `${effect.name} ${effect.note} ${effect.cat}`.toLowerCase().includes('wave')).length
    );

    const headerSearch = document.querySelector('#searchInput');
    headerSearch.value = 'not-a-component';
    applySearch({ currentTarget: headerSearch });
    expect(sideSearch.value).toBe('not-a-component');
    expect(document.querySelector('#galleryEmpty').hidden).toBe(false);
    expect(document.querySelector('#catalogEmpty').hidden).toBe(false);
  });

  it('preserves the active card when filters are changed and restored', () => {
    const effect = EFFECTS.find((item) => item.id === 'wave');
    document.querySelector(`.component-card[data-id="${effect.id}"]`).click();
    expect(selectedEffect.id).toBe(effect.id);

    const textFilter = document.querySelector('#categoryFilters [data-category="Text"]');
    textFilter.click();
    const sideSearch = document.querySelector('#sideSearchInput');
    sideSearch.value = 'wave';
    applySearch({ currentTarget: sideSearch });

    expect(document.querySelectorAll('.component-card[aria-current="true"]')).toHaveLength(1);
    expect(document.querySelector('.component-card[aria-current="true"]').dataset.id).toBe(effect.id);

    sideSearch.value = '';
    applySearch({ currentTarget: sideSearch });
    expect(document.querySelector('.component-card[aria-current="true"]').dataset.id).toBe(effect.id);
  });

  it('locks gallery, category, and search controls while an AI request is active', () => {
    setNavigationLocked(true);

    expect(document.querySelector('.component-card').disabled).toBe(true);
    expect(document.querySelector('#allComponentsFilter').disabled).toBe(true);
    expect(document.querySelector('.category-nav-filter').disabled).toBe(true);
    expect(document.querySelector('#categoryFilters button').disabled).toBe(true);
    expect(document.querySelector('#sideSearchInput').disabled).toBe(true);

    setNavigationLocked(false);
    expect(document.querySelector('.component-card').disabled).toBe(false);
  });
});
