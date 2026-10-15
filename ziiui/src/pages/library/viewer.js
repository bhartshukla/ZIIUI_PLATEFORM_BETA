/* The effect viewer: text controls, code generation, live preview, copy. */
import { $, esc, norm, say, report } from '../../lib/dom.js';
import { copyText } from '../../lib/clipboard.js';
import { injectDebug, setFrameHTML, clearFrameHTML, errorDoc } from '../../lib/preview.js';
import { FIELD_LABELS } from '../../effects/registry.js';
import { isBusy } from '../../ai/request.js';
import { store, hooks, activeCode } from './store.js';
import { markCurrent, closeSidebar, showAllComponents } from './nav.js';

const MAX = 3000;
const DEBOUNCE = 250;
const PLACEHOLDER = 'Your text here';

let buildTimer = null;
let nonce = 0;
let copyBusy = false;
let copyReset = null;
let codeTab = 'html';
let previewLoadSafetyTimer = null;

export function showPreviewLoading() {
  clearTimeout(previewLoadSafetyTimer);
  const loader = $('previewLoader');
  if (loader) {
    loader.hidden = false;
    loader.classList.remove('hidden');
    loader.setAttribute('aria-hidden', 'false');
  }
  previewLoadSafetyTimer = setTimeout(() => {
    hidePreviewLoading();
  }, 6000);
}

export function hidePreviewLoading() {
  clearTimeout(previewLoadSafetyTimer);
  previewLoadSafetyTimer = null;
  const loader = $('previewLoader');
  if (loader) {
    loader.classList.add('hidden');
    loader.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (loader && loader.classList.contains('hidden')) loader.hidden = true;
    }, 200);
  }
}

function wireFrameEvents() {
  const frame = $('frame');
  if (frame && !frame.__ziiuiWired) {
    frame.__ziiuiWired = true;
    frame.addEventListener('load', () => {
      hidePreviewLoading();
    });
  }
}

const codeSplitCache = new Map();
const MAX_SPLIT_CACHE = 25;

export function splitComponentCode(source) {
  const src = String(source || '');
  if (codeSplitCache.has(src)) return codeSplitCache.get(src);

  const document = new DOMParser().parseFromString(src, 'text/html');
  const styleBlocks = [...document.querySelectorAll('style')].map((node) => node.textContent.trim()).filter(Boolean);
  const stylesheets = [...document.querySelectorAll('link[rel~="stylesheet"][href]')]
    .map((node) => `@import url(${JSON.stringify(node.getAttribute('href'))});`);
  const scripts = [...document.querySelectorAll('script')].map((node) => {
    const scriptSrc = node.getAttribute('src');
    return scriptSrc ? `// External script: ${scriptSrc}` : node.textContent.trim();
  }).filter(Boolean);
  const markup = document.documentElement.cloneNode(true);
  markup.querySelectorAll('style, script, link[rel~="stylesheet"]').forEach((node) => node.remove());

  const result = {
    html: `<!DOCTYPE html>\n${markup.outerHTML}`,
    css: [...stylesheets, ...styleBlocks].join('\n\n'),
    js: scripts.join('\n\n')
  };

  if (codeSplitCache.size >= MAX_SPLIT_CACHE) {
    const firstKey = codeSplitCache.keys().next().value;
    codeSplitCache.delete(firstKey);
  }
  codeSplitCache.set(src, result);
  return result;
}

