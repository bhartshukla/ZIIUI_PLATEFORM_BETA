/* localStorage wrappers that never throw (private mode, quota, blocked storage). */

let onError = null;
/** Register a callback invoked (with the error) when a write fails. */
export function onStorageError(fn) { onError = fn; }

export function safeGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
export function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch (err) { if (onError) onError(err); return false; }
}
export function safeRemove(key) {
  try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
}

export function uid() {
  try {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch (_) { /* fall through */ }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
