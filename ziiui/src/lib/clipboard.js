function legacyCopy(text) {
  const prev = document.activeElement;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);
  let ok = false;
  try {
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
  } catch (_) { ok = false; }
  ta.remove();
  if (prev && prev.focus) { try { prev.focus(); } catch (_) { /* ignore */ } }
  return ok;
}

/** Copy text; uses the async Clipboard API when possible, else execCommand. */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fall back */ }
  }
  return legacyCopy(text);
}
