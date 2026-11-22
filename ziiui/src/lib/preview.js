/* Secure preview iframe lifecycle for ZiiUI component previews.
 *
 * Security model:
 * - Preview iframes use opaque-origin sandboxing (no allow-same-origin)
 * - Each preview gets a unique nonce and generation ID
 * - All iframe->parent messages are validated by source + nonce + generation
 * - Cleanup protocol uses postMessage with acknowledgement
 */
import { esc, say } from './dom.js';

/** Build an empty preview document. */
export function emptyPreviewDoc() {
  return '<!DOCTYPE html><html><head></head><body></body></html>';
}

/** Build an error page with the given title and message. */
export function errorDoc(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
</head>
<body><pre>${esc(message)}</pre></body>
</html>`;
}

/* Per-iframe lifecycle state, keyed by iframe DOM node. */
const frames = new WeakMap();

function getRecord(frame) {
  let record = frames.get(frame);
  if (!record) {
    record = {
      generation: 0,
      activeGeneration: null,
      activeNonce: null,
      requestedGeneration: null,
      requestedNonce: null,
      pending: null,
      aborted: false,
    };
    frames.set(frame, record);
  }
  return record;
}

function settle(pending, result) {
  if (!pending || pending.settled) {return;}
  pending.settled = true;
  if (pending.timeoutId) {
    clearTimeout(pending.timeoutId);
    pending.timeoutId = null;
  }
  pending.resolve(result);
}

/** Build the debug hook injected into every preview document.
 *
 * The hook:
 * 1. Exposes __ziiuiNonce and __ziiuiGeneration for cleanup correlation
 * 2. Provides a default no-op __ziiuiCleanup (effects can override)
 * 3. Reports runtime errors and unhandled rejections to parent
 * 4. Handles cleanup requests from parent (ziiui:cleanup)
 */
function createDebugHook(nonce, generation) {
  return `<script>
window.__ziiuiNonce = ${JSON.stringify(nonce)};
window.__ziiuiGeneration = ${generation};
window.__ziiuiCleanup = function() {};
window.addEventListener("error",function(e){try{parent.postMessage({type:"ziiui:error",nonce:window.__ziiuiNonce,generation:window.__ziiuiGeneration,message:String((e&&e.message)||e)},"*");}catch(_){}});
window.addEventListener("unhandledrejection",function(e){try{parent.postMessage({type:"ziiui:error",nonce:window.__ziiuiNonce,generation:window.__ziiuiGeneration,message:"Promise: "+String((e&&e.reason)||e)},"*");}catch(_){}});
window.addEventListener("message",function(e){
  if (e.source !== parent) return;
  if (!e.data || e.data.type !== "ziiui:cleanup") return;
  if (e.data.nonce !== window.__ziiuiNonce) return;
  if (e.data.generation !== window.__ziiuiGeneration) return;
  try { window.__ziiuiCleanup(); } catch (_) {}
  try { parent.postMessage({type:"ziiui:ack:cleanup",nonce:window.__ziiuiNonce,generation:window.__ziiuiGeneration},"*"); } catch (_) {}
});

// Preview-only link blocking: prevent dead "#" / empty href navigation
(function(){
  function isDeadLink(a){return !a || a.tagName !== 'A' || !(a.getAttribute('href') === '#' || a.getAttribute('href') === '');}
  function onLinkClick(e){
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) { a = e.target.tagName === 'A' ? e.target : null; }
    if (isDeadLink(a)) {return;}
    e.preventDefault();
    e.stopPropagation();
    try{parent.postMessage({type:"ziiui:blocked:link",nonce:window.__ziiuiNonce,generation:window.__ziiuiGeneration,href:a.getAttribute('href')},"*");}catch(_){}
  }
  document.addEventListener('click',onLinkClick,true);
})();
</script>`;
}

const urls = new WeakMap();

/** Inject debug hook after <head> (case-insensitive, handles attributes, missing head). */
export function injectDebugHook(html, hook) {
  const src = String(html || '');
  const marker = '<head';
  const i = src.toLowerCase().indexOf(marker);
  if (i === -1) { return `${hook}\n${src}`; }
  const gt = src.indexOf('>', i);
  if (gt === -1) { return `${hook}\n${src}`; }
  const at = gt + 1;
  return `${src.slice(0, at)}\n${hook}${src.slice(at)}`;
}

/** Request cleanup of the current preview in an iframe.
 *
 * Sends ziiui:cleanup to the iframe and waits for ziiui:ack:cleanup
 * or a 500ms timeout. Returns a Promise that settles exactly once.
 *
 * Results:
 *   { acknowledged: true, nonce }  - iframe acknowledged cleanup
 *   { timedOut: true }              - timeout before ACK
 *   { superseded: true }            - a newer cleanup replaced this one
 *   { error: true, message }        - postMessage threw
 *   { noPreview: true }             - no active preview to clean
 */
export function requestCleanup(frame) {
  if (!frame) {return Promise.resolve({ noPreview: true });}

  const record = getRecord(frame);
  if (!record.activeNonce) {
    return Promise.resolve({ noPreview: true });
  }

  // Same generation cleanup already pending -> return same Promise
  if (record.pending && !record.pending.settled && record.pending.generation === record.activeGeneration) {
    return record.pending.promise;
  }

  // Abort any pending cleanup for a different generation
  if (record.pending && !record.pending.settled) {
    settle(record.pending, { superseded: true, supersededBy: record.generation });
    record.pending = null;
  }

  return new Promise((resolve) => {
    let settledLocally = false;
    const timeoutId = setTimeout(() => {
      if (!settledLocally) {
        settledLocally = true;
        settle(record.pending, { timedOut: true });
        record.pending = null;
      }
    }, 500);

    const pending = {
      op: 'replace',
      generation: record.activeGeneration,
      nonce: record.activeNonce,
      promise: null,
      resolve,
      reject: null,
      timeoutId,
      settled: false,
    };

    pending.promise = pending;
    record.pending = pending;

    try {
      frame.contentWindow.postMessage(
        { type: 'ziiui:cleanup', nonce: pending.nonce, generation: pending.generation },
        '*'
      );
    } catch (err) {
      if (!pending.settled) {
        pending.settled = true;
        settle(pending, { error: true, message: String(err) });
        record.pending = null;
      }
    }
  });
}

/** Load HTML into an iframe securely.
 *
 * Sets sandbox attribute BEFORE assigning srcdoc/src.
 * Injects nonce/generation into DEBUG_HOOK.
 * Does NOT await cleanup - call requestCleanup() separately if needed.
 * Normal-motion animation behavior is unchanged.
 */
export function setFrameHTML(frame, source) {
  if (!frame) {return;}

  const record = getRecord(frame);
  const generation = ++record.generation;
  const nonce = crypto.randomUUID();

  // MARK requested identity (not yet active - confirmed by ziiui:ready)
  record.requestedGeneration = generation;
  record.requestedNonce = nonce;

  const content = String(source == null ? '' : source);

  // Revoke old blob URL
  const old = urls.get(frame);
  if (old) {
    URL.revokeObjectURL(old);
    urls.delete(frame);
  }

  // Inject DEBUG_HOOK with nonce/generation
  const hook = createDebugHook(nonce, generation);
  const contentWithHook = injectDebugHook(content, hook);

  if ('srcdoc' in frame) {
    // Remove src attribute first, then set sandbox BEFORE srcdoc
    if (frame.hasAttribute('src')) {
      frame.removeAttribute('src');
    }
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock');
    frame.srcdoc = contentWithHook;
    return;
  }

  // Fallback for environments where srcdoc is not supported
  try {
    const blob = new Blob([contentWithHook], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    urls.set(frame, url);
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock');
    frame.src = url;
  } catch (_) {
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock');
    frame.src = `data:text/html;charset=utf-8,${encodeURIComponent(contentWithHook)}`;
  }
}

/** Clear an iframe completely to stop running animation loops and release resources.
 *
 * Sends cleanup request first, then clears the document.
 * Returns a Promise that settles when cleanup completes (ACK or timeout).
 */
export async function clearFrameHTML(frame) {
  if (!frame) {return;}

  const record = getRecord(frame);

  // Send cleanup if there's an active preview
  if (record.activeNonce) {
    await requestCleanup(frame);
  }

  // Revoke old blob URL
  const old = urls.get(frame);
  if (old) {
    URL.revokeObjectURL(old);
    urls.delete(frame);
  }

  // Clear document
  if ('srcdoc' in frame) {
    frame.srcdoc = '';
  }
  if (frame.hasAttribute('src')) {
    frame.removeAttribute('src');
  }

  // Clear state
  record.activeNonce = null;
  record.activeGeneration = null;
  record.requestedGeneration = null;
  record.requestedNonce = null;
}

/** Full lifecycle preview replacement.
 *
 * 1. Clean up old preview (await acknowledgement or timeout)
 * 2. Revoke old Blob URL
 * 3. Clear old document
 * 4. Assign new sandbox
 * 5. Generate new nonce
 * 6. Inject new DEBUG_HOOK
 * 7. Load new preview
 *
 * Returns a Promise that settles when the operation completes.
 */
export async function requestFrameHTML(frame, source) {
  if (!frame) {return { noPreview: true };}

  const record = getRecord(frame);
  const generation = ++record.generation;
  const nonce = crypto.randomUUID();

  record.requestedGeneration = generation;
  record.requestedNonce = nonce;

  // Phase 1: Clean up old preview
  if (record.activeNonce) {
    const cleanupResult = await requestCleanup(frame);

    if (cleanupResult.superseded) {
      return { superseded: true };
    }

    if (record.requestedGeneration !== generation) {
      return { superseded: true };
    }
  }

  // Phase 2: Clear old document
  const old = urls.get(frame);
  if (old) {
    URL.revokeObjectURL(old);
    urls.delete(frame);
  }
  if ('srcdoc' in frame) {
    frame.srcdoc = '';
  }
  if (frame.hasAttribute('src')) {
    frame.removeAttribute('src');
  }

  // Phase 3: Set active identity
  record.activeNonce = nonce;
  record.activeGeneration = generation;

  if (record.requestedGeneration !== generation) {
    return { superseded: true };
  }

  // Phase 4: Load new preview
  const content = String(source == null ? '' : source);
  const hook = createDebugHook(nonce, generation);
  const contentWithHook = injectDebugHook(content, hook);

  if ('srcdoc' in frame) {
    if (frame.hasAttribute('src')) {
      frame.removeAttribute('src');
    }
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock');
    frame.srcdoc = contentWithHook;
  } else {
    try {
      const blob = new Blob([contentWithHook], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      urls.set(frame, url);
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock');
      frame.src = url;
    } catch (_) {
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock');
      frame.src = `data:text/html;charset=utf-8,${encodeURIComponent(contentWithHook)}`;
    }
  }

  record.requestedGeneration = null;
  record.requestedNonce = null;

  return { loaded: true, nonce, generation };
}

/** Pure, testable preview message handler.
 *
 * Mutates `record` according to the validated message and returns
 * true when the message was accepted, false when rejected.
 * All security checks (type, nonce, generation) are preserved.
 */
export function handlePreviewMessage(record, event) {
  if (!record || record.aborted) {return false;}

  const type = event?.data?.type;
  if (type !== 'ziiui:ack:cleanup' && type !== 'ziiui:error' && type !== 'ziiui:ready' && type !== 'ziiui:blocked:link') {
    return false;
  }

  if (type === 'ziiui:ready') {
    if (event.data.nonce !== record.requestedNonce) {return false;}
    if (event.data.generation !== record.requestedGeneration) {return false;}

    record.activeNonce = record.requestedNonce;
    record.activeGeneration = record.requestedGeneration;
    record.requestedGeneration = null;
    record.requestedNonce = null;
    return true;
  }

  if (type === 'ziiui:blocked:link') {
    return typeof event.data.nonce === 'string';
  }

  const pending = record.pending;
  if (!pending || pending.settled) {return false;}

  if (event.data.nonce !== pending.nonce) {return false;}
  if (event.data.generation !== pending.generation) {return false;}

  if (type === 'ziiui:ack:cleanup') {
    if (typeof event.data.nonce !== 'string') {return false;}
    settle(pending, { acknowledged: true, nonce: event.data.nonce });
    record.pending = null;
    return true;
  }

  if (type === 'ziiui:error') {
    return true;
  }

  return false;
}

export function installPreviewMessageHandler() {
  window.addEventListener('message', (e) => {
    let targetFrame = null;
    for (const [frame] of frames.entries()) {
      if (e.source === frame.contentWindow) {
        targetFrame = frame;
        break;
      }
    }

    if (!targetFrame) {return;}

    const record = getRecord(targetFrame);
    const accepted = handlePreviewMessage(record, e);

    if (accepted && e.data?.type === 'ziiui:error') {
      if (typeof e.data.message === 'string' && e.data.message.length <= 1000) {
        console.error('[ziiui:preview]', e.data.message);
        say(`Preview error: ${e.data.message}`);
      }
    }

    if (accepted && e.data?.type === 'ziiui:blocked:link') {
      console.warn('[ziiui:preview] blocked dead link:', e.data.href);
    }
  });
}
/** Mark an iframe as removed/aborted. Call when iframe is detached from DOM.
 *
 * Settles any pending cleanup exactly once with { aborted: true }.
 * Prevents all outstanding async operations from continuing.
 */
export function abortFrame(frame) {
  const record = frames.get(frame);
  if (!record) {return;}

  record.aborted = true;
  if (record.pending && !record.pending.settled) {
    settle(record.pending, { aborted: true });
    record.pending = null;
  }
  frames.delete(frame);
}
