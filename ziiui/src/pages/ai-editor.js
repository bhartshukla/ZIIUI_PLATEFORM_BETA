/* Entry point for ai.html — full-page AI editor for one saved component. */
import '../styles/style.css';
import '../styles/ai-editor.css';
import { $, say, report, guard, installGlobalErrorHandlers } from '../lib/dom.js';
import { copyText } from '../lib/clipboard.js';
import { injectDebug, setFrameHTML, emptyPreviewDoc } from '../lib/preview.js';
import {
  loadAIState, loadAISettings, getAIState, getAISettings, setAutoPreview, getComponentState,
  getActiveComponentId, saveActiveComponentId, persistAIState, pushChatMessage, addCodeVersion,
  setCurrentCode, describeContext
} from '../ai/state.js';
import { generateCode } from '../ai/client.js';
import { describeAIError } from '../ai/prompt.js';
import { beginRequest, endRequest, isBusy, isCurrent, isActiveRequest, cancelActiveRequest, consumePendingMarker, isDuplicateRequest } from '../ai/request.js';
import { createChatView } from '../ai/chat-view.js';

let activeId = null;
let compState = null;
let autoTimer = null;
let chat = null;
let el = {};

const displayName = () => (compState && (compState.componentName || activeId)) || '';

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
  chat.render(compState.chatHistory, 'No messages yet for "' + displayName() + '". Ask for a change below.');
}

function updateIndicator() {
  el.context.textContent = compState ? describeContext(compState, displayName()) : 'No component';
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
    o.value = c.componentId;
    o.textContent = c.componentName || c.componentId;
    el.select.append(o);
  });
  el.select.hidden = comps.length < 2;
  if (activeId) el.select.value = activeId;
}

/* ---------- component selection ---------- */
function setActive(id) {
  activeId = id;
  compState = id ? getComponentState(id) : null;
  if (!compState) {
    el.headSub.textContent = 'No component selected — open index.html first.';
    el.code.value = '';
    el.send.disabled = true;
    runPreview();
    renderChat();
    updateIndicator();
    return;
  }
  saveActiveComponentId(id);
  el.send.disabled = false;
  el.headSub.textContent = 'Editing: ' + displayName();
  el.code.value = compState.currentCode || compState.originalCode || '';
  runPreview();
  renderChat();
  updateIndicator();
}

/* ---------- generate ---------- */
async function generate() {
  if (isBusy()) return;
  if (!compState) { chat.add('err', 'No component selected. Open index.html first.'); return; }
  const request = (el.prompt.value || '').trim();
  if (!request) { chat.add('err', 'Please describe what you want to change.'); return; }
  if (!compState.originalCode) { chat.add('err', 'This component has no saved original code. Open it in the library first.'); return; }

  const comp = compState;
  if (isDuplicateRequest(comp.componentId, request, Number(comp.revision || 0), 'editor')) {
    chat.add('err', 'The same AI request is already in progress.');
    return;
  }

  const req = beginRequest(comp.componentId, request, Number(comp.revision || 0), 'editor');
  persistAIState();

  el.prompt.value = '';
  setLocked(true);
  pushChatMessage(comp, 'user', request);
  chat.add('user', request);
  chat.showLoading();
  say('AI is editing…');

  try {
    const code = await generateCode({
      component: {
        name: comp.componentName,
        category: comp.category,
        original: comp.originalCode,
        // use what is in the editor right now, including unsaved manual edits
        current: el.code.value !== comp.originalCode ? el.code.value : ''
      },
      compState: comp,
      request,
      signal: req.signal
    });
    if (!isCurrent(req) || comp !== compState) return;
    if ((comp.revision || 0) !== Number(req.baseRevision || 0)) {
      chat.add('err', 'This AI result was generated from an older version and was ignored.');
      return;
    }
    chat.hideLoading();
    addCodeVersion(comp, code, request);
    pushChatMessage(comp, 'assistant', 'Applied: ' + request);
    chat.add('ai', 'Updated. The new version is in the editor and preview.');
    el.code.value = code;
    runPreview();
    updateIndicator();
    say('AI version generated.');
  } catch (err) {
    if (!isActiveRequest(req)) return;
    chat.hideLoading();
    const aborted = err && err.name === 'AbortError';
    chat.add('err', aborted ? 'Request cancelled or timed out. Existing code preserved.' : describeAIError(err));
    say(aborted ? 'AI request cancelled.' : 'AI edit failed.');
  } finally {
    const wasActive = isActiveRequest(req);
    endRequest(req);
    if (wasActive) setLocked(false);
  }
}

/* ---------- actions ---------- */
function resetToOriginal() {
  if (!compState) return;
  setCurrentCode(compState, '');
  el.code.value = compState.originalCode || '';
  runPreview();
  chat.add('sys', 'Reset to the original component.');
  say('Reset to original component.');
}

async function copyCode() {
  const ok = await copyText(el.code.value);
  say(ok ? 'Code copied to clipboard' : 'Copy failed.');
  chat.add('sys', ok ? 'Code copied to clipboard.' : 'Copy failed.');
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

  const saved = getActiveComponentId();
  const ids = Object.keys(getAIState().components);
  const startId = saved && getComponentState(saved) ? saved : (ids[0] || null);
  populatePicker();
  setActive(startId);
  if (startId) el.select.value = startId;

  const marker = consumePendingMarker();
  if (marker && compState && marker.componentId === activeId) {
    pushChatMessage(compState, 'assistant', 'Previous AI session restored. The interrupted request was not completed.');
    renderChat();
  }

  $('aiSend').addEventListener('click', guard(generate, 'generate'));
  $('aiCancelRequest').addEventListener('click', cancelActiveRequest);
  $('aiResetBtn').addEventListener('click', guard(resetToOriginal, 'reset'));
  $('aiCopyBtn').addEventListener('click', guard(copyCode, 'copy'));
  el.select.addEventListener('change', () => setActive(el.select.value));
  el.prompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isBusy()) generate(); }
  });
  el.code.addEventListener('input', () => {
    if (!compState) return;
    setCurrentCode(compState, el.code.value);
    if (el.auto.checked) {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => { try { runPreview(); } catch (err) { report(err, 'preview'); } }, 500);
    }
  });
  el.auto.addEventListener('change', () => {
    setAutoPreview(el.auto.checked);
    if (el.auto.checked) runPreview();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
