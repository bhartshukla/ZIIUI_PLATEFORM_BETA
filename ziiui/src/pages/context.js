/* Entry point for context.html — view and resume saved AI conversations. */
import '../styles/context.css';
import { AI_STATE_KEY, AI_ACTIVE_KEY } from '../ai/config.js';
import { safeGet, safeSet, safeRemove } from '../lib/storage.js';

(function () {
  const $ = (id) => document.getElementById(id);

  let state = { components: {} };
  let activeId = null;

  function toast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function fmtDateTime(ts) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' · ' + d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return String(ts);
    }
  }

  function fmtAgo(ts) {
    if (!ts) return '';
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function load() {
    const raw = safeGet(AI_STATE_KEY);
    if (!raw) {
      state = { components: {} };
      activeId = null;
      return false;
    }
    try {
      const p = JSON.parse(raw);
      if (!isPlainObject(p) || !isPlainObject(p.components)) {
        state = { components: {} };
        activeId = null;
        return false;
      }
      state = { components: p.components };
      activeId = safeGet(AI_ACTIVE_KEY) || null;
      return true;
    } catch (_) {
      state = { components: {} };
      activeId = null;
      return false;
    }
  }

  function getComponentList() {
    return Object.values(state.components || {})
      .filter((c) => c && (c.componentName || c.componentId))
      .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
  }

  function openInEditor(componentId) {
    if (!componentId) return;
    safeSet(AI_ACTIVE_KEY, componentId);
    window.location.href = `ai.html?component=${encodeURIComponent(componentId)}`;
  }

  function renderList() {
    const list = getComponentList();
    const ul = $('compList');
    ul.innerHTML = '';

    $('emptyNotice').hidden = list.length > 0;
    $('layout').hidden = list.length === 0;

    if (!list.length) {
      $('detailCard').hidden = true;
      return;
    }

    if (!activeId || !state.components[activeId]) {
      activeId = list[0].componentId;
      safeSet(AI_ACTIVE_KEY, activeId);
    }

    list.forEach((c) => {
      const id = c.componentId;
      const li = document.createElement('li');
      if (id === activeId) li.classList.add('active');

      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-current', String(id === activeId));

      const timeText = fmtAgo(c.lastUpdated) || fmtDateTime(c.lastUpdated);
      const msgCount = (c.chatHistory || []).length;

      button.innerHTML = `
        <div class="comp-info">
          <span class="comp-title">${esc(c.componentName || id)}</span>
          <span class="comp-time"><i class="ri-time-line" aria-hidden="true"></i> ${esc(timeText)}</span>
        </div>
        <div class="comp-action-hint" title="Resume in AI Editor">
          <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </div>
      `;

      button.addEventListener('click', () => {
        activeId = id;
        safeSet(AI_ACTIVE_KEY, id);
        renderList();
        renderDetail();
      });

      li.append(button);
      ul.appendChild(li);
    });
  }

  function renderDetail() {
    const card = $('detailCard');
    const c = activeId ? state.components[activeId] : null;

    if (!c) {
      card.hidden = true;
      return;
    }

    card.hidden = false;
    $('detailCompName').textContent = c.componentName || activeId;

    const editorBtn = $('openInEditorBtn');
    if (editorBtn) {
      editorBtn.href = `ai.html?component=${encodeURIComponent(activeId)}`;
      editorBtn.onclick = (e) => {
        e.preventDefault();
        openInEditor(activeId);
      };
    }

    const wrap = $('chatMsgs');
    wrap.innerHTML = '';
    const msgs = Array.isArray(c.chatHistory) ? c.chatHistory : [];

    if (!msgs.length) {
      $('chatEmpty').hidden = false;
      return;
    }

    $('chatEmpty').hidden = true;

    msgs.forEach((m) => {
      const isUser = m.role === 'user';
      const div = document.createElement('div');
      div.className = `msg ${isUser ? 'user' : 'assistant'}`;
      div.title = 'Click to continue this conversation in the AI Editor';

      div.innerHTML = `
        <div class="msg-header">
          <span class="msg-author">${isUser ? 'You' : 'AI Assistant'}</span>
          <span class="msg-time">${esc(fmtDateTime(m.timestamp))}</span>
        </div>
        <div class="msg-body">${esc(m.text)}</div>
      `;

      // Clicking any chat opens that exact conversation in the AI editor
      div.addEventListener('click', () => {
        openInEditor(c.componentId);
      });

      wrap.appendChild(div);
    });
  }

  function clearAll() {
    const comps = Object.values(state.components || {});
    const hasHistory = comps.some(
      (c) => (c.chatHistory && c.chatHistory.length) || c.currentCode
    );
    if (!hasHistory) {
      toast('There is no saved AI conversation to clear.');
      return;
    }
    if (!confirm('Clear all saved conversations? Original components will remain intact.')) return;
    state = { components: {} };
    safeRemove(AI_STATE_KEY);
    safeRemove(AI_ACTIVE_KEY);
    activeId = null;
    renderList();
    $('detailCard').hidden = true;
    toast('All conversations cleared.');
  }

  function initTheme() {
    const t = safeGet('ziiui-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
      document.documentElement.setAttribute('data-theme', 'light');
    updateThemeControl();
  }

  function updateThemeControl() {
    const button = $('themeBtn');
    if (!button) return;
    const icon = button.querySelector('i');
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    if (icon) icon.className = light ? 'ri-moon-line' : 'ri-sun-line';
    button.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    safeSet('ziiui-theme', next);
    updateThemeControl();
  }

  $('refreshBtn').addEventListener('click', () => {
    load();
    renderList();
    renderDetail();
    toast('Refreshed.');
  });

  $('themeBtn').addEventListener('click', toggleTheme);
  $('clearAllBtn').addEventListener('click', clearAll);

  window.addEventListener('storage', (e) => {
    if (e.key === AI_STATE_KEY) {
      load();
      renderList();
      renderDetail();
      toast('Conversations updated from another tab.');
    }
  });

  initTheme();
  load();
  renderList();
  if (activeId && state.components[activeId]) renderDetail();
})();
