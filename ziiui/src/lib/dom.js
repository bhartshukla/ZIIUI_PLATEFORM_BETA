/* Small DOM + status helpers shared by every page. */

export const $ = (id) => document.getElementById(id);

export const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Normalise CRLF / CR to LF. */
export const norm = (s) => String(s == null ? '' : s).replace(/\r\n?/g, '\n');

/** Indent every non-empty line by two spaces. */
export const indent = (s) =>
  norm(s).split('\n').map((l) => (l ? '  ' + l : l)).join('\n');

let statusTimer = null;
/** Announce a message to screen readers via the #status live region. */
export function say(msg) {
  const el = $('status');
  if (!el) return;
  el.textContent = '';
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.textContent = msg; }, 30);
}

export function report(err, ctx) {
  const msg = err && err.message ? err.message : String(err);
  console.error('[ziiui' + (ctx ? ':' + ctx : '') + ']', err);
  say('Something went wrong: ' + msg);
}

/** Wrap a handler so a thrown error is reported instead of breaking the page. */
export function guard(fn, ctx) {
  return function (...args) {
    try { return fn.apply(this, args); }
    catch (err) { report(err, ctx || fn.name || 'handler'); }
  };
}

/** Report uncaught errors and errors posted from sandboxed preview iframes. */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (e) => report(e.error || e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => report(e.reason, 'promise'));
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (d && d.__ziiui) {
      console.error('[ziiui:preview]', d.message);
      say('Preview error: ' + d.message);
    }
  });
}
