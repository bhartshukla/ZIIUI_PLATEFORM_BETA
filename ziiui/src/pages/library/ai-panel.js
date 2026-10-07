/* The floating AI panel + the code/preview modal on the library page. */
import { $, esc, say, report, guard } from '../../lib/dom.js';
import { copyText } from '../../lib/clipboard.js';
import { injectDebug, setFrameHTML, emptyPreviewDoc } from '../../lib/preview.js';
import {
  getOrCreateComponentState, getComponentState, saveActiveComponentId, persistAIState,
  clearComponentHistory, clearAllAIHistory, pushChatMessage, addCodeVersion, setCurrentCode,
  describeContext, getAISettings, getAIState, setAutoPreview
} from '../../ai/state.js';
import { generateCode } from '../../ai/client.js';
import { describeAIError } from '../../ai/prompt.js';
import { beginRequest, endRequest, isBusy, isCurrent, isActiveRequest, cancelActiveRequest, isDuplicateRequest } from '../../ai/request.js';
import { createChatView } from '../../ai/chat-view.js';
import { store, hooks } from './store.js';
import { setNavigationLocked } from './nav.js';
import { play, refreshCodeView } from './viewer.js';

let el = {};      // resolved DOM elements
let chat = null;  // chat view
let autoTimer = null;
let modalReturnFocus = null;
let modalPreviousOverflow = '';

/* ---------- state sync with the viewer ---------- */
function syncAfterBuild(html) {
  const cur = store.cur;
  const compState = getOrCreateComponentState(cur.id, cur.name, cur.cat, html);
  compState.originalCode = html;
  const saved = typeof compState.currentCode === 'string' ? compState.currentCode : '';
  if (saved && saved !== html) {
    store.edited = saved;
    store.editActive = true;
  } else {
    store.edited = html;
    store.editActive = false;
    compState.currentCode = '';
  }
  compState.lastUpdated = Date.now();
  store.compState = compState;
  persistAIState();
  if (el.code) el.code.value = store.edited;
}

function onComponentChange() {
  const cur = store.cur;
  if (!cur) {
    store.compState = null;
    renderChat();
    updateContextIndicator();
    return;
  }
  store.compState = getOrCreateComponentState(cur.id, cur.name, cur.cat, store.html);
  saveActiveComponentId(cur.id);
  renderSelected();
  renderChat();
  updateContextIndicator();
  if (el.code) el.code.value = store.editActive ? store.edited : store.html;
  updateStatus();
}

/* ---------- panel ---------- */
function togglePanel(force) {
  if (!el.panel || !el.fab) return;
  const open = typeof force === 'boolean' ? force : el.panel.hidden;
  if (!store.cur && open) {
    el.panel.hidden = false;
    el.fab.classList.add('is-open');
    el.fab.setAttribute('aria-expanded', 'true');
    if (el.headSub) el.headSub.textContent = 'Choose a component';
    renderSelected();
    if (chat) chat.render([], 'Choose a component first before editing with AI.');
    updateContextIndicator();
    syncAIInputState();
    return;
  }
  el.panel.hidden = !open;
  el.fab.classList.toggle('is-open', open);
  el.fab.setAttribute('aria-expanded', String(open));
  if (open) {
    onComponentChange();
    setTimeout(() => { try { el.prompt.focus(); } catch (_) { /* ignore */ } }, 40);
  }
}

function syncAIInputState() {
  const hasSelection = !!store.cur;
  if (el.prompt) {
    el.prompt.disabled = !hasSelection || isBusy();
    el.prompt.placeholder = hasSelection ? 'Describe the change you want to make…' : 'Select a component first to start editing';
  }
  if (el.send) {
    el.send.disabled = !hasSelection || isBusy();
  }
}