function renderCodeView(source = activeCode()) {
  const output = $('code-out');
  const panel = $('codePanel');
  const selectedTab = $(`codeTab${codeTab[0].toUpperCase()}${codeTab.slice(1)}`);
  if (!output) return;
  const sections = splitComponentCode(source);
  const content = sections[codeTab];
  output.textContent = content || `No ${codeTab === 'js' ? 'JavaScript' : codeTab.toUpperCase()} in this component.`;
  if (panel && selectedTab) panel.setAttribute('aria-labelledby', selectedTab.id);
  document.querySelectorAll('.code-tab').forEach((tab) => {
    const selected = tab.dataset.codeTab === codeTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
}

export function refreshCodeView() {
  renderCodeView(activeCode());
}

export function handleCodeTabEvent(event) {
  const tabs = [...document.querySelectorAll('.code-tab')];
  if (!tabs.length) return;
  const current = event.target.closest('.code-tab');
  if (!current) return;
  if (event.type === 'click') {
    codeTab = current.dataset.codeTab;
    renderCodeView();
    return;
  }
  const index = tabs.indexOf(current);
  let next = index;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  else return;
  event.preventDefault();
  codeTab = tabs[next].dataset.codeTab;
  renderCodeView();
  tabs[next].focus();
}

function updatePreviewHeight(effect) {
  const frame = $('frame');
  if (!frame) return;
  frame.classList.remove('preview-compact', 'preview-large');
  frame.classList.add(effect.previewSize === 'large' ? 'preview-large' : 'preview-compact');
}

const buildCache = new Map();
const MAX_BUILD_CACHE = 50;

function getBuildCacheKey(id, opts, per, preset) {
  return opts ? `${id}:${per}:${preset}` : id;
}

/** Render `code` (default: the active code) in the preview iframe. */
export function play(code) {
  const src = code || activeCode();
  if (!src) return;
  wireFrameEvents();
  showPreviewLoading();
  nonce++;
  setFrameHTML($('frame'), injectDebug(src + '\n<!-- ' + nonce + ' -->'));
}

function updateHint(empty, trimmed) {
  const h = $('hint');
  if (!h) return;
  const ta = $('text');
  const n = ta ? ta.value.length : 0;
  h.classList.toggle('warn', !!trimmed);
  h.textContent = trimmed
    ? 'Text was trimmed to ' + MAX.toLocaleString() + ' characters.'
    : empty ? 'Text is empty, so the placeholder is shown.'
      : n.toLocaleString() + ' / ' + MAX.toLocaleString() + ' characters';
}

export function rebuild() {
  clearTimeout(buildTimer);
  buildTimer = null;
  const cur = store.cur;
  if (!cur) return;
  try {
    const ta = $('text');
    const raw = norm(ta ? ta.value : '');
    const empty = !raw.trim();
    const perVal = cur.opts && $('per') ? $('per').value : '';
    const presetVal = cur.opts && $('preset') ? $('preset').value : '';

    let generated;
    const cacheKey = getBuildCacheKey(cur.id, cur.opts, perVal, presetVal);
    if (buildCache.has(cacheKey)) {
      generated = buildCache.get(cacheKey);
    } else {
      generated = cur.opts ? cur.code(perVal, presetVal) : cur.code();
      if (buildCache.size >= MAX_BUILD_CACHE) {
        const firstKey = buildCache.keys().next().value;
        buildCache.delete(firstKey);
      }
      buildCache.set(cacheKey, generated);
    }

    store.html = String(generated).replace(/__TEXT__/g, () => esc(empty ? PLACEHOLDER : raw));
    $('label').textContent = cur.name + (cur.opts ? ' · ' + perVal + ' · ' + presetVal : '');
    $('frame').title = 'Preview of ' + cur.name;
    updateHint(empty);

    hooks.afterBuild(store.html); // syncs AI state / edited code
    renderCodeView(activeCode());
    play(activeCode());
  } catch (err) {
    store.html = '';
    const out = $('code-out');
    if (out) out.textContent = 'Could not build this effect: ' + err.message;
    hidePreviewLoading();
    setFrameHTML($('frame'), injectDebug(errorDoc('Build error', err.message)));
    report(err, 'rebuild');
  }
}

function scheduleBuild() {
  clearTimeout(buildTimer);
  buildTimer = setTimeout(rebuild, DEBOUNCE);
}
export function flushBuild() { if (buildTimer) rebuild(); }

export function replay() {
  if (buildTimer) { rebuild(); return; }
  play(activeCode());
}

export function onInput() {
  store.dirty = true;
  const ta = $('text');
  if (!ta) return;
  let trimmed = false;
  if (ta.value.length > MAX) {
    let v = ta.value.slice(0, MAX);
    if (/[\uD800-\uDBFF]$/.test(v)) v = v.slice(0, -1); // never cut a surrogate pair
    ta.value = v;
    trimmed = true;
  }
  updateHint(!ta.value.trim(), trimmed);
  scheduleBuild();
}

function placeTextField(e) {
  const mode = e.field === 'none' ? 'none' : (e.cat === 'Cursor' ? 'slot' : 'controls');
  const tblock = $('tblock'), cslot = $('cslot'), controls = $('controls');
  if (mode === 'slot' && cslot) cslot.append(tblock);
  else if (mode === 'controls' && controls) controls.append(tblock);
  if (cslot) cslot.hidden = mode !== 'slot';
  const ccard = $('ccard');
  if (ccard) ccard.hidden = mode !== 'controls';
  if (controls) controls.classList.toggle('no-opts', !e.opts);
  const tl = $('tlabel');
  if (tl) tl.textContent = FIELD_LABELS[e.id] || 'Text';
}

function componentURL(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('component', id);
  else url.searchParams.delete('component');
  return url.pathname + url.search + url.hash;
}

function setDetailView(effect) {
  const catalog = $('catalogSection');
  const detail = $('componentDetail');
  const content = $('componentDetailContent');
  const error = $('routeError');
  const fab = $('aiFab');
  if (catalog) catalog.hidden = true;
  if (detail) detail.hidden = false;
  if (content) content.hidden = true;
  if (error) error.hidden = true;
  if ($('detailCategory')) $('detailCategory').textContent = effect.cat;
  if ($('detailName')) $('detailName').textContent = effect.name;
  if (fab) fab.hidden = false;
  if (content) content.hidden = false;
  document.title = `${effect.name} — ziiui Components`;
}

export function selectEffect(e, fromUser, options = {}) {
  if (isBusy()) { say('AI is working… Component selection is temporarily locked.'); return; }
  if (!e) return;
  if (options.updateURL !== false && fromUser) {
    window.history.pushState({ componentId: e.id }, '', componentURL(e.id));
  }
  wireFrameEvents();
  showPreviewLoading();
  store.cur = e;
  store.dirty = false;
  setDetailView(e);
  const ta = $('text');
  if (e.field !== 'none' && ta) ta.value = e.text || '';
  const opts = $('opts');
  if (opts) opts.hidden = !e.opts;
  try { placeTextField(e); } catch (err) { report(err, 'placeTextField'); }
  try { updatePreviewHeight(e); } catch (err) { report(err, 'previewHeight'); }
  $('pname').textContent = e.name;
  $('pcat').textContent = e.cat;
  $('pnote').textContent = e.note;
  markCurrent(e, fromUser);
  rebuild();
  try { hooks.afterSelect(); } catch (err) { report(err, 'afterSelect'); }
  if (fromUser) {
    say('Previewing ' + e.name + (e.cat === 'Cursor' ? '. Its text field is below the preview.' : ''));
    if (window.matchMedia('(max-width: 900px)').matches) closeSidebar();
    const detail = $('componentDetail');
    if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function showDiscovery(category = 'All', options = {}) {
  if (options.updateURL) {
    window.history.pushState({ componentId: null }, '', componentURL(null));
  }
  if (window.matchMedia('(max-width: 900px)').matches) closeSidebar();
  const catalog = $('catalogSection');
  const detail = $('componentDetail');
  const content = $('componentDetailContent');
  const error = $('routeError');
  const fab = $('aiFab');
  if (catalog) catalog.hidden = false;
  if (detail) detail.hidden = true;
  if (content) content.hidden = false;
  if (error) error.hidden = true;
  if (fab) {
    fab.hidden = false;
    fab.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
  }
  const panel = $('aiPanel');
  if (panel) panel.hidden = true;
  document.body.style.overflow = '';
  hidePreviewLoading();
  clearFrameHTML($('frame'));
  store.cur = null;
  store.html = '';
  store.edited = '';
  store.editActive = false;
  store.compState = null;
  store.dirty = false;
  document.title = 'ziiui — Creative Web Effects, Motion & Interactive Components';
  markCurrent(null, false);
  showAllComponents(category);
  hooks.afterSelect();
  if (options.scroll !== false && catalog) catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function showMissingComponent() {
  const catalog = $('catalogSection');
  const detail = $('componentDetail');
  const content = $('componentDetailContent');
  const error = $('routeError');
  const fab = $('aiFab');
  if (catalog) catalog.hidden = true;
  if (detail) detail.hidden = false;
  if (content) content.hidden = true;
  if (error) error.hidden = false;
  if (fab) fab.hidden = true;
  const panel = $('aiPanel');
  if (panel) panel.hidden = true;
  hidePreviewLoading();
  clearFrameHTML($('frame'));
  store.cur = null;
  store.html = '';
  store.edited = '';
  store.editActive = false;
  store.compState = null;
  document.title = 'Component not found — ziiui';
}

export async function onCopy() {
  if (copyBusy) return;
  flushBuild();
  const code = activeCode();
  if (!code) return;
  copyBusy = true;
  const btn = $('copy');
  let ok = false;
  try { ok = await copyText(code); } catch (err) { report(err, 'copy'); }
  if (btn) {
    btn.innerHTML = ok
      ? '<i class="ri-check-line" aria-hidden="true"></i> Copied full component!'
      : '<i class="ri-close-line" aria-hidden="true"></i> Copy failed';
    btn.dataset.state = ok ? 'ok' : 'fail';
  }
  say(ok ? 'Code copied to clipboard' : 'Copy failed.');
  clearTimeout(copyReset);
  copyReset = setTimeout(() => {
    if (btn) {
      btn.innerHTML = '<i class="ri-file-copy-line" aria-hidden="true"></i> Copy full component';
      delete btn.dataset.state;
    }
    copyBusy = false;
  }, 1800);
}
