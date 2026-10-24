/* Entry point for index.html — the effects library. */
import '../styles/style.css';
import { $, guard, report, installGlobalErrorHandlers } from '../lib/dom.js';
import { applyThemeIcon, toggleTheme } from '../lib/theme.js';
import { EFFECTS, BY_ID } from '../effects/registry.js';
import { loadAIState, loadAISettings } from '../ai/state.js';
import { consumePendingMarker } from '../ai/request.js';
import { buildNav, applySearch, openSidebar, closeSidebar, shuffleComponents } from './library/nav.js';
import {
  selectEffect, showDiscovery, showMissingComponent, rebuild, replay,
  onInput, onCopy, handleCodeTabEvent, onCopyTab, toggleFullscreen,
  isFullscreen, updateFullscreenUI
} from './library/viewer.js';
import { initAIPanel, announceInterruptedRequest, resetToOriginal, exportDraftFile } from './library/ai-panel.js';

function wire() {
  const on = (id, evt, fn) => { const n = $(id); if (n) n.addEventListener(evt, fn); };

  const searchBox = $('componentSearch');
  const placeSearch = () => {
    const target = window.matchMedia('(max-width: 700px)').matches
      ? $('searchDrawerSlot')
      : $('searchNavbarSlot');
    if (!searchBox || !target) return;
    target.append(searchBox);
    searchBox.classList.toggle('sidebar-search', target.id === 'searchDrawerSlot');
  };

  placeSearch();
  on('menuToggle', 'click', guard(openSidebar, 'openSidebar'));
  on('sideClose', 'click', guard(closeSidebar, 'closeSidebar'));
  on('sideOverlay', 'click', guard(closeSidebar, 'closeSidebar'));
  on('shuffleComponents', 'click', guard(shuffleComponents, 'shuffleComponents'));
  on('themeToggle', 'click', guard(toggleTheme, 'theme'));
  on('per', 'change', guard(rebuild, 'per'));
  on('preset', 'change', guard(rebuild, 'preset'));
  on('text', 'input', guard(onInput, 'input'));
  on('replay', 'click', guard(replay, 'replay'));
  on('previewReset', 'click', guard(replay, 'previewReset'));
  on('restoreOriginalBtn', 'click', guard(resetToOriginal, 'restoreOriginal'));
  on('previewFullscreen', 'click', guard(toggleFullscreen, 'toggleFullscreen'));
  on('stageExitFs', 'click', guard(toggleFullscreen, 'stageExitFs'));
  on('exportComponent', 'click', guard(exportDraftFile, 'exportComponent'));
  on('copy', 'click', guard(onCopy, 'copy'));
  on('copyTab', 'click', guard(onCopyTab, 'copyTab'));
  const codeTabs = $('codeTabs');
  if (codeTabs) {
    codeTabs.addEventListener('click', handleCodeTabEvent);
    codeTabs.addEventListener('keydown', handleCodeTabEvent);
  }
  on('backToComponents', 'click', () => showDiscovery('All', { updateURL: true }));
  on('routeErrorBack', 'click', () => showDiscovery('All', { updateURL: true }));

  const search = $('searchInput');
  const searchKbd = $('searchKbd');

  const clearAndResetSearch = (resetCategory = false) => {
    if (!search) return;
    search.value = '';
    applySearch({ currentTarget: search });
    if (resetCategory) {
      showDiscovery('All', { updateURL: true, scroll: false });
    }
    search.focus();
  };

  if (search) {
    search.addEventListener('input', guard(applySearch, 'search'));
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        search.value = '';
        applySearch({ currentTarget: search });
        search.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const firstCard = document.querySelector('#componentGrid .component-card:not(:disabled)');
        const firstLink = document.querySelector('#nav .component-link:not(:disabled)');
        const catalog = $('catalogSection');
        if (firstCard && (!catalog || !catalog.hidden)) {
          firstCard.focus();
        } else if (firstLink) {
          firstLink.focus();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const firstCard = document.querySelector('#componentGrid .component-card:not(:disabled)');
        const firstLink = document.querySelector('#nav .component-link:not(:disabled)');
        const catalog = $('catalogSection');
        if (firstCard && (!catalog || !catalog.hidden)) {
          firstCard.click();
        } else if (firstLink) {
          firstLink.click();
        }
      }
    });
  }

  on('clearSearch', 'click', () => clearAndResetSearch(true));
  on('searchClearBtn', 'click', () => clearAndResetSearch(false));
  if (searchKbd) {
    searchKbd.addEventListener('click', () => {
      if (search && !search.disabled) {
        search.focus();
        search.select();
      }
    });
  }

  document.querySelectorAll('.topnav a[href="#"], .logo[href="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showDiscovery('All', { updateURL: true });
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isFullscreen()) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      const side = $('sidePanel');
      if (side && side.classList.contains('open')) closeSidebar();
    }
    if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
      e.preventDefault();
      if (search && !search.disabled) {
        if (window.matchMedia('(max-width: 700px)').matches) openSidebar();
        const catalog = $('catalogSection');
        if (catalog && catalog.hidden) {
          showDiscovery('All', { updateURL: true, scroll: false });
        }
        search.focus();
        search.select();
      }
    }
  });
  window.addEventListener('resize', () => {
    placeSearch();
    if (window.innerWidth > 900) closeSidebar();
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullscreen()) {
      updateFullscreenUI(false);
    }
  });
  window.addEventListener('popstate', () => openCurrentRoute());
  closeSidebar();
}

function openCurrentRoute() {
  const componentId = new URLSearchParams(window.location.search).get('component');
  if (!componentId) {
    showDiscovery('All', { scroll: false });
    return;
  }
  const effect = BY_ID[componentId];
  if (!effect) {
    showMissingComponent();
    return;
  }
  selectEffect(effect, false, { updateURL: false });
}

function boot() {
  installGlobalErrorHandlers();
  loadAISettings();
  loadAIState();

  try {
    buildNav(
      selectEffect,
      (category) => showDiscovery(category, { updateURL: true })
    );
  } catch (err) { report(err, 'buildNav'); }
  try { initAIPanel(); } catch (err) { report(err, 'initAIPanel'); }
  try { wire(); } catch (err) { report(err, 'wire'); }
  try { applyThemeIcon(); } catch (err) { report(err, 'theme'); }

  try { openCurrentRoute(); } catch (err) { report(err, 'boot'); }

  try { announceInterruptedRequest(consumePendingMarker()); } catch (err) { report(err, 'interruptedRequest'); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