function renderSelected() {
  const cur = store.cur;
  if (!el.sel) return;
  if (!cur) {
    if (el.headSub) el.headSub.textContent = 'No component selected';
    el.sel.innerHTML = '<span class="ai-sel-empty">Select a component first to start editing.</span>';
    syncAIInputState();
    return;
  }
  if (el.headSub) el.headSub.textContent = 'Selected: ' + cur.name;
  el.sel.innerHTML =
    '<div class="ai-sel-info"><strong>' + esc(cur.name) + '</strong>' +
    '<span>Category: ' + esc(cur.cat) + '</span></div>' +
    '<button class="ai-btn ghost" type="button" id="aiViewCode" aria-label="View component code">' +
    '<i class="ri-code-s-slash-line" aria-hidden="true"></i> View Code</button>';
  const v = $('aiViewCode');
  if (v) {
    v.addEventListener('click', () => {
      if (el.code) el.code.value = store.editActive ? store.edited : store.html;
      openModal();
    });
  }
  syncAIInputState();
}

function renderChat() {
  if (!chat) return;
  if (!store.cur) { chat.render([], 'Select a component to start editing.'); syncAIInputState(); return; }
  const s = getComponentState(store.cur.id);
  chat.render(
    s ? s.chatHistory : [],
    'Hi! Pick a component on the left, then tell me what you want to change. Your conversation will be saved automatically.'
  );
  syncAIInputState();
}

function updateContextIndicator() {
  if (!el.context) return;
  el.context.textContent = store.cur && store.compState
    ? describeContext(store.compState, store.cur.name)
    : 'New AI session';
}

/* ---------- generate ---------- */
async function generate() {
  if (isBusy()) return;
  const cur = store.cur;
  if (!cur) { chat.add('err', 'Select a component first.'); return; }
  const compState = store.compState;
  if (!compState) { chat.add('err', 'No component selected.'); return; }
  const request = (el.prompt.value || '').trim();
  if (!request) { chat.add('err', 'Please describe what you want to change.'); return; }
  if (!store.html) { chat.add('err', 'No component code available yet.'); return; }

  if (isDuplicateRequest(cur.id, request, Number(compState.revision || 0), 'library')) {
    chat.add('err', 'The same AI request is already in progress.');
    return;
  }

  const req = beginRequest(cur.id, request, Number(compState.revision || 0), 'library');
  if (!req) {
    chat.add('err', 'Unable to start the AI request.');
    return;
  }

  compState.lastUpdated = Date.now();
  persistAIState();

  el.prompt.value = '';
  if (el.send) el.send.disabled = true;
  syncAIInputState();
  setNavigationLocked(true);
  pushChatMessage(compState, 'user', request);
  chat.add('user', request);
  chat.showLoading();
  say('AI is editing your component…');

  try {
    const code = await generateCode({
      component: {
        name: cur.name,
        category: cur.cat,
        original: store.html,
        current: store.editActive ? store.edited : ''
      },
      compState,
      request,
      signal: req.signal
    });
    if (!isCurrent(req) || cur.id !== store.cur.id) return;
    if ((compState.revision || 0) !== Number(req.baseRevision || 0)) {
      el.prompt.value = request;
      chat.add('err', 'This AI result was generated from an older version and was ignored.');
      return;
    }
    chat.hideLoading();
    store.edited = code;
    store.editActive = true;
    addCodeVersion(compState, code, request);
    pushChatMessage(compState, 'assistant', 'Applied: ' + request);
    chat.add('ai', 'Updated the component. Opening the AI editor…');
    if (el.code) el.code.value = code;
    refreshCodeView();
    updateContextIndicator();
    openModal();
    runPreview();
    updateStatus();
    say('AI version generated — original component preserved.');
  } catch (err) {
    if (!isActiveRequest(req)) return;
    chat.hideLoading();
    el.prompt.value = request;
    const aborted = err && err.name === 'AbortError';
    chat.add('err', aborted
      ? 'AI request timed out or was cancelled. Your existing component was preserved.'
      : describeAIError(err));
    say(aborted ? 'AI request cancelled.' : 'AI edit failed.');
  } finally {
    const wasActive = isActiveRequest(req);
    endRequest(req);
    if (wasActive) {
      syncAIInputState();
      setNavigationLocked(false);
    }
  }
}

