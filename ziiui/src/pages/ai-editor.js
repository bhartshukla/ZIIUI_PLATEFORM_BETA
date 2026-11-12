/* Entry point for ai.html — full-page AI editor for one saved component. */
import { $, say, report, guard, installGlobalErrorHandlers, exportFile } from '../lib/dom.js';
import { copyText } from '../lib/clipboard.js';
import { injectDebug, setFrameHTML, emptyPreviewDoc } from '../lib/preview.js';
import {
  loadAIState, loadAISettings, getAIState, getAISettings, setAutoPreview,
  getComponent, getActiveComponentId, saveActiveComponentId, persistAIState,
  addMessage, addVersion, setCurrentCode, describeContext,
  getOrCreateComponentState, getMessages
} from '../ai/state.js';
import { EFFECTS, BY_ID } from '../effects/registry.js';
import { generateCode } from '../ai/client.js';
import { getUserFacingAIMessage } from '../ai/prompt.js';
import { beginRequest, endRequest, isBusy, isCurrent, isActiveRequest, cancelActiveRequest, consumePendingMarker, isDuplicateRequest } from '../ai/request.js';
import { createChatView } from '../ai/chat-view.js';

let activeId = null;
let compState = null;   // the active editing session (editing baseline)
let activeComponent = null; // the immutable source component
let autoTimer = null;
let chat = null;
let el = {};

const displayName = () => (activeComponent && (activeComponent.name || activeId)) || '';

/* ---------- rendering ---------- */
function runPreview() {
  const code = el.code.value;
  setFrameHTML(el.preview, code && code.trim() ? injectDebug(code) : emptyPreviewDoc());
}

function renderChat() {
  if (!compState) {
    chat.render([], 'Open a component in the library and use the AI panel, then come back here.');
    return;
  }
  chat.render(getMessages(compState.id), `No messages yet for "${  displayName()  }". Ask for a change below.`);
}

function updateIndicator() {
  el.context.textContent = compState ? describeContext(compState.id, displayName()) : 'No component';
}

function setLocked(locked) {
  el.banner.hidden = !locked;
  el.send.disabled = !!locked;
  el.select.disabled = !!locked;
}

function populatePicker() {
  const comps = Object.values(getAIState().components)
    .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
  el.select.innerHTML = '';
  comps.forEach((c) => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.name || c.id;
    el.select.append(o);
  });
  el.select.hidden = comps.length < 2;
  if (activeId) { el.select.value = activeId; }
}

/* ---------- component selection ---------- */
function setActive(id) {
  activeId = id;
  activeComponent = id ? getComponent(id) : null;
  compState = null;
  if (!activeComponent) {
    el.headSub.textContent = 'No component selected — open index.html first.';
    el.code.value = '';
    el.send.disabled = true;
    runPreview();
    renderChat();
    updateIndicator();
    return;
  }
  saveActiveComponentId(id);
  // Ensure a default workspace + editing session exists for this component.
  compState = getOrCreateComponentState(id, activeComponent.name, activeComponent.category, activeComponent.originalCode);
  el.send.disabled = false;
  el.headSub.textContent = `Editing: ${  displayName()}`;
  el.code.value = compState.currentCode || activeComponent.originalCode || '';
  runPreview();
  renderChat();
  updateIndicator();
}

/* ---------- generate ---------- */
async function generate() {
  if (isBusy()) { return; }
  if (!activeComponent) { chat.add('err', 'No component selected. Open index.html first.'); return; }
  const request = (el.prompt.value || '').trim();
  if (!request) { chat.add('err', 'Please describe what you want to change.'); return; }
  if (!activeComponent.originalCode) {
    chat.add('err', 'This component has no saved original code. Open it in the library first.');
    return;
  }

  const session = compState;
  const sessionId = session.id;
  if (isDuplicateRequest(sessionId, request, Number(session.revision || 0), 'editor')) {
    chat.add('err', 'The same AI request is already in progress.');
    return;
  }

  const req = beginRequest(sessionId, request, Number(session.revision || 0), 'editor');
  persistAIState();

  el.prompt.value = '';
  setLocked(true);
  addMessage(sessionId, 'user', request);
  chat.add('user', request);
  chat.showLoading();
  say('AI is editing…');

  try {
    const code = await generateCode({
      component: {
        id: activeComponent.id,
        name: activeComponent.name,
        category: activeComponent.category,
        original: activeComponent.originalCode
      },
      session,
      request,
      signal: req.signal
    });
    if (!isCurrent(req)) { return; }
    // Optimistic concurrency: the session must not have been revised while generating.
    if ((session.revision || 0) !== Number(req.baseRevision || 0)) {
      el.prompt.value = request;
      chat.add('err', 'This AI result was generated from an older version and was ignored.');
      return;
    }
    chat.hideLoading();
    // Commit the new version + baseline + revision together.
    addVersion(sessionId, code, request);
    addMessage(sessionId, 'assistant', `Applied: ${  request}`);
    chat.add('ai', 'Updated. The new version is in the editor and preview.');
    el.code.value = code;
    runPreview();
    updateIndicator();
    say('AI version generated.');
  } catch (err) {
    if (!isActiveRequest(req)) { return; }
    chat.hideLoading();
    el.prompt.value = request;
    const isCancelled = Boolean(req && req.isUserCancelled);
    const msg = getUserFacingAIMessage(err, isCancelled);
    chat.add('err', msg);
    if (isCancelled) {
      addMessage(sessionId, 'assistant', 'Request cancelled. Your component was preserved.');
      chat.add('ai', 'Request cancelled. Your component was preserved.');
    }
    say(isCancelled ? 'AI request cancelled.' : 'AI edit failed.');
  } finally {
    const wasActive = isActiveRequest(req);
    endRequest(req);
    if (wasActive) { setLocked(false); }
  }
}

