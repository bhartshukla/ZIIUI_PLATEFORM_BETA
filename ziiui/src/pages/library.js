/* Entry point for index.html — the effects library. */
import '../styles/style.css';
import { $, guard, report, installGlobalErrorHandlers } from '../lib/dom.js';
import { applyThemeIcon, toggleTheme } from '../lib/theme.js';
import { EFFECTS, BY_ID } from '../effects/registry.js';
import { loadAIState, loadAISettings, getActiveComponentId } from '../ai/state.js';
import { consumePendingMarker } from '../ai/request.js';
import { buildNav, applySearch, openSidebar, closeSidebar, shuffleComponents } from './library/nav.js';
import { selectEffect, rebuild, replay, onInput, onCopy } from './library/viewer.js';
import { initAIPanel, announceInterruptedRequest } from './library/ai-panel.js';

function wire() {
  const on = (id, evt, fn) => { const n = $(id); if (n) n.addEventListener(evt, fn); };

  on('menuToggle', 'click', guard(openSidebar, 'openSidebar'));
  on('sideClose', 'click', guard(closeSidebar, 'closeSidebar'));
  on('sideOverlay', 'click', guard(closeSidebar, 'closeSidebar'));
  on('shuffleComponents', 'click', guard(shuffleComponents, 'shuffleComponents'));
  on('themeToggle', 'click', guard(toggleTheme, 'theme'));
  on('per', 'change', guard(rebuild, 'per'));
  on('preset', 'change', guard(rebuild, 'preset'));
  on('text', 'input', guard(onInput, 'input'));
  on('replay', 'click', guard(replay, 'replay'));
  on('copy', 'click', guard(onCopy, 'copy'));

  const search = $('searchInput');
  if (search) {
    search.addEventListener('input', guard(applySearch, 'search'));
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { search.value = ''; applySearch(); search.blur(); }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const side = $('sidePanel');
      if (side && side.classList.contains('open')) closeSidebar();
    }
    if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
      e.preventDefault();
      if (search && search.offsetParent !== null && !search.disabled) { search.focus(); search.select(); }
    }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 900) closeSidebar(); });
}

function boot() {
  installGlobalErrorHandlers();
  loadAISettings();
  loadAIState();

  try { buildNav(selectEffect); } catch (err) { report(err, 'buildNav'); }
  try { initAIPanel(); } catch (err) { report(err, 'initAIPanel'); }
  try { wire(); } catch (err) { report(err, 'wire'); }
  try { applyThemeIcon(); } catch (err) { report(err, 'theme'); }

  const lastId = getActiveComponentId();
  const initial = lastId && BY_ID[lastId] ? BY_ID[lastId] : EFFECTS[0];
  try { selectEffect(initial, false); } catch (err) { report(err, 'boot'); }

  try { announceInterruptedRequest(consumePendingMarker()); } catch (_) { /* ignore */ }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
