/* Entry point for context.html — view, search, and manage saved AI conversations in the Command Center. */
import '../styles/context.css';
import { AI_STATE_KEY, AI_ACTIVE_KEY } from '../ai/config.js';
import { safeGet, safeSet, safeRemove } from '../lib/storage.js';

(function () {
  const $ = (id) => document.getElementById(id);

  let state = { components: {} };
  let activeId = null;
  let searchQuery = '';

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

      // Check query parameter first, fallback to active key or first component
      const urlParam = new URLSearchParams(window.location.search).get('component');
      if (urlParam && state.components[urlParam]) {
        activeId = urlParam;
        safeSet(AI_ACTIVE_KEY, activeId);
      } else {
        activeId = safeGet(AI_ACTIVE_KEY) || null;
      }
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

  function getFilteredList() {
    const all = getComponentList();
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return all;

    return all.filter((c) => {
      const name = (c.componentName || '').toLowerCase();
      const id = (c.componentId || '').toLowerCase();
      const cat = (c.category || '').toLowerCase();
      if (name.includes(q) || id.includes(q) || cat.includes(q)) return true;

      // Match conversation message text
      if (Array.isArray(c.chatHistory)) {
        const matchesMsg = c.chatHistory.some((m) => {
          return m && typeof m.text === 'string' && m.text.toLowerCase().includes(q);
        });
        if (matchesMsg) return true;
      }

      // Match summary
      if (typeof c.summary === 'string' && c.summary.toLowerCase().includes(q)) {
        return true;
      }

      return false;
    });
  }

  function updateSummaryCards() {
    const all = getComponentList();
    const compCount = all.length;
    const convCount = all.filter((c) => Array.isArray(c.chatHistory) && c.chatHistory.length > 0).length;
    const versionCount = all.reduce((sum, c) => sum + (Array.isArray(c.codeVersions) ? c.codeVersions.length : 0), 0);
    const totalMsgs = all.reduce((sum, c) => sum + (Array.isArray(c.chatHistory) ? c.chatHistory.length : 0), 0);

    if ($('statComponents')) $('statComponents').textContent = compCount.toLocaleString();
    if ($('statComponentsSub')) $('statComponentsSub').textContent = compCount === 1 ? '1 tracked component' : `${compCount} in memory`;

    if ($('statConversations')) $('statConversations').textContent = convCount.toLocaleString();
    if ($('statConversationsSub')) $('statConversationsSub').textContent = totalMsgs ? `${totalMsgs.toLocaleString()} messages` : '0 messages';

    if ($('statVersions')) $('statVersions').textContent = versionCount.toLocaleString();
    if ($('statVersionsSub')) $('statVersionsSub').textContent = versionCount === 1 ? '1 code snapshot' : `${versionCount} code snapshots`;
  }

  function openInEditor(componentId) {
    if (!componentId) return;
    safeSet(AI_ACTIVE_KEY, componentId);
    window.location.href = `ai.html?component=${encodeURIComponent(componentId)}`;
  }

  function renderList() {
    const all = getComponentList();
    const filtered = getFilteredList();
    const ul = $('compList');
    if (!ul) return;
    ul.innerHTML = '';

    const hasAnyComps = all.length > 0;
    const emptyNotice = $('emptyNotice');
    const layout = $('layout');
    const searchNoResults = $('searchNoResults');
    const detailCard = $('detailCard');

    if (emptyNotice) emptyNotice.hidden = hasAnyComps;
    if (layout) layout.hidden = !hasAnyComps;

    updateSummaryCards();

    if (!hasAnyComps) {
      if (detailCard) detailCard.hidden = true;
      return;
    }

    const countBadge = $('compListCount');
    if (countBadge) countBadge.textContent = String(filtered.length);

    const q = (searchQuery || '').trim();
    if (filtered.length === 0) {
      if (searchNoResults) {
        searchNoResults.hidden = false;
        const qText = $('searchQueryText');
        if (qText) qText.textContent = q;
      }
      if (detailCard) detailCard.hidden = true;
      return;
    }

    if (searchNoResults) searchNoResults.hidden = true;

    // Ensure activeId is pointing to one of the filtered items
    if (!activeId || !filtered.some((c) => c.componentId === activeId)) {
      activeId = filtered[0].componentId;
      safeSet(AI_ACTIVE_KEY, activeId);
    }

    filtered.forEach((c) => {
      const id = c.componentId;
      const isActive = id === activeId;
      const li = document.createElement('li');
      li.className = 'comp-item' + (isActive ? ' active' : '');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'comp-btn';
      button.setAttribute('aria-current', String(isActive));
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(isActive));

      const timeText = fmtAgo(c.lastUpdated) || fmtDateTime(c.lastUpdated);
      const msgCount = Array.isArray(c.chatHistory) ? c.chatHistory.length : 0;
      const verCount = Array.isArray(c.codeVersions) ? c.codeVersions.length : 0;

      // Check if item matched via message text
      let matchSnippet = '';
      if (q && Array.isArray(c.chatHistory)) {
        const found = c.chatHistory.find((m) => m && typeof m.text === 'string' && m.text.toLowerCase().includes(q.toLowerCase()));
        if (found && !(c.componentName || '').toLowerCase().includes(q.toLowerCase())) {
          const rawText = found.text.replace(/\s+/g, ' ').trim();
          const idx = rawText.toLowerCase().indexOf(q.toLowerCase());
          const start = Math.max(0, idx - 18);
          const excerpt = (start > 0 ? '…' : '') + rawText.slice(start, start + 54) + (start + 54 < rawText.length ? '…' : '');
          matchSnippet = `<div class="comp-match-snippet"><i class="ri-search-line"></i> ${esc(excerpt)}</div>`;
        }
      }

      button.innerHTML = `
        <div class="comp-item-header">
          <div class="comp-item-title-wrap">
            <span class="comp-title">${esc(c.componentName || id)}</span>
            ${c.category ? `<span class="comp-cat-tag">${esc(c.category)}</span>` : ''}
          </div>
          <i class="ri-arrow-right-s-line comp-chevron" aria-hidden="true"></i>
        </div>
        ${matchSnippet}
        <div class="comp-item-meta">
          <span class="comp-time"><i class="ri-time-line" aria-hidden="true"></i> ${esc(timeText)}</span>
          <div class="comp-badges">
            <span class="comp-badge"><i class="ri-chat-3-line" aria-hidden="true"></i> ${msgCount}</span>
            ${verCount ? `<span class="comp-badge"><i class="ri-history-line" aria-hidden="true"></i> ${verCount}</span>` : ''}
          </div>
        </div>
      `;

      button.addEventListener('click', () => {
        activeId = id;
        safeSet(AI_ACTIVE_KEY, id);
        renderList();
        renderDetail();
        if (window.innerWidth <= 820) {
          const detail = $('detailCard');
          if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      li.append(button);
      ul.appendChild(li);
    });
  }

  function renderDetail() {
    const card = $('detailCard');
    if (!card) return;
    const c = activeId ? state.components[activeId] : null;

    if (!c) {
      card.hidden = true;
      return;
    }

    card.hidden = false;
    const nameEl = $('detailCompName');
    if (nameEl) nameEl.textContent = c.componentName || activeId;

    const catEl = $('detailCategory');
    if (catEl) {
      if (c.category) {
        catEl.textContent = c.category;
        catEl.hidden = false;
      } else {
        catEl.hidden = true;
      }
    }

    const timeEl = $('detailTime');
    if (timeEl) timeEl.textContent = fmtDateTime(c.lastUpdated);

    const msgCount = Array.isArray(c.chatHistory) ? c.chatHistory.length : 0;
    const msgEl = $('detailMsgCount');
    const dotEl = $('detailDot');
    if (msgEl) {
      msgEl.textContent = msgCount === 1 ? '1 message' : `${msgCount} messages`;
    }
    if (dotEl) dotEl.hidden = false;

    const editorBtn = $('openInEditorBtn');
    if (editorBtn) {
      editorBtn.href = `ai.html?component=${encodeURIComponent(activeId)}`;
      editorBtn.onclick = (e) => {
        e.preventDefault();
        openInEditor(activeId);
      };
    }

    const wrap = $('chatMsgs');
    if (!wrap) return;
    wrap.innerHTML = '';
    const msgs = Array.isArray(c.chatHistory) ? c.chatHistory : [];

    const chatEmpty = $('chatEmpty');
    if (!msgs.length) {
      if (chatEmpty) chatEmpty.hidden = false;
      return;
    }

    if (chatEmpty) chatEmpty.hidden = true;

    msgs.forEach((m) => {
      const isUser = m.role === 'user';
      const div = document.createElement('div');
      div.className = `msg ${isUser ? 'user' : 'assistant'}`;
      div.title = 'Click to continue this conversation in the AI Editor';
      div.tabIndex = 0;
      div.setAttribute('role', 'button');
      div.setAttribute('aria-label', `Resume conversation at message from ${isUser ? 'You' : 'AI Assistant'}`);

      div.innerHTML = `
        <div class="msg-header">
          <span class="msg-author">
            <i class="${isUser ? 'ri-user-line' : 'ri-sparkling-2-line'}" aria-hidden="true"></i>
            ${isUser ? 'You' : 'AI Assistant'}
          </span>
          <span class="msg-time">${esc(fmtDateTime(m.timestamp))}</span>
        </div>
        <div class="msg-body">${esc(m.text)}</div>
        <div class="msg-resume-hint"><i class="ri-edit-line" aria-hidden="true"></i> Continue in AI Editor</div>
      `;

      div.addEventListener('click', () => openInEditor(c.componentId));
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openInEditor(c.componentId);
        }
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
    searchQuery = '';
    const searchInput = $('contextSearch');
    if (searchInput) searchInput.value = '';
    renderList();
    if ($('detailCard')) $('detailCard').hidden = true;
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

  function setupSearch() {
    const input = $('contextSearch');
    const clearBtn = $('searchClearBtn');
    const resetBtn = $('resetSearchBtn');
    const kbd = $('searchKbd');

    // Adapt keyboard shortcut badge for Mac
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    if (kbd) {
      kbd.innerHTML = isMac ? '<span class="kbd-mod">⌘</span>K' : '<span class="kbd-mod">Ctrl</span>+K';
    }

    if (input) {
      input.addEventListener('input', () => {
        searchQuery = input.value;
        if (clearBtn) clearBtn.hidden = !searchQuery;
        renderList();
        renderDetail();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          input.value = '';
          searchQuery = '';
          if (clearBtn) clearBtn.hidden = true;
          renderList();
          renderDetail();
          input.blur();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const firstBtn = document.querySelector('.comp-list .comp-btn');
          if (firstBtn) firstBtn.focus();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) {
          input.value = '';
          input.focus();
        }
        searchQuery = '';
        clearBtn.hidden = true;
        renderList();
        renderDetail();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (input) {
          input.value = '';
          input.focus();
        }
        searchQuery = '';
        if (clearBtn) clearBtn.hidden = true;
        renderList();
        renderDetail();
      });
    }

    // Global shortcut Ctrl+K / Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (input) {
          input.focus();
          input.select();
        }
      }
    });
  }

  // Bind toolbar actions
  if ($('refreshBtn')) {
    $('refreshBtn').addEventListener('click', () => {
      load();
      renderList();
      renderDetail();
      toast('Refreshed.');
    });
  }

  if ($('themeBtn')) $('themeBtn').addEventListener('click', toggleTheme);
  if ($('clearAllBtn')) $('clearAllBtn').addEventListener('click', clearAll);

  window.addEventListener('storage', (e) => {
    if (e.key === AI_STATE_KEY) {
      load();
      renderList();
      renderDetail();
      toast('Conversations updated from another tab.');
    }
  });

  initTheme();
  setupSearch();
  load();
  renderList();
  if (activeId && state.components[activeId]) renderDetail();
})();