/* ---------- actions ---------- */
function resetToOriginal() {
  if (!compState) { return; }
  setCurrentCode(compState.id, '');
  el.code.value = activeComponent.originalCode || '';
  runPreview();
  chat.add('sys', 'Reset to the original component.');
  say('Reset to original component.');
}

async function copyCode() {
  const ok = await copyText(el.code.value);
  const btn = $('aiCopyBtn');
  if (btn) {
    btn.innerHTML = ok
      ? '<i class="ri-check-line" aria-hidden="true"></i> Copied'
      : '<i class="ri-close-line" aria-hidden="true"></i> Copy failed';
    setTimeout(() => {
      if (btn) { btn.innerHTML = '<i class="ri-file-copy-line" aria-hidden="true"></i> Copy'; }
    }, 1800);
  }
  say(ok ? 'Code copied to clipboard' : 'Copy failed.');
  chat.add('sys', ok ? 'Code copied to clipboard.' : 'Copy failed.');
}

function exportCode() {
  const name = activeId || 'component';
  const isDraft = !!(compState && compState.currentCode && compState.currentCode !== activeComponent.originalCode);
  const filename = `${name}${isDraft ? '-ai-draft' : ''}.html`;
  const code = el.code ? el.code.value : '';
  if (!code) {
    say('No code to export.');
    return;
  }
  const ok = exportFile(filename, code);
  if (ok) {
    say(`Exported ${filename}`);
    chat.add('sys', `Exported ${filename}`);
  }
}

/* ---------- boot ---------- */
function boot() {
  installGlobalErrorHandlers();
  el = {
    headSub: $('aiHeadSub'), prompt: $('aiPrompt'), send: $('aiSend'), code: $('aiCodeEditor'),
    preview: $('aiPreviewFrame'), auto: $('aiAutoPreview'), banner: $('aiLockBanner'),
    context: $('aiContextText'), select: $('aiComponentSelect')
  };
  chat = createChatView($('aiMsgs'));

  loadAISettings();
  loadAIState();
  el.auto.checked = !!getAISettings().autoPreview;

  const urlParams = new URLSearchParams(window.location.search);
  const paramId = urlParams.get('component') || urlParams.get('id');
  const saved = paramId || getActiveComponentId();
  let startId = saved && getComponent(saved) ? saved : null;

  if (!startId && paramId) {
    const found = BY_ID[paramId] || EFFECTS.find((e) => e.name.toLowerCase() === paramId.toLowerCase());
    if (found) {
      const initialCode = typeof found.code === 'function' ? found.code() : '';
      getOrCreateComponentState(found.id, found.name, found.cat, initialCode);
      startId = found.id;
    }
  }

  const ids = Object.keys(getAIState().components);
  if (!startId) { startId = ids[0] || null; }

  populatePicker();
  setActive(startId);
  if (startId) { el.select.value = startId; }

  const marker = consumePendingMarker();
  if (marker && compState && marker.sessionId === compState.id) {
    addMessage(compState.id, 'assistant', 'Previous AI session restored. The interrupted request was not completed.');
    renderChat();
  }

  $('aiSend').addEventListener('click', guard(generate, 'generate'));
  $('aiCancelRequest').addEventListener('click', cancelActiveRequest);
  $('aiResetBtn').addEventListener('click', guard(resetToOriginal, 'reset'));
  $('aiCopyBtn').addEventListener('click', guard(copyCode, 'copy'));
  const exportBtn = $('aiExportBtn');
  if (exportBtn) { exportBtn.addEventListener('click', guard(exportCode, 'export')); }
  el.select.addEventListener('change', () => setActive(el.select.value));
  el.prompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isBusy()) { generate(); } }
  });
  el.code.addEventListener('input', () => {
    if (!compState) { return; }
    setCurrentCode(compState.id, el.code.value);
    if (el.auto.checked) {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => { try { runPreview(); } catch (err) { report(err, 'preview'); } }, 500);
    }
  });
  el.auto.addEventListener('change', () => {
    setAutoPreview(el.auto.checked);
    if (el.auto.checked) { runPreview(); }
  });
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
else { boot(); }
