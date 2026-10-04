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
      if (!Array.isArray(c.chatHistory)) c.chatHistory = [];
      if (!Array.isArray(c.codeVersions)) c.codeVersions = [];
      c.chatHistory = c.chatHistory.filter((m) =>
        m && typeof m === 'object' && typeof m.text === 'string' &&
        (m.role === 'user' || m.role === 'assistant'));
      c.codeVersions = c.codeVersions.filter((v) =>
        v && typeof v === 'object' && typeof v.code === 'string');
      if (typeof c.originalCode !== 'string') c.originalCode = '';
      if (typeof c.currentCode !== 'string') c.currentCode = '';
      if (typeof c.componentId !== 'string') c.componentId = k;
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
    aiState.components[componentId] = {
      componentId,
      componentName: name || componentId,
      category: category || '',
      originalCode: originalCode || '',
      currentCode: '',
      chatHistory: [],
      codeVersions: [],
      activeVersionId: null,
      lastUpdated: Date.now()
    };
  }
  const s = aiState.components[componentId];
  if (name) s.componentName = name;
  if (category) s.category = category;
  if (originalCode) s.originalCode = originalCode;
  return s;
}

export function clearComponentHistory(componentId) {
  const s = aiState.components[componentId];
  if (!s) return;
  s.chatHistory = [];
  s.codeVersions = [];
  s.currentCode = '';
  s.activeVersionId = null;
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
  compState.currentCode = code && code !== compState.originalCode ? code : '';
  compState.lastUpdated = Date.now();
  persistAIState();
}

/* ---------- chat + versions ---------- */
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
  compState.lastUpdated = Date.now();
  persistAIState();
  return version;
}

/** Recent chat turns (oldest first) that fit the context budget. */
export function buildContextMessages(compState, currentUserText) {
  if (!compState || !Array.isArray(compState.chatHistory)) return [];
  const history = compState.chatHistory.slice();
  const last = history[history.length - 1];
  if (last && last.role === 'user' && last.text === currentUserText) history.pop();
  const result = [];
  let total = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const text = String(m.text || '');
    if (!text) continue;
    if (total + text.length > AI_MAX_CONTEXT_CHARS && result.length >= 4) break;
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
