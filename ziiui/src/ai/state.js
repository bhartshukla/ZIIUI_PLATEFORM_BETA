/*
 * Persistent AI state (per-component chat history + code versions), stored in
 * localStorage so the library page, the AI editor page and the context viewer
 * all see the same data.
 */
import {
  AI_STATE_KEY, AI_ACTIVE_KEY, AI_SETTINGS_KEY, AI_SCHEMA_VERSION,
  AI_MAX_CONTEXT_CHARS, AI_MAX_VERSIONS, AI_MAX_MESSAGES
} from './config.js';
import { safeGet, safeSet, safeRemove, onStorageError, uid } from '../lib/storage.js';
import { say } from '../lib/dom.js';

const freshState = () => ({ schemaVersion: AI_SCHEMA_VERSION, components: {} });

function normalizeComponentState(componentId, entry = {}) {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const chatHistory = Array.isArray(safeEntry.chatHistory) ? safeEntry.chatHistory : [];
  const codeVersions = Array.isArray(safeEntry.codeVersions) ? safeEntry.codeVersions : [];
  return {
    componentId: String(componentId || safeEntry.componentId || 'component'),
    componentName: safeEntry.componentName || componentId || 'Component',
    category: safeEntry.category || '',
    originalCode: typeof safeEntry.originalCode === 'string' ? safeEntry.originalCode : '',
    currentCode: typeof safeEntry.currentCode === 'string' ? safeEntry.currentCode : '',
    chatHistory: chatHistory.filter((m) => m && typeof m === 'object' && typeof m.text === 'string' &&
      (m.role === 'user' || m.role === 'assistant' || m.role === 'system')),
    codeVersions: codeVersions.filter((v) => v && typeof v === 'object' && typeof v.code === 'string'),
    activeVersionId: safeEntry.activeVersionId || null,
    summary: typeof safeEntry.summary === 'string' ? safeEntry.summary : '',
    revision: Number.isFinite(Number(safeEntry.revision)) ? Number(safeEntry.revision) : 0,
    lastUpdated: Number.isFinite(Number(safeEntry.lastUpdated)) ? Number(safeEntry.lastUpdated) : Date.now()
  };
}

let aiState = freshState();
let aiSettings = { autoPreview: false };
let storageWarned = false;

onStorageError((err) => {
  if (storageWarned) return;
  storageWarned = true;
  console.warn('[ziiui] storage error', err);
  say('Local AI history could not be saved.');
});

export const getAIState = () => aiState;
export const getAISettings = () => aiSettings;

export function loadAIState() {
  const raw = safeGet(AI_STATE_KEY);
  if (!raw) return aiState;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('bad shape');
    if (parsed.schemaVersion !== AI_SCHEMA_VERSION) {
      aiState = freshState();
      return aiState;
    }
    if (!parsed.components || typeof parsed.components !== 'object') parsed.components = {};
    Object.keys(parsed.components).forEach((k) => {
      const c = parsed.components[k];
      if (!c || typeof c !== 'object') { delete parsed.components[k]; return; }
      parsed.components[k] = normalizeComponentState(k, c);
    });
    aiState = parsed;
  } catch (err) {
    console.warn('[ziiui] corrupted AI state, resetting', err);
    aiState = freshState();
    safeRemove(AI_STATE_KEY);
  }
  return aiState;
}

export function persistAIState() {
  try {
    aiState.schemaVersion = AI_SCHEMA_VERSION;
    return safeSet(AI_STATE_KEY, JSON.stringify(aiState));
  } catch (err) {
    console.warn('[ziiui] could not serialise AI state', err);
    return false;
  }
}

