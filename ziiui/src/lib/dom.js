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
let statusSeq = 0;
/** Announce a message to screen readers via the #status live region. */
export function say(msg) {
  const el = $('status');
  if (!el) return;
  const seq = ++statusSeq;
  el.textContent = '';
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    if (seq !== statusSeq) return;
    el.textContent = msg;
  }, 30);
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

/** Trigger a client-side download of a text/html file. */
export function exportFile(filename, content, type = 'text/html') {
  if (typeof document === 'undefined') return false;
  try {
    const text = String(content || '');
    let url;
    if (typeof URL.createObjectURL === 'function' && typeof Blob !== 'undefined') {
      const blob = new Blob([text], { type });
      url = URL.createObjectURL(blob);
    } else {
      url = 'data:' + type + ';charset=utf-8,' + encodeURIComponent(text);
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'component.html';
    a.addEventListener('click', (e) => {
      if (typeof window !== 'undefined' && window.navigator && /jsdom/i.test(window.navigator.userAgent)) {
        e.preventDefault();
      }
    });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      if (typeof URL.revokeObjectURL === 'function' && url && !url.startsWith('data:')) {
        URL.revokeObjectURL(url);
      }
    }, 150);
    return true;
  } catch (err) {
    report(err, 'exportFile');
    return false;
  }
}
