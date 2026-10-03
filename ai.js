/* =============================================================
   ziiui — ai.js
   Standalone AI editor page (ai.html).
  
   ============================================================= */


/*
/* =============================================================
ziiui — ai.js
Standalone AI editor page (ai.html).
 
============================================================= */


/*
const LT = '<', GT = '>', END = n => LT + '/' + n + GT;
const esc = s => String(s == null ? '' : s)
 .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

let aiState = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
let aiSettings = { autoPreview: false };
let activeId = null;
let activeComponentState = null;
let aiBusy = false;
let activeAIRequestId = null;
let activeAIRequestController = null;
let aiAutoTimer = null;

const aiHeadSub = $('aiHeadSub'), aiMsgs = $('aiMsgs'), aiPrompt = $('aiPrompt'),
 aiSend = $('aiSend'), aiCodeEditor = $('aiCodeEditor'), aiPreviewFrame = $('aiPreviewFrame'),
 aiAutoPreview = $('aiAutoPreview'), aiLockBanner = $('aiLockBanner'),
 aiCancelRequest = $('aiCancelRequest'), aiContextText = $('aiContextText');

function uid() {
 try { if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch (_) { }
 return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
function safeGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
function safeRemove(k) { try { localStorage.removeItem(k); } catch (_) { } }
function say(msg) { const el = $('status'); if (el) el.textContent = msg; }

function loadAIState() {
 const raw = safeGet(AI_STATE_KEY);
 if (!raw) return;
 try {
   const p = JSON.parse(raw);
   if (!p || typeof p !== 'object') throw new Error('bad');
   if (p.schemaVersion !== AI_SCHEMA_VERSION) return;
   if (!p.components || typeof p.components !== 'object') p.components = {};
   Object.keys(p.components).forEach(k => {
     const c = p.components[k];
     if (!c || typeof c !== 'object') { delete p.components[k]; return; }
     if (!Array.isArray(c.chatHistory)) c.chatHistory = [];
     if (!Array.isArray(c.codeVersions)) c.codeVersions = [];
   });
   aiState = p;
 } catch (_) {
   aiState = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
 }
}
function persistAIState() {
 try { aiState.schemaVersion = AI_SCHEMA_VERSION; return safeSet(AI_STATE_KEY, JSON.stringify(aiState)); }
 catch (_) { return false; }
}
function loadAISettings() {
 const raw = safeGet(AI_SETTINGS_KEY);
 if (!raw) return;
 try { const s = JSON.parse(raw); if (s && typeof s === 'object') aiSettings = { autoPreview: !!s.autoPreview }; } catch (_) { }
}
function persistAISettings() { safeSet(AI_SETTINGS_KEY, JSON.stringify(aiSettings)); }

function addMessage(role, text) {
 if (!aiMsgs) return null;
 const d = document.createElement('div');
 d.className = 'ai-msg ' + role; d.textContent = text;
 aiMsgs.append(d); aiMsgs.scrollTop = aiMsgs.scrollHeight;
 return d;
}
function showLoading() {
 if (!aiMsgs) return; hideLoading();
 const d = document.createElement('div');
 d.className = 'ai-msg ai'; d.id = 'aiLoading';
 d.innerHTML = '<span class="ai-dots" aria-hidden="true"><i></i><i></i><i></i></span>AI is editing your component…';
 aiMsgs.append(d); aiMsgs.scrollTop = aiMsgs.scrollHeight;
}
function hideLoading() { const l = $('aiLoading'); if (l) l.remove(); }

function renderChat() {
 if (!aiMsgs) return;
 aiMsgs.innerHTML = '';
 if (!activeComponentState) {
   addMessage('ai', 'Select a component in the main library, then come back.');
   return;
 }
 const h = activeComponentState.chatHistory || [];
 if (!h.length) {
   addMessage('ai', 'No messages yet for "' + (activeComponentState.componentName || activeId) + '". Ask for a change below.');
   return;
 }
 h.forEach(m => addMessage(m.role === 'user' ? 'user' : 'ai', m.text));
 aiMsgs.scrollTop = aiMsgs.scrollHeight;
}
function updateIndicator() {
 if (!aiContextText) return;
 if (!activeComponentState) { aiContextText.textContent = 'No component'; return; }
 const msgs = (activeComponentState.chatHistory || []).length;
 const vers = (activeComponentState.codeVersions || []).length;
 aiContextText.textContent = (activeComponentState.componentName || activeId) + ' · ' + msgs + ' msg · ' + vers + ' v';
}
function pushChat(role, text) {
 if (!activeComponentState) return null;
 const msg = { id: uid(), role: role === 'ai' ? 'assistant' : role, text: String(text || ''), timestamp: Date.now() };
 activeComponentState.chatHistory.push(msg);
 if (activeComponentState.chatHistory.length > AI_MAX_MESSAGES) {
   activeComponentState.chatHistory = activeComponentState.chatHistory.slice(-AI_MAX_MESSAGES);
 }
 activeComponentState.lastUpdated = Date.now();
 persistAIState();
 return msg;
}

function injectDebug(code) {
 const src = String(code || '');
 const marker = LT + 'head' + GT;
 const i = src.indexOf(marker);
 const hook = LT + 'script' + GT +
   'window.addEventListener("error",function(e){try{parent.postMessage({__ziiui:1,message:String((e&&e.message)||e)},"*");}catch(_){}});' +
   LT + '/script' + GT;
 if (i === -1) return hook + '\n' + src;
 const at = i + marker.length;
 return src.slice(0, at) + '\n' + hook + src.slice(at);
}
function setFrame(iframe, source) {
 if (!iframe) return;
 if (iframe._url) { try { URL.revokeObjectURL(iframe._url); } catch (_) { } }
 const blob = new Blob([String(source == null ? '' : source)], { type: 'text/html;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 iframe._url = url;
 iframe.src = url;
}
function runPreview() {
 if (!aiPreviewFrame) return;
 const code = aiCodeEditor ? aiCodeEditor.value : '';
 if (!code || !code.trim()) {
   setFrame(aiPreviewFrame, '<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#0f1115;color:#8b92a0">Nothing to preview</body></html>');
   return;
 }
 setFrame(aiPreviewFrame, injectDebug(code));
}

function setLocked(locked) {
 if (aiLockBanner) aiLockBanner.hidden = !locked;
 if (aiSend) aiSend.disabled = !!locked;
}

function buildContext(compState, currentUserText) {
 if (!compState || !Array.isArray(compState.chatHistory)) return [];
 const h = compState.chatHistory.slice();
 if (h.length && h[h.length - 1].role === 'user' && h[h.length - 1].text === currentUserText) h.pop();
 const out = []; let total = 0;
 for (let i = h.length - 1; i >= 0; i--) {
   const m = h[i];
   if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
   const text = String(m.text || '');
   if (!text) continue;
   if (total + text.length > AI_MAX_CONTEXT_CHARS && out.length >= 4) break;
   out.push({ role: m.role, content: text });
   total += text.length;
 }
 out.reverse();
 return out;
}
function buildSystem() {
 const cs = activeComponentState || {};
 const original = cs.originalCode || '(unavailable)';
 const current = cs.currentCode || '(none)';
 return [
   'You are an expert frontend developer working for ZiiUI.',
   '',
   'You are editing the currently selected ZiiUI component through an iterative conversation.',
   'The current edited code is the authoritative working version.',
   "Apply the user's latest request to the current edited code.",
   'Use previous conversation messages to resolve references such as "it", "this", "that".',
   'Do not revert previous changes unless the user explicitly asks.',
   'Preserve all functionality that was not requested to change.',
   'Return ONLY the complete updated runnable HTML component. No explanations. No markdown fences.',
   '',
   'Component: ' + (cs.componentName || '(none)'),
   'Category: ' + (cs.category || '(none)'),
   '',
   'Original code:',
   original,
   '',
   'Current edited code (authoritative):',
   current
 ].join('\n');
}
function normalize(text) {
 let t = String(text == null ? '' : text).trim();
 if (!t) return '';
 const fenced = t.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)```/);
 if (fenced && fenced[1] && fenced[1].trim()) t = fenced[1].trim();
 else t = t.replace(/^```[a-zA-Z0-9]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
 const i = t.search(/<!DOCTYPE\s+html/i);
 if (i > 0) t = t.slice(i);
 return t.trim();
}
function looksLikeCode(code) {
 if (!code || code.trim().length < 20) return false;
 const c = code.toLowerCase();
 ['html', 'body', 'div', 'section', 'canvas', 'svg', 'style'].forEach(t => { if (c.indexOf(LT + t) >= 0) return true; });
 return c.indexOf(LT + 'scr') >= 0 || c.indexOf(LT + 'div') >= 0;
}

async function callOpenRouter(userRequest, signal) {
 if (!OPENROUTER_API_KEY) throw new Error('NOKEY');
 const ctx = buildContext(activeComponentState, userRequest);
 const msgs = [{ role: 'system', content: buildSystem() }];
 ctx.forEach(m => msgs.push(m));
 msgs.push({ role: 'user', content: userRequest });

 let last = null;
 for (let i = 0; i < OPENROUTER_MODELS.length; i++) {
   if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
   const model = OPENROUTER_MODELS[i];
   try {
     const res = await fetch(OPENROUTER_ENDPOINT, {
       method: 'POST',
       headers: {
         'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
         'Content-Type': 'application/json',
         'HTTP-Referer': location.origin,
         'X-Title': 'ZiiUI'
       },
       body: JSON.stringify({ model, messages: msgs, temperature: 0.7, max_tokens: 5000 }),
       signal
     });
     if (res.status === 401 || res.status === 403) throw new Error('AUTH');
     if (res.status === 429) { last = new Error('RATE'); continue; }
     if (!res.ok) { last = new Error('API:' + res.status); continue; }
     const data = await res.json().catch(() => null);
     if (!data) { last = new Error('BADJSON'); continue; }
     const out = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
     if (!out) { last = new Error('EMPTY'); continue; }
     const code = normalize(out);
     if (!code) { last = new Error('EMPTY'); continue; }
     if (!looksLikeCode(code)) { last = new Error('INVALID'); continue; }
     return code;
   } catch (err) {
     if (err && err.name === 'AbortError') throw err;
     if (err && err.message === 'AUTH') throw err;
     last = err;
   }
 }
 throw new Error('ALLMODELS');
}

async function generate() {
 if (aiBusy) return;
 if (!activeComponentState) { addMessage('err', 'No component selected. Open index.html first.'); return; }
 const req = (aiPrompt.value || '').trim();
 if (!req) { addMessage('err', 'Please describe what you want to change.'); return; }

 aiBusy = true;
 const requestId = uid();
 activeAIRequestId = requestId;
 const compId = activeId;

 persistAIState();
 try { safeSet(AI_PENDING_KEY, JSON.stringify({ requestId, componentId: compId, timestamp: Date.now() })); } catch (_) { }

 aiPrompt.value = '';
 setLocked(true);
 pushChat('user', req);
 addMessage('user', req);
 showLoading();
 say('AI is editing…');

 const ctrl = new AbortController();
 activeAIRequestController = ctrl;
 const timeout = setTimeout(() => { try { ctrl.abort(); } catch (_) { } }, AI_REQUEST_TIMEOUT_MS);

 try {
   const code = await callOpenRouter(req, ctrl.signal);
   clearTimeout(timeout);
   if (requestId !== activeAIRequestId || compId !== activeId) return;
   hideLoading();
   activeComponentState.currentCode = code;
   const version = { id: uid(), code, prompt: req, timestamp: Date.now() };
   activeComponentState.codeVersions.push(version);
   if (activeComponentState.codeVersions.length > AI_MAX_VERSIONS) {
     activeComponentState.codeVersions = activeComponentState.codeVersions.slice(-AI_MAX_VERSIONS);
   }
   activeComponentState.activeVersionId = version.id;
   activeComponentState.lastUpdated = Date.now();
   persistAIState();
   pushChat('assistant', 'Applied: ' + req);
   addMessage('ai', 'Updated. Loading into the editor…');
   if (aiCodeEditor) aiCodeEditor.value = code;
   runPreview();
   updateIndicator();
   say('AI version generated.');
 } catch (err) {
   clearTimeout(timeout);
   if (requestId !== activeAIRequestId) return;
   hideLoading();
   const aborted = err && err.name === 'AbortError';
   addMessage('err', aborted ? 'Request cancelled or timed out. Existing code preserved.' : 'AI error: ' + err.message);
 } finally {
   try { safeRemove(AI_PENDING_KEY); } catch (_) { }
   if (requestId === activeAIRequestId) {
     aiBusy = false; activeAIRequestId = null; activeAIRequestController = null;
     setLocked(false);
   }
 }
}

function boot() {
 loadAISettings();
 loadAIState();
 if (aiAutoPreview) aiAutoPreview.checked = !!aiSettings.autoPreview;

 const savedActive = safeGet(AI_ACTIVE_KEY);
 if (savedActive && aiState.components[savedActive]) {
   activeId = savedActive;
   activeComponentState = aiState.components[savedActive];
 } else {
   const ids = Object.keys(aiState.components);
   if (ids.length) { activeId = ids[0]; activeComponentState = aiState.components[activeId]; }
 }

 if (!activeComponentState) {
   aiHeadSub.textContent = 'No component selected — open index.html first.';
   renderChat(); updateIndicator();
   return;
 }
 aiHeadSub.textContent = 'Editing: ' + (activeComponentState.componentName || activeId);
 if (aiCodeEditor) aiCodeEditor.value = activeComponentState.currentCode || activeComponentState.originalCode || '';
 runPreview();
 renderChat(); updateIndicator();

 // pending marker
 const pending = safeGet(AI_PENDING_KEY);
 if (pending) {
   safeRemove(AI_PENDING_KEY);
   try {
     const p = JSON.parse(pending);
     if (p && p.componentId === activeId) {
       pushChat('assistant', 'Previous AI session restored. The interrupted request was not completed.');
       renderChat();
     }
   } catch (_) { }
 }

 // wire
 if (aiSend) aiSend.addEventListener('click', generate);
 if (aiCancelRequest) aiCancelRequest.addEventListener('click', () => { try { activeAIRequestController && activeAIRequestController.abort(); } catch (_) { } });
 if (aiPrompt) {
   aiPrompt.addEventListener('keydown', e => {
     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!aiBusy) generate(); }
   });
 }
 if (aiCodeEditor) {
   aiCodeEditor.addEventListener('input', () => {
     if (!activeComponentState) return;
     activeComponentState.currentCode = aiCodeEditor.value;
     activeComponentState.lastUpdated = Date.now();
     persistAIState();
     if (aiAutoPreview && aiAutoPreview.checked) {
       clearTimeout(aiAutoTimer);
       aiAutoTimer = setTimeout(runPreview, 500);
     }
   });
 }
 if (aiAutoPreview) {
   aiAutoPreview.addEventListener('change', () => {
     aiSettings.autoPreview = !!aiAutoPreview.checked;
     persistAISettings();
     if (aiAutoPreview.checked) runPreview();
   });
 }
}

window.addEventListener('DOMContentLoaded', boot);
})();
 */