/* ---------- modal ---------- */
function openModal() {
  if (!el.modal) return;
  if (el.modal.hidden) {
    modalReturnFocus = document.activeElement;
    modalPreviousOverflow = document.body.style.overflow;
  }
  const target = store.editActive ? store.edited : store.html;
  if (el.code && el.code.value !== target) el.code.value = target || '';
  if (el.modalTitle) el.modalTitle.textContent = store.cur ? store.cur.name : 'Component';
  el.modal.hidden = false;
  document.body.style.overflow = 'hidden';
  updateStatus();
  runPreview();
  setTimeout(() => {
    if (!el.modal.hidden) $('aiModalClose').focus();
  }, 30);
}

function closeModal() {
  if (!el.modal || el.modal.hidden) return;
  el.modal.hidden = true;
  document.body.style.overflow = modalPreviousOverflow;
  if (modalReturnFocus && modalReturnFocus.isConnected) modalReturnFocus.focus();
  modalReturnFocus = null;
}

function keepModalFocus(event) {
  if (event.key !== 'Tab' || !el.modal || el.modal.hidden) return;
  const focusable = [...el.modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((node) => node.getClientRects().length > 0);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !el.modal.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !el.modal.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

function runPreview() {
  if (!el.previewFrame) return;
  const code = el.code ? el.code.value : '';
  setFrameHTML(el.previewFrame, code && code.trim() ? injectDebug(code) : emptyPreviewDoc());
}

function updateStatus() {
  if (!el.modalStatus) return;
  const edited = store.editActive && store.edited && store.edited !== store.html;
  el.modalStatus.textContent = edited
    ? 'AI version generated — original component preserved.'
    : 'Original component is unchanged.';
  el.modalStatus.classList.toggle('is-edited', !!edited);
}

function showTab(which) {
  if (!el.code) return;
  el.code.value = which === 'original' ? (store.html || '') : (store.editActive ? store.edited : (store.html || ''));
  document.querySelectorAll('.ai-tab').forEach((t) => {
    const on = t.dataset.tab === which;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-pressed', String(on));
  });
  updateStatus();
  runPreview();
}

function applyEdited() {
  if (!store.cur || !el.code) return;
  const val = el.code.value;
  store.edited = val;
  store.editActive = val !== store.html;
  setCurrentCode(store.compState, val);
  refreshCodeView();
  setFrameHTML($('frame'), injectDebug(val));
  updateStatus();
  chat.add('sys', 'Applied AI version to the preview.');
  say('AI version applied to the preview.');
}

function resetToOriginal() {
  store.edited = store.html;
  store.editActive = false;
  setCurrentCode(store.compState, '');
  if (el.code) el.code.value = store.html || '';
  refreshCodeView();
  if (store.html) setFrameHTML($('frame'), injectDebug(store.html));
  updateStatus();
  runPreview();
  chat.add('sys', 'Reset to original component.');
  say('Reset to original component.');
}

async function copyEdited() {
  const ok = await copyText(el.code ? el.code.value : '');
  const btn = $('aiCopyBtn');
  if (btn) {
    btn.innerHTML = ok
      ? '<i class="ri-check-line" aria-hidden="true"></i> Copied'
      : '<i class="ri-close-line" aria-hidden="true"></i> Copy failed';
    setTimeout(() => {
      if (btn) btn.innerHTML = '<i class="ri-file-copy-line" aria-hidden="true"></i> Copy Code';
    }, 1800);
  }
  chat.add('sys', ok ? 'Edited code copied to clipboard.' : 'Copy failed.');
  say(ok ? 'Edited code copied to clipboard' : 'Copy failed.');
}

function clearThisComponent() {
  const cur = store.cur;
  if (!cur) return;
  const state = store.compState;
  const hasHistory = !!(state && (
    state.chatHistory.length ||
    state.codeVersions.length ||
    state.currentCode
  ));
  if (!hasHistory) {
    chat.add('sys', 'There is no saved AI history to clear for this component.');
    return;
  }
  if (!window.confirm('Clear chat history and AI versions for "' + cur.name + '"? The original component will remain.')) return;
  clearComponentHistory(cur.id);
  store.edited = store.html;
  store.editActive = false;
  refreshCodeView();
  renderChat();
  updateContextIndicator();
  chat.add('sys', 'Component AI history cleared.');
  say('Cleared AI history for ' + cur.name + '.');
  play(store.html);
}

function clearEverything() {
  const components = Object.values(getAIState().components || {});
  const hasHistory = store.editActive || components.some((state) =>
    state.chatHistory.length || state.codeVersions.length || state.currentCode
  );
  if (!hasHistory) {
    chat.add('sys', 'There is no saved AI history to clear.');
    return;
  }
  if (!window.confirm('Clear ALL AI history for every component? Original components will remain intact.')) return;
  clearAllAIHistory();
  store.edited = store.html;
  store.editActive = false;
  refreshCodeView();
  store.compState = store.cur ? getOrCreateComponentState(store.cur.id, store.cur.name, store.cur.cat, store.html) : null;
  renderChat();
  updateContextIndicator();
  chat.add('sys', 'All AI history cleared.');
  say('Cleared all AI history.');
  play(store.html);
}

/* ---------- init ---------- */
export function initAIPanel() {
  el = {
    fab: $('aiFab'), panel: $('aiPanel'), close: $('aiClose'), msgs: $('aiMsgs'),
    prompt: $('aiPrompt'), send: $('aiSend'), sel: $('aiSelCard'), headSub: $('aiHeadSub'),
    modal: $('aiModal'), modalTitle: $('aiModalTitle'), modalStatus: $('aiModalStatus'),
    code: $('aiCodeEditor'), previewFrame: $('aiPreviewFrame'), auto: $('aiAutoPreview'),
    context: $('aiContextText')
  };
  chat = createChatView(el.msgs);

  hooks.afterBuild = syncAfterBuild;
  hooks.afterSelect = onComponentChange;

  if (el.auto) el.auto.checked = !!getAISettings().autoPreview;

  const on = (id, evt, fn) => { const n = $(id); if (n) n.addEventListener(evt, fn); };
  on('aiFab', 'click', () => togglePanel());
  on('aiClose', 'click', () => togglePanel(false));
  on('aiSend', 'click', guard(generate, 'aiGenerate'));
  on('aiCancelRequest', 'click', guard(cancelActiveRequest, 'aiCancel'));
  on('aiClearComponent', 'click', guard(clearThisComponent, 'aiClearComponent'));
  on('aiClearAll', 'click', guard(clearEverything, 'aiClearAll'));
  on('aiModalClose', 'click', closeModal);
  on('aiModalClose2', 'click', closeModal);
  on('aiRun', 'click', guard(runPreview, 'aiRun'));
  on('aiApply', 'click', guard(applyEdited, 'aiApply'));
  on('aiResetBtn', 'click', guard(resetToOriginal, 'aiReset'));
  on('aiCopyBtn', 'click', guard(copyEdited, 'aiCopy'));
  document.querySelectorAll('.ai-tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
  if (el.modal) el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

  if (el.prompt) {
    el.prompt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isBusy()) generate(); }
    });
  }
  if (el.code) {
    el.code.addEventListener('input', () => {
      if (!store.compState) return;
      const val = el.code.value;
      store.edited = val;
      store.editActive = val !== store.html;
      setCurrentCode(store.compState, val);
      updateStatus();
      updateContextIndicator();
      if (el.auto && el.auto.checked) {
        clearTimeout(autoTimer);
        autoTimer = setTimeout(() => { try { runPreview(); } catch (err) { report(err, 'aiRunPreview'); } }, 500);
      }
    });
  }
  if (el.auto) {
    el.auto.addEventListener('change', () => {
      setAutoPreview(el.auto.checked);
      if (el.auto.checked) runPreview();
    });
  }

  document.addEventListener('keydown', (e) => {
    keepModalFocus(e);
    if (e.key !== 'Escape') return;
    if (el.modal && !el.modal.hidden) { e.preventDefault(); closeModal(); return; }
    if (el.panel && !el.panel.hidden) { e.preventDefault(); togglePanel(false); }
  });
  window.addEventListener('beforeunload', persistAIState);
}

/** After boot: tell the user if a previous request was interrupted. */
export function announceInterruptedRequest(marker) {
  if (marker && store.cur && marker.componentId === store.cur.id && store.compState) {
    const text = 'Previous AI session restored. The interrupted request was not completed.';
    pushChatMessage(store.compState, 'assistant', text);
    renderChat();
    updateContextIndicator();
    say(text);
  }
}
