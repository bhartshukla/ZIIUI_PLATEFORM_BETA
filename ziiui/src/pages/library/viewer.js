/* The effect viewer: text controls, code generation, live preview, copy. */
import { $, esc, norm, say, report } from '../../lib/dom.js';
import { copyText } from '../../lib/clipboard.js';
import { injectDebug, setFrameHTML, errorDoc } from '../../lib/preview.js';
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

export function splitComponentCode(source) {
  const document = new DOMParser().parseFromString(String(source || ''), 'text/html');
  const styleBlocks = [...document.querySelectorAll('style')].map((node) => node.textContent.trim()).filter(Boolean);
  const stylesheets = [...document.querySelectorAll('link[rel~="stylesheet"][href]')]
    .map((node) => `@import url(${JSON.stringify(node.getAttribute('href'))});`);
  const scripts = [...document.querySelectorAll('script')].map((node) => {
    const src = node.getAttribute('src');
    return src ? `// External script: ${src}` : node.textContent.trim();
  }).filter(Boolean);
  const markup = document.documentElement.cloneNode(true);
  markup.querySelectorAll('style, script, link[rel~="stylesheet"]').forEach((node) => node.remove());

  return {
    html: `<!DOCTYPE html>\n${markup.outerHTML}`,
    css: [...stylesheets, ...styleBlocks].join('\n\n'),
    js: scripts.join('\n\n')
  };
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

/** Render `code` (default: the active code) in the preview iframe. */
export function play(code) {
  const src = code || activeCode();
  if (!src) return;
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
    const generated = cur.opts ? cur.code($('per').value, $('preset').value) : cur.code();
    store.html = String(generated).replace(/__TEXT__/g, () => esc(empty ? PLACEHOLDER : raw));
    $('label').textContent = cur.name + (cur.opts ? ' · ' + $('per').value + ' · ' + $('preset').value : '');
    $('frame').title = 'Preview of ' + cur.name;
    updateHint(empty);

    hooks.afterBuild(store.html); // syncs AI state / edited code
    renderCodeView(activeCode());
    play(activeCode());
  } catch (err) {
    store.html = '';
    const out = $('code-out');
    if (out) out.textContent = 'Could not build this effect: ' + err.message;
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
    const preview = $('previewCard');
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
    fab.hidden = true;
    fab.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
  }
  const panel = $('aiPanel');
  if (panel) panel.hidden = true;
  document.body.style.overflow = '';
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
  if (btn) { btn.textContent = ok ? 'Copied full component!' : 'Copy failed'; btn.dataset.state = ok ? 'ok' : 'fail'; }
  say(ok ? 'Code copied to clipboard' : 'Copy failed.');
  clearTimeout(copyReset);
  copyReset = setTimeout(() => {
    if (btn) { btn.textContent = 'Copy full component'; delete btn.dataset.state; }
    copyBusy = false;
  }, 1800);
}