'use strict';
(function () {
    const $ = id => document.getElementById(id);
    const AI_STATE_KEY = 'ziiui-ai-state-v2';
    const AI_ACTIVE_KEY = 'ziiui-ai-active-component';
    const AI_SETTINGS_KEY = 'ziiui-ai-settings';
    const AI_PENDING_KEY = 'ziiui-ai-pending-request';
    const AI_SCHEMA_VERSION = 2;
    const AI_MAX_CONTEXT_CHARS = 8000;
    const AI_REQUEST_TIMEOUT_MS = 90000;
    const AI_MAX_VERSIONS = 30;
    const AI_MAX_MESSAGES = 60;

    const OPENROUTER_API_KEY = '';
    
    const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
    const OPENROUTER_MODELS = [
        "qwen/qwen3-coder:free",
        "poolside/laguna-s-2.1:free",
        "google/gemma-4-26b-a4b-it:free",
        "deepseek/deepseek-r1:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free"
    ];

    const LT = '<', GT = '>', END = n => LT + '/' + n + GT;
    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    let aiState = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
    let aiSettings = { autoPreview: false };
    let activeId = null;
    let activeComponentState = null;
    let aiBusy = false;
    let activeAIRequestId = null;
    let activeAIRequestController = null;
    let aiAutoTimer = null;

    const aiHeadSub = $('aiHeadSub'), aiMsgs = $('aiMsgs'), aiPrompt = $('aiPrompt'),
        aiSend = $('aiSend'), aiCodeEditor = $('aiCodeEditor'), aiPreviewFrame = $('aiPreviewFrame'),
        aiAutoPreview = $('aiAutoPreview'), aiLockBanner = $('aiLockBanner'),
        aiCancelRequest = $('aiCancelRequest'), aiContextText = $('aiContextText');

    function uid() {
        try { if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch (_) { }
        return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    function safeGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
    function safeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
    function safeRemove(k) { try { localStorage.removeItem(k); } catch (_) { } }
    function say(msg) { const el = $('status'); if (el) el.textContent = msg; }

    function loadAIState() {
        const raw = safeGet(AI_STATE_KEY);
        if (!raw) return;
        try {
            const p = JSON.parse(raw);
            if (!p || typeof p !== 'object') throw new Error('bad');
            if (p.schemaVersion !== AI_SCHEMA_VERSION) return;
            if (!p.components || typeof p.components !== 'object') p.components = {};
            Object.keys(p.components).forEach(k => {
                const c = p.components[k];
                if (!c || typeof c !== 'object') { delete p.components[k]; return; }
                if (!Array.isArray(c.chatHistory)) c.chatHistory = [];
                if (!Array.isArray(c.codeVersions)) c.codeVersions = [];
            });
            aiState = p;
        } catch (_) {
            aiState = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
        }
    }
    function persistAIState() {
        try { aiState.schemaVersion = AI_SCHEMA_VERSION; return safeSet(AI_STATE_KEY, JSON.stringify(aiState)); }
        catch (_) { return false; }
    }
    function loadAISettings() {
        const raw = safeGet(AI_SETTINGS_KEY);
        if (!raw) return;
        try { const s = JSON.parse(raw); if (s && typeof s === 'object') aiSettings = { autoPreview: !!s.autoPreview }; } catch (_) { }
    }
    function persistAISettings() { safeSet(AI_SETTINGS_KEY, JSON.stringify(aiSettings)); }

    function addMessage(role, text) {
        if (!aiMsgs) return null;
        const d = document.createElement('div');
        d.className = 'ai-msg ' + role; d.textContent = text;
        aiMsgs.append(d); aiMsgs.scrollTop = aiMsgs.scrollHeight;
        return d;
    }
    function showLoading() {
        if (!aiMsgs) return; hideLoading();
        const d = document.createElement('div');
        d.className = 'ai-msg ai'; d.id = 'aiLoading';
        d.innerHTML = '<span class="ai-dots" aria-hidden="true"><i></i><i></i><i></i></span>AI is editing your component…';
        aiMsgs.append(d); aiMsgs.scrollTop = aiMsgs.scrollHeight;
    }
    function hideLoading() { const l = $('aiLoading'); if (l) l.remove(); }

    function renderChat() {
        if (!aiMsgs) return;
        aiMsgs.innerHTML = '';
        if (!activeComponentState) {
            addMessage('ai', 'Select a component in the main library, then come back.');
            return;
        }
        const h = activeComponentState.chatHistory || [];
        if (!h.length) {
            addMessage('ai', 'No messages yet for "' + (activeComponentState.componentName || activeId) + '". Ask for a change below.');
            return;
        }
        h.forEach(m => addMessage(m.role === 'user' ? 'user' : 'ai', m.text));
        aiMsgs.scrollTop = aiMsgs.scrollHeight;
    }
    function updateIndicator() {
        if (!aiContextText) return;
        if (!activeComponentState) { aiContextText.textContent = 'No component'; return; }
        const msgs = (activeComponentState.chatHistory || []).length;
        const vers = (activeComponentState.codeVersions || []).length;
        aiContextText.textContent = (activeComponentState.componentName || activeId) + ' · ' + msgs + ' msg · ' + vers + ' v';
    }
    function pushChat(role, text) {
        if (!activeComponentState) return null;
        const msg = { id: uid(), role: role === 'ai' ? 'assistant' : role, text: String(text || ''), timestamp: Date.now() };
        activeComponentState.chatHistory.push(msg);
        if (activeComponentState.chatHistory.length > AI_MAX_MESSAGES) {
            activeComponentState.chatHistory = activeComponentState.chatHistory.slice(-AI_MAX_MESSAGES);
        }
        activeComponentState.lastUpdated = Date.now();
        persistAIState();
        return msg;
    }

    function injectDebug(code) {
        const src = String(code || '');
        const marker = LT + 'head' + GT;
        const i = src.indexOf(marker);
        const hook = LT + 'script' + GT +
            'window.addEventListener("error",function(e){try{parent.postMessage({__ziiui:1,message:String((e&&e.message)||e)},"*");}catch(_){}});' +
            LT + '/script' + GT;
        if (i === -1) return hook + '\n' + src;
        const at = i + marker.length;
        return src.slice(0, at) + '\n' + hook + src.slice(at);
    }
    function setFrame(iframe, source) {
        if (!iframe) return;
        if (iframe._url) { try { URL.revokeObjectURL(iframe._url); } catch (_) { } }
        const blob = new Blob([String(source == null ? '' : source)], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        iframe._url = url;
        iframe.src = url;
    }
    function runPreview() {
        if (!aiPreviewFrame) return;
        const code = aiCodeEditor ? aiCodeEditor.value : '';
        if (!code || !code.trim()) {
            setFrame(aiPreviewFrame, '<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#0f1115;color:#8b92a0">Nothing to preview</body></html>');
            return;
        }
        setFrame(aiPreviewFrame, injectDebug(code));
    }

    function setLocked(locked) {
        if (aiLockBanner) aiLockBanner.hidden = !locked;
        if (aiSend) aiSend.disabled = !!locked;
    }

    function buildContext(compState, currentUserText) {
        if (!compState || !Array.isArray(compState.chatHistory)) return [];
        const h = compState.chatHistory.slice();
        if (h.length && h[h.length - 1].role === 'user' && h[h.length - 1].text === currentUserText) h.pop();
        const out = []; let total = 0;
        for (let i = h.length - 1; i >= 0; i--) {
            const m = h[i];
            if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
            const text = String(m.text || '');
            if (!text) continue;
            if (total + text.length > AI_MAX_CONTEXT_CHARS && out.length >= 4) break;
            out.push({ role: m.role, content: text });
            total += text.length;
        }
        out.reverse();
        return out;
    }
    function buildSystem() {
        const cs = activeComponentState || {};
        const original = cs.originalCode || '(unavailable)';
        const current = cs.currentCode || '(none)';
        return [
            'You are an expert frontend developer working for ZiiUI.',
            '',
            'You are editing the currently selected ZiiUI component through an iterative conversation.',
            'The current edited code is the authoritative working version.',
            "Apply the user's latest request to the current edited code.",
            'Use previous conversation messages to resolve references such as "it", "this", "that".',
            'Do not revert previous changes unless the user explicitly asks.',
            'Preserve all functionality that was not requested to change.',
            'Return ONLY the complete updated runnable HTML component. No explanations. No markdown fences.',
            '',
            'Component: ' + (cs.componentName || '(none)'),
            'Category: ' + (cs.category || '(none)'),
            '',
            'Original code:',
            original,
            '',
            'Current edited code (authoritative):',
            current
        ].join('\n');
    }
    function normalize(text) {
        let t = String(text == null ? '' : text).trim();
        if (!t) return '';
        const fenced = t.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)```/);
        if (fenced && fenced[1] && fenced[1].trim()) t = fenced[1].trim();
        else t = t.replace(/^```[a-zA-Z0-9]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
        const i = t.search(/<!DOCTYPE\s+html/i);
        if (i > 0) t = t.slice(i);
        return t.trim();
    }
    function looksLikeCode(code) {
        if (!code || code.trim().length < 20) return false;
        const c = code.toLowerCase();
        ['html', 'body', 'div', 'section', 'canvas', 'svg', 'style'].forEach(t => { if (c.indexOf(LT + t) >= 0) return true; });
        return c.indexOf(LT + 'scr') >= 0 || c.indexOf(LT + 'div') >= 0;
    }

    async function callOpenRouter(userRequest, signal) {
        if (!OPENROUTER_API_KEY) throw new Error('NOKEY');
        const ctx = buildContext(activeComponentState, userRequest);
        const msgs = [{ role: 'system', content: buildSystem() }];
        ctx.forEach(m => msgs.push(m));
        msgs.push({ role: 'user', content: userRequest });

        let last = null;
        for (let i = 0; i < OPENROUTER_MODELS.length; i++) {
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            const model = OPENROUTER_MODELS[i];
            try {
                const res = await fetch(OPENROUTER_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': location.origin,
                        'X-Title': 'ZiiUI'
                    },
                    body: JSON.stringify({ model, messages: msgs, temperature: 0.7, max_tokens: 5000 }),
                    signal
                });
                if (res.status === 401 || res.status === 403) throw new Error('AUTH');
                if (res.status === 429) { last = new Error('RATE'); continue; }
                if (!res.ok) { last = new Error('API:' + res.status); continue; }
                const data = await res.json().catch(() => null);
                if (!data) { last = new Error('BADJSON'); continue; }
                const out = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                if (!out) { last = new Error('EMPTY'); continue; }
                const code = normalize(out);
                if (!code) { last = new Error('EMPTY'); continue; }
                if (!looksLikeCode(code)) { last = new Error('INVALID'); continue; }
                return code;
            } catch (err) {
                if (err && err.name === 'AbortError') throw err;
                if (err && err.message === 'AUTH') throw err;
                last = err;
            }
        }
        throw new Error('ALLMODELS');
    }

    async function generate() {
        if (aiBusy) return;
        if (!activeComponentState) { addMessage('err', 'No component selected. Open index.html first.'); return; }
        const req = (aiPrompt.value || '').trim();
        if (!req) { addMessage('err', 'Please describe what you want to change.'); return; }

        aiBusy = true;
        const requestId = uid();
        activeAIRequestId = requestId;
        const compId = activeId;

        persistAIState();
        try { safeSet(AI_PENDING_KEY, JSON.stringify({ requestId, componentId: compId, timestamp: Date.now() })); } catch (_) { }

        aiPrompt.value = '';
        setLocked(true);
        pushChat('user', req);
        addMessage('user', req);
        showLoading();
        say('AI is editing…');

        const ctrl = new AbortController();
        activeAIRequestController = ctrl;
        const timeout = setTimeout(() => { try { ctrl.abort(); } catch (_) { } }, AI_REQUEST_TIMEOUT_MS);

        try {
            const code = await callOpenRouter(req, ctrl.signal);
            clearTimeout(timeout);
            if (requestId !== activeAIRequestId || compId !== activeId) return;
            hideLoading();
            activeComponentState.currentCode = code;
            const version = { id: uid(), code, prompt: req, timestamp: Date.now() };
            activeComponentState.codeVersions.push(version);
            if (activeComponentState.codeVersions.length > AI_MAX_VERSIONS) {
                activeComponentState.codeVersions = activeComponentState.codeVersions.slice(-AI_MAX_VERSIONS);
            }
            activeComponentState.activeVersionId = version.id;
            activeComponentState.lastUpdated = Date.now();
            persistAIState();
            pushChat('assistant', 'Applied: ' + req);
            addMessage('ai', 'Updated. Loading into the editor…');
            if (aiCodeEditor) aiCodeEditor.value = code;
            runPreview();
            updateIndicator();
            say('AI version generated.');
        } catch (err) {
            clearTimeout(timeout);
            if (requestId !== activeAIRequestId) return;
            hideLoading();
            const aborted = err && err.name === 'AbortError';
            addMessage('err', aborted ? 'Request cancelled or timed out. Existing code preserved.' : 'AI error: ' + err.message);
        } finally {
            try { safeRemove(AI_PENDING_KEY); } catch (_) { }
            if (requestId === activeAIRequestId) {
                aiBusy = false; activeAIRequestId = null; activeAIRequestController = null;
                setLocked(false);
            }
        }
    }

    function boot() {
        loadAISettings();
        loadAIState();
        if (aiAutoPreview) aiAutoPreview.checked = !!aiSettings.autoPreview;

        const savedActive = safeGet(AI_ACTIVE_KEY);
        if (savedActive && aiState.components[savedActive]) {
            activeId = savedActive;
            activeComponentState = aiState.components[savedActive];
        } else {
            const ids = Object.keys(aiState.components);
            if (ids.length) { activeId = ids[0]; activeComponentState = aiState.components[activeId]; }
        }

        if (!activeComponentState) {
            aiHeadSub.textContent = 'No component selected — open index.html first.';
            renderChat(); updateIndicator();
            return;
        }
        aiHeadSub.textContent = 'Editing: ' + (activeComponentState.componentName || activeId);
        if (aiCodeEditor) aiCodeEditor.value = activeComponentState.currentCode || activeComponentState.originalCode || '';
        runPreview();
        renderChat(); updateIndicator();

        // pending marker
        const pending = safeGet(AI_PENDING_KEY);
        if (pending) {
            safeRemove(AI_PENDING_KEY);
            try {
                const p = JSON.parse(pending);
                if (p && p.componentId === activeId) {
                    pushChat('assistant', 'Previous AI session restored. The interrupted request was not completed.');
                    renderChat();
                }
            } catch (_) { }
        }

        // wire
        if (aiSend) aiSend.addEventListener('click', generate);
        if (aiCancelRequest) aiCancelRequest.addEventListener('click', () => { try { activeAIRequestController && activeAIRequestController.abort(); } catch (_) { } });
        if (aiPrompt) {
            aiPrompt.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!aiBusy) generate(); }
            });
        }
        if (aiCodeEditor) {
            aiCodeEditor.addEventListener('input', () => {
                if (!activeComponentState) return;
                activeComponentState.currentCode = aiCodeEditor.value;
                activeComponentState.lastUpdated = Date.now();
                persistAIState();
                if (aiAutoPreview && aiAutoPreview.checked) {
                    clearTimeout(aiAutoTimer);
                    aiAutoTimer = setTimeout(runPreview, 500);
                }
            });
        }
        if (aiAutoPreview) {
            aiAutoPreview.addEventListener('change', () => {
                aiSettings.autoPreview = !!aiAutoPreview.checked;
                persistAISettings();
                if (aiAutoPreview.checked) runPreview();
            });
        }
    }

    window.addEventListener('DOMContentLoaded', boot);
})();