/* ---------- settings ---------- */
export function loadAISettings() {
  const raw = safeGet(AI_SETTINGS_KEY);
  if (!raw) return aiSettings;
  try {
    const s = JSON.parse(raw);
    if (s && typeof s === 'object') aiSettings = { autoPreview: !!s.autoPreview };
  } catch (_) { /* keep defaults */ }
  return aiSettings;
}
export function setAutoPreview(on) {
  aiSettings.autoPreview = !!on;
  safeSet(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
}

/* ---------- active component ---------- */
export const getActiveComponentId = () => safeGet(AI_ACTIVE_KEY);
export function saveActiveComponentId(id) { if (id) safeSet(AI_ACTIVE_KEY, id); }

/* ---------- components ---------- */
export const getComponentState = (id) => aiState.components[id] || null;

export function getOrCreateComponentState(componentId, name, category, originalCode) {
  if (!aiState.components[componentId]) {
    aiState.components[componentId] = normalizeComponentState(componentId, {
      componentId,
      componentName: name || componentId,
      category: category || '',
      originalCode: originalCode || '',
      currentCode: '',
      chatHistory: [],
      codeVersions: [],
      activeVersionId: null,
      summary: '',
      revision: 0,
      lastUpdated: Date.now()
    });
  }
  const s = normalizeComponentState(componentId, aiState.components[componentId]);
  if (name) s.componentName = name;
  if (category) s.category = category;
  if (typeof originalCode === 'string') s.originalCode = originalCode;
  aiState.components[componentId] = s;
  return s;
}

export function clearComponentHistory(componentId) {
  const s = aiState.components[componentId];
  if (!s) return;
  s.chatHistory = [];
  s.codeVersions = [];
  s.currentCode = '';
  s.activeVersionId = null;
  s.summary = '';
  s.revision = (Number(s.revision) || 0) + 1;
  s.lastUpdated = Date.now();
  persistAIState();
}

export function clearAllAIHistory() {
  aiState = freshState();
  persistAIState();
  safeRemove(AI_ACTIVE_KEY);
}

/** Record the code the user is currently editing ('' when identical to the original). */
export function setCurrentCode(compState, code) {
  if (!compState) return;
  const next = typeof code === 'string' ? code : '';
  const previous = typeof compState.currentCode === 'string' ? compState.currentCode : '';
  compState.currentCode = next && next !== compState.originalCode ? next : '';
  if (previous !== compState.currentCode) compState.revision = (Number(compState.revision) || 0) + 1;
  compState.lastUpdated = Date.now();
  persistAIState();
}

/* ---------- chat + versions ---------- */
function summarizeHistory(history) {
  const lines = Array.isArray(history) ? history.slice(-12).map((m) => m && typeof m.text === 'string' ? m.text.trim() : '').filter(Boolean) : [];
  if (!lines.length) return '';
  return lines.join(' ').replace(/\s+/g, ' ').slice(0, 800);
}

export function pushChatMessage(compState, role, text) {
  if (!compState) return null;
  const msg = {
    id: uid(),
    role: role === 'ai' ? 'assistant' : role,
    text: String(text || ''),
    timestamp: Date.now()
  };
  compState.chatHistory.push(msg);
  if (compState.chatHistory.length > AI_MAX_MESSAGES) {
    compState.chatHistory = compState.chatHistory.slice(-AI_MAX_MESSAGES);
  }
  compState.summary = summarizeHistory(compState.chatHistory);
  compState.lastUpdated = Date.now();
  persistAIState();
  return msg;
}

export function addCodeVersion(compState, code, prompt) {
  const version = { id: uid(), code, prompt, timestamp: Date.now() };
  compState.currentCode = code;
  compState.codeVersions.push(version);
  if (compState.codeVersions.length > AI_MAX_VERSIONS) {
    compState.codeVersions = compState.codeVersions.slice(-AI_MAX_VERSIONS);
  }
  compState.activeVersionId = version.id;
  compState.summary = summarizeHistory(compState.chatHistory);
  compState.revision = (Number(compState.revision) || 0) + 1;
  compState.lastUpdated = Date.now();
  persistAIState();
  return version;
}

export function getConversationSummary(compState) {
  if (!compState) return '';
  if (typeof compState.summary === 'string' && compState.summary.trim()) return compState.summary.trim();
  const relevant = (compState.chatHistory || []).slice(-8).map((m) => m && typeof m.text === 'string' ? m.text : '').filter(Boolean);
  if (!relevant.length) return '';
  return relevant.join(' ').slice(0, 280);
}

export function setConversationSummary(compState, summary) {
  if (!compState) return '';
  const text = String(summary || '').trim();
  compState.summary = text.slice(0, 800);
  compState.lastUpdated = Date.now();
  persistAIState();
  return compState.summary;
}

/** Recent chat turns (oldest first) that fit the context budget. */
export function buildContextMessages(compState, currentUserText) {
  if (!compState || !Array.isArray(compState.chatHistory)) return [];
  const history = compState.chatHistory.slice();
  const last = history[history.length - 1];
  const isPendingUserMessage = !!(last && last.role === 'user' && last.text === currentUserText);
  if (isPendingUserMessage) history.pop();

  const summary = isPendingUserMessage ? '' : getConversationSummary(compState);
  const result = [];
  let total = 0;

  if (summary) {
    result.push({ role: 'system', content: 'Conversation summary: ' + summary });
    total += result[0].content.length;
  }

  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const text = String(m.text || '');
    if (!text) continue;
    if (total + text.length > AI_MAX_CONTEXT_CHARS && result.length > 1) break;
    result.push({ role: m.role, content: text });
    total += text.length;
  }

  return result.reverse();
}

/** One-line summary used by the chat context indicator. */
export function describeContext(compState, name) {
  if (!compState) return 'New AI session';
  const msgs = compState.chatHistory.length;
  const versions = compState.codeVersions.length;
  if (msgs === 0) return 'New AI session · ' + name;
  return `${name} · ${msgs} msg · ${versions} version${versions === 1 ? '' : 's'} · Saved locally`;
}
