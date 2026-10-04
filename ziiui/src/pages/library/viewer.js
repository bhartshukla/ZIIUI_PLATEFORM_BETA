/* The effect viewer: text controls, code generation, live preview, copy. */
import { $, esc, norm, say, report } from '../../lib/dom.js';
import { copyText } from '../../lib/clipboard.js';
import { injectDebug, setFrameHTML, errorDoc } from '../../lib/preview.js';
import { FIELD_LABELS } from '../../effects/registry.js';
import { isBusy } from '../../ai/request.js';
import { store, hooks, activeCode } from './store.js';
import { markCurrent, closeSidebar } from './nav.js';

const MAX = 3000;
const DEBOUNCE = 250;
const PLACEHOLDER = 'Your text here';

let buildTimer = null;
let nonce = 0;
let copyBusy = false;
let copyReset = null;

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
    $('code-out').textContent = store.html;
    $('label').textContent = cur.name + (cur.opts ? ' · ' + $('per').value + ' · ' + $('preset').value : '');
    $('frame').title = 'Preview of ' + cur.name;
    updateHint(empty);

    hooks.afterBuild(store.html); // syncs AI state / edited code
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

export function selectEffect(e, fromUser) {
  if (isBusy()) { say('AI is working… Component selection is temporarily locked.'); return; }
  if (!e) return;
  store.cur = e;
  store.dirty = false;
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
    say('Showing ' + e.name + (e.cat === 'Cursor' ? '. Its text field is below the preview.' : ''));
    if (window.matchMedia('(max-width: 900px)').matches) closeSidebar();
  }
}

export async function onCopy() {
  if (copyBusy) return;
  flushBuild();
  if (!store.html) return;
  copyBusy = true;
  const btn = $('copy');
  let ok = false;
  try { ok = await copyText(store.html); } catch (err) { report(err, 'copy'); }
  if (btn) { btn.textContent = ok ? 'Copied!' : 'Copy failed'; btn.dataset.state = ok ? 'ok' : 'fail'; }
  say(ok ? 'Code copied to clipboard' : 'Copy failed.');
  clearTimeout(copyReset);
  copyReset = setTimeout(() => {
    if (btn) { btn.textContent = 'Copy code'; delete btn.dataset.state; }
    copyBusy = false;
  }, 1800);
}
