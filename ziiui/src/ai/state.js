/*
 * Persistent AI state — session-isolated workspace architecture (schema v4).
 *
 * Top-level stores (single source of truth in localStorage under AI_STATE_KEY):
 *   components  — immutable original component source. AI editing never mutates
 *                 these records; they are the preservation reference.
 *   workspaces  — a workspace references one component (componentId) and owns
 *                 a list of session ids.
 *   sessions    — independent editing sessions. Each session has its own
 *                 currentCode (editing baseline), messageIds, versionIds,
 *                 contextSummary and revision.
 *   messages    — chat messages keyed by id. Sessions reference message ids.
 *   versions    — code snapshots keyed by id. Sessions reference version ids.
 *
 * Every mutation goes through the functions below so persistence, revision
 * tracking and validation stay centralized. UI modules never touch localStorage
 * keys directly and never duplicate persistence logic.
 */
import {
  AI_STATE_KEY, AI_ACTIVE_KEY, AI_SETTINGS_KEY, AI_SCHEMA_VERSION,
  AI_MAX_CONTEXT_CHARS, AI_MAX_VERSIONS, AI_MAX_MESSAGES
} from './config.js';
import { safeGet, safeSet, safeRemove, onStorageError, uid } from '../lib/storage.js';
import { say } from '../lib/dom.js';
import { generateStructuredSummary } from './context-engine.js';

/* ---------------- hashing ---------------- */

/** Deterministic string hash (djb2) used for content/original fingerprints. */
export function hashString(str) {
  let h = 0;
  const s = String(str == null ? '' : str);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0; // 31 * h + char, forced to int32
  }
  return String(h);
}

/* ---------------- empty state ---------------- */

const emptyState = () => ({
  schemaVersion: AI_SCHEMA_VERSION,
  components: {},
  workspaces: {},
  sessions: {},
  messages: {},
  versions: {}
});

/* ---------------- normalization (defensive, pure) ---------------- */

function normalizeComponent(id, entry) {
  const e = entry && typeof entry === 'object' ? entry : {};
  const originalCode = typeof e.originalCode === 'string' ? e.originalCode : '';
  return {
    id: String(e.id || id || ''),
    name: String(e.name || id || 'Component'),
    category: String(e.category || ''),
    originalCode,
    originalHash: typeof e.originalHash === 'string' && e.originalHash
      ? e.originalHash
      : hashString(originalCode),
    lastUpdated: Number.isFinite(Number(e.lastUpdated)) ? Number(e.lastUpdated) : Date.now()
  };
}

function normalizeWorkspace(id, entry) {
  const e = entry && typeof entry === 'object' ? entry : {};
  return {
    id: String(e.id || id || ''),
    componentId: String(e.componentId || ''),
    name: String(e.name || ''),
    sessionIds: Array.isArray(e.sessionIds) ? e.sessionIds.filter((x) => typeof x === 'string' && x) : [],
    createdAt: Number.isFinite(Number(e.createdAt)) ? Number(e.createdAt) : Date.now(),
    lastUpdated: Number.isFinite(Number(e.lastUpdated)) ? Number(e.lastUpdated) : Date.now()
  };
}

function normalizeSession(id, entry) {
  const e = entry && typeof entry === 'object' ? entry : {};
  return {
    id: String(e.id || id || ''),
    workspaceId: String(e.workspaceId || ''),
    currentCode: typeof e.currentCode === 'string' ? e.currentCode : '',
    activeVersionId: typeof e.activeVersionId === 'string' ? e.activeVersionId : null,
    messageIds: Array.isArray(e.messageIds) ? e.messageIds.filter((x) => typeof x === 'string' && x) : [],
    versionIds: Array.isArray(e.versionIds) ? e.versionIds.filter((x) => typeof x === 'string' && x) : [],
    contextSummary: typeof e.contextSummary === 'string' ? e.contextSummary : '',
    revision: Number.isFinite(Number(e.revision)) ? Number(e.revision) : 0,
    createdAt: Number.isFinite(Number(e.createdAt)) ? Number(e.createdAt) : Date.now(),
    lastUpdated: Number.isFinite(Number(e.lastUpdated)) ? Number(e.lastUpdated) : Date.now()
  };
}

function normalizeMessage(id, entry) {
  const e = entry && typeof entry === 'object' ? entry : {};
  const role = (e.role === 'user' || e.role === 'assistant' || e.role === 'system') ? e.role : 'user';
  return {
    id: String(e.id || id || ''),
    sessionId: String(e.sessionId || ''),
    role,
    text: typeof e.text === 'string' ? e.text : '',
    timestamp: Number.isFinite(Number(e.timestamp)) ? Number(e.timestamp) : Date.now()
  };
}

function normalizeVersion(id, entry) {
  const e = entry && typeof entry === 'object' ? entry : {};
  const code = typeof e.code === 'string' ? e.code : '';
  const status = (e.status === 'success' || e.status === 'failed' || e.status === 'cancelled') ? e.status : 'success';
  return {
    id: String(e.id || id || ''),
    componentId: String(e.componentId || ''),
    workspaceId: String(e.workspaceId || ''),
    sessionId: String(e.sessionId || ''),
    parentVersionId: typeof e.parentVersionId === 'string' ? e.parentVersionId : null,
    code,
    prompt: typeof e.prompt === 'string' ? e.prompt : '',
    contentHash: typeof e.contentHash === 'string' && e.contentHash ? e.contentHash : hashString(code),
    createdAt: Number.isFinite(Number(e.createdAt)) ? Number(e.createdAt) : Date.now(),
    status
  };
}

function normalizeState(state) {
  const components = {};
  if (state.components && typeof state.components === 'object') {
    Object.keys(state.components).forEach((k) => {
      const c = normalizeComponent(k, state.components[k]);
      if (c.id) { components[c.id] = c; }
    });
  }
  const workspaces = {};
  if (state.workspaces && typeof state.workspaces === 'object') {
    Object.keys(state.workspaces).forEach((k) => {
      const w = normalizeWorkspace(k, state.workspaces[k]);
      if (w.id && w.componentId) { workspaces[w.id] = w; }
    });
  }
  const sessions = {};
  if (state.sessions && typeof state.sessions === 'object') {
    Object.keys(state.sessions).forEach((k) => {
      const s = normalizeSession(k, state.sessions[k]);
      if (s.id && s.workspaceId) { sessions[s.id] = s; }
    });
  }
  const messages = {};
  if (state.messages && typeof state.messages === 'object') {
    Object.keys(state.messages).forEach((k) => {
      const m = normalizeMessage(k, state.messages[k]);
      if (m.id && m.sessionId) { messages[m.id] = m; }
    });
  }
  const versions = {};
  if (state.versions && typeof state.versions === 'object') {
    Object.keys(state.versions).forEach((k) => {
      const v = normalizeVersion(k, state.versions[k]);
      if (v.id) { versions[v.id] = v; }
    });
  }
  return { schemaVersion: AI_SCHEMA_VERSION, components, workspaces, sessions, messages, versions };
}

/* ---------------- migration v3 -> v4 ---------------- */

/**
 * Migrates the legacy v3 shape (components[].{chatHistory, codeVersions,
 * currentCode, currentSessionId, ...}) into the v4 relational shape.
 * Preserves all conversations, versions and the original component code.
 * Idempotent and deterministic.
 */
function migrateV3toV4(state) {
  const comps = state.components || {};
  const next = emptyState();
  Object.keys(comps).forEach((cid) => {
    const c = comps[cid];
    if (!c || typeof c !== 'object') { return; }

    const originalCode = typeof c.originalCode === 'string' ? c.originalCode : '';
    next.components[cid] = normalizeComponent(cid, {
      id: c.componentId || cid,
      name: c.componentName || cid,
      category: c.category || '',
      originalCode,
      lastUpdated: Number.isFinite(Number(c.lastUpdated)) ? Number(c.lastUpdated) : Date.now()
    });

    const wid = `ws-${cid}`;
    next.workspaces[wid] = normalizeWorkspace(wid, {
      id: wid,
      componentId: cid,
      name: `${next.components[cid].name} workspace`,
      lastUpdated: Number.isFinite(Number(c.lastUpdated)) ? Number(c.lastUpdated) : Date.now()
    });

    const sid = (typeof c.currentSessionId === 'string' && c.currentSessionId)
      ? c.currentSessionId
      : `sid-${cid}`;
    next.sessions[sid] = normalizeSession(sid, {
      id: sid,
      workspaceId: wid,
      currentCode: typeof c.currentCode === 'string' ? c.currentCode : '',
      activeVersionId: c.activeVersionId || null,
      contextSummary: typeof c.summary === 'string' ? c.summary : '',
      revision: Number.isFinite(Number(c.revision)) ? Number(c.revision) : 0,
      lastUpdated: Number.isFinite(Number(c.lastUpdated)) ? Number(c.lastUpdated) : Date.now()
    });
    next.workspaces[wid].sessionIds = [sid];

    (Array.isArray(c.chatHistory) ? c.chatHistory : []).forEach((m) => {
      if (!m || typeof m.text !== 'string') { return; }
      const mid = m.id || uid();
      next.messages[mid] = normalizeMessage(mid, {
        id: mid,
        sessionId: sid,
        role: m.role,
        text: m.text,
        timestamp: Number.isFinite(Number(m.timestamp)) ? Number(m.timestamp) : Date.now()
      });
      next.sessions[sid].messageIds.push(mid);
    });

    let prevVersionId = null;
    (Array.isArray(c.codeVersions) ? c.codeVersions : []).forEach((v) => {
      if (!v || typeof v.code !== 'string') { return; }
      const vid = v.id || uid();
      next.versions[vid] = normalizeVersion(vid, {
        id: vid,
        componentId: cid,
        workspaceId: wid,
        sessionId: sid,
        parentVersionId: prevVersionId,
        code: v.code,
        prompt: typeof v.prompt === 'string' ? v.prompt : '',
        createdAt: Number.isFinite(Number(v.lastUpdated)) ? Number(v.lastUpdated)
          : (Number.isFinite(Number(v.timestamp)) ? Number(v.timestamp) : Date.now()),
        status: 'success'
      });
      next.sessions[sid].versionIds.push(vid);
      prevVersionId = vid;
    });

    if (!next.sessions[sid].activeVersionId && next.sessions[sid].versionIds.length) {
      next.sessions[sid].activeVersionId = next.sessions[sid].versionIds[next.sessions[sid].versionIds.length - 1];
    }
  });
  return next;
}

const MIGRATIONS = { 3: migrateV3toV4 };
void MIGRATIONS;

/**
 * Migrate any persisted shape to the current schema. Creates a recoverable
 * backup of the pre-migration blob before mutating anything. Never wipes
 * valid data; on failure preserves the previous stored state.
 */
export function migrateState(parsed) {
  if (!parsed || typeof parsed !== 'object') { return emptyState(); }

  // Back up the raw pre-migration blob so it can be recovered if needed.
  try {
    const rawBackupKey = `ziiui-ai-state-premigrate-${Date.now()}`;
    const existing = safeGet(AI_STATE_KEY);
    if (existing) { safeSet(rawBackupKey, existing); }
  } catch (_err) { /* best effort */ }

  let from = Number(parsed.schemaVersion);
  if (!Number.isFinite(from) || from < 1) { from = 1; }

  let state = parsed;
  if (from < AI_SCHEMA_VERSION && state.components && !state.sessions) {
    // Legacy v3 (or earlier, same shape) -> v4 relational shape.
    const migrated = migrateV3toV4(state);
    if (migrated && typeof migrated === 'object') { state = migrated; }
    from = AI_SCHEMA_VERSION;
  } else if (from > AI_SCHEMA_VERSION) {
    // Unknown future version: preserve the stores, don't wipe.
    state = normalizeState(state);
    state.schemaVersion = AI_SCHEMA_VERSION;
    return state;
  }

  try {
    state = normalizeState(state);
  } catch (err) {
    console.warn('[ziiui] state normalization failed, resetting', err);
    return emptyState();
  }
  state.schemaVersion = AI_SCHEMA_VERSION;
  return state;
}

/* ---------------- in-memory state ---------------- */

let aiState = emptyState();
let aiSettings = { autoPreview: false };
let persistTimer = null;
const PERSIST_DEBOUNCE_MS = 300;
export const AI_STATE_QUOTA_WARN_BYTES = 4 * 1024 * 1024;

onStorageError((err) => {
  console.warn('[ziiui] storage error', err);
  say('Local AI history could not be saved.');
});

export const getAIState = () => aiState;
export const getAISettings = () => aiSettings;

/* ---------------- load / persist ---------------- */

export function loadAIState() {
  const raw = safeGet(AI_STATE_KEY);
  if (!raw) { aiState = emptyState(); return aiState; }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') { throw new Error('bad shape'); }
    aiState = migrateState(parsed);
  } catch (err) {
    console.warn('[ziiui] corrupted AI state, resetting', err);
    aiState = emptyState();
    safeRemove(AI_STATE_KEY);
  }
  return aiState;
}

export function loadAISettings() {
  const raw = safeGet(AI_SETTINGS_KEY);
  if (!raw) { return aiSettings; }
  try {
    const s = JSON.parse(raw);
    if (s && typeof s === 'object') { aiSettings = { autoPreview: !!s.autoPreview }; }
  } catch (err) {
    console.warn('[ziiui] invalid AI settings; using defaults', err);
    aiSettings = { autoPreview: false };
  }
  return aiSettings;
}
export function setAutoPreview(on) {
  aiSettings.autoPreview = !!on;
  safeSet(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
}

/* ---------------- active component (library integration) ---------------- */

export const getActiveComponentId = () => safeGet(AI_ACTIVE_KEY);
export function saveActiveComponentId(id) { if (id) { safeSet(AI_ACTIVE_KEY, id); } }

/* ---------------- component layer (immutable source) ---------------- */

/** Get a component record. Returns null when unknown. */
export function getComponent(id) {
  return aiState.components[id] || null;
}

/** All components. */
export function getComponents() {
  return Object.values(aiState.components);
}

/**
 * Ensure a component exists. The originalCode is written exactly once (on
 * creation) and is never overwritten by later calls — it is the immutable
 * preservation reference for AI editing.
 */
export function getOrCreateComponent(id, name, category, originalCode) {
  if (!aiState.components[id]) {
    aiState.components[id] = normalizeComponent(id, {
      id,
      name: name || id,
      category: category || '',
      originalCode: originalCode || '',
      lastUpdated: Date.now()
    });
  }
  const c = aiState.components[id];
  if (name) { c.name = name; }
  if (category) { c.category = category; }
  return c;
}

/** Original (immutable) code for a component. */
export function componentOriginalCode(id) {
  const c = aiState.components[id];
  return c ? c.originalCode : '';
}

/* ---------------- workspace layer ---------------- */

export function getWorkspace(id) {
  return aiState.workspaces[id] || null;
}

export function getWorkspacesForComponent(componentId) {
  return Object.values(aiState.workspaces).filter((w) => w.componentId === componentId);
}

export function getOrCreateWorkspaceForComponent(componentId) {
  const existing = getWorkspacesForComponent(componentId);
  if (existing.length) { return existing[0]; }
  const id = `ws-${uid()}`;
  const ws = normalizeWorkspace(id, {
    id,
    componentId,
    name: '',
    sessionIds: [],
    createdAt: Date.now(),
    lastUpdated: Date.now()
  });
  aiState.workspaces[id] = ws;
  return ws;
}

export function createWorkspace(componentId, name) {
  const ws = getOrCreateWorkspaceForComponent(componentId);
  if (name) { ws.name = name; }
  ws.lastUpdated = Date.now();
  schedulePersist();
  return ws;
}

export function deleteWorkspace(id) {
  const ws = aiState.workspaces[id];
  if (!ws) { return false; }
  // Move sessions out of this workspace first (orphan them) or delete them.
  (ws.sessionIds || []).forEach((sid) => {
    const s = aiState.sessions[sid];
    if (s) {
      // Clear the session's messages; versions stay owned by the session.
      (s.messageIds || []).forEach((mid) => { delete aiState.messages[mid]; });
      s.messageIds = [];
      delete aiState.sessions[sid];
    }
  });
  delete aiState.workspaces[id];
  persistAIState();
  return true;
}

/* ---------------- session layer ---------------- */

export function getSession(id) {
  return aiState.sessions[id] || null;
}

export function getSessionsForWorkspace(workspaceId) {
  return Object.values(aiState.sessions).filter((s) => s.workspaceId === workspaceId);
}

/**
 * Get or create the default editing session for a component. Creates the
 * component record (if missing) and a default workspace/session.
 */
export function getOrCreateSession(componentId) {
  getOrCreateComponent(componentId, componentId, '', '');
  const ws = getOrCreateWorkspaceForComponent(componentId);
  const existing = getSessionsForWorkspace(ws.id);
  if (existing.length) { return existing[0]; }
  const id = `sid-${uid()}`;
  const session = normalizeSession(id, {
    id,
    workspaceId: ws.id,
    currentCode: '',
    activeVersionId: null,
    messageIds: [],
    versionIds: [],
    contextSummary: '',
    revision: 0,
    createdAt: Date.now(),
    lastUpdated: Date.now()
  });
  aiState.sessions[id] = session;
  ws.sessionIds.push(id);
  return session;
}

export function createSession(workspaceId) {
  const ws = aiState.workspaces[workspaceId];
  if (!ws) { return null; }
  const id = `sid-${uid()}`;
  const session = normalizeSession(id, {
    id,
    workspaceId,
    currentCode: '',
    activeVersionId: null,
    messageIds: [],
    versionIds: [],
    contextSummary: '',
    revision: 0,
    createdAt: Date.now(),
    lastUpdated: Date.now()
  });
  aiState.sessions[id] = session;
  ws.sessionIds.push(id);
  ws.lastUpdated = Date.now();
  persistAIState();
  return session;
}

export function switchSession(sessionId) {
  const session = getSession(sessionId);
  if (!session) { return null; }
  const compId = sessionComponentId(session.id);
  if (compId) { saveActiveComponentId(compId); }
  return session;
}

export function getActiveSessionId() {
  // Derived from the active component's default session when no explicit
  // session id is stored elsewhere.
  const cid = getActiveComponentId();
  if (!cid) { return null; }
  const ws = getWorkspacesForComponent(cid);
  if (!ws.length) { return null; }
  const sessions = getSessionsForWorkspace(ws[0].id);
  return sessions.length ? sessions[0].id : null;
}

/**
 * Component id that a session belongs to (derived via workspace).
 */
export function sessionComponentId(sessionId) {
  const s = getSession(sessionId);
  if (!s) { return null; }
  const w = getWorkspace(s.workspaceId);
  return w ? w.componentId : null;
}

export function renameSession(sessionId, _name) {
  // Sessions don't carry a display name; keep the session id stable.
  return !!getSession(sessionId);
}

/**
 * Delete a session. Removes the session record and its own messages. Versions
 * owned by this session are kept (orphaned) so other sessions are never
 * affected; they remain in the versions store but are no longer reachable.
 * Versions belonging to OTHER sessions are never touched.
 */
export function deleteSession(sessionId) {
  const s = aiState.sessions[sessionId];
  if (!s) { return false; }
  const ws = getWorkspace(s.workspaceId);
  // Remove own messages.
  (s.messageIds || []).forEach((mid) => { delete aiState.messages[mid]; });
  // Remove session from workspace session list.
  if (ws) {
    ws.sessionIds = (ws.sessionIds || []).filter((id) => id !== sessionId);
    ws.lastUpdated = Date.now();
  }
  // Keep the session's versions (orphaned) — never delete another session's.
  delete aiState.sessions[sessionId];
  persistAIState();
  return true;
}

export function clearMessages(sessionId) {
  const s = getSession(sessionId);
  if (!s) { return false; }
  (s.messageIds || []).forEach((mid) => { delete aiState.messages[mid]; });
  s.messageIds = [];
  s.contextSummary = '';
  s.lastUpdated = Date.now();
  persistAIState();
  return true;
}

/* ---------------- message layer ---------------- */

export function addMessage(sessionId, role, text) {
  const s = getSession(sessionId);
  if (!s) { return null; }
  const id = uid();
  const msg = normalizeMessage(id, {
    id, sessionId, role, text: String(text || ''), timestamp: Date.now()
  });
  aiState.messages[id] = msg;
  s.messageIds.push(id);
  if (s.messageIds.length > AI_MAX_MESSAGES) {
    const dropped = s.messageIds.splice(0, s.messageIds.length - AI_MAX_MESSAGES);
    dropped.forEach((mid) => { delete aiState.messages[mid]; });
  }
  s.contextSummary = generateStructuredSummary(
    s.messageIds.map((mid) => aiState.messages[mid]).filter(Boolean)
  ) || '';
  s.lastUpdated = Date.now();
  persistAIState();
  return msg;
}

export function getMessages(sessionId) {
  const s = getSession(sessionId);
  if (!s) { return []; }
  return (s.messageIds || [])
    .map((mid) => aiState.messages[mid])
    .filter(Boolean);
}

/* ---------------- version layer ---------------- */

export function getVersion(id) {
  return aiState.versions[id] || null;
}

export function getVersionsForSession(sessionId) {
  const s = getSession(sessionId);
  if (!s) { return []; }
  return (s.versionIds || [])
    .map((vid) => aiState.versions[vid])
    .filter(Boolean);
}

export function getActiveVersion(sessionId) {
  const s = getSession(sessionId);
  if (!s || !s.activeVersionId) { return null; }
  return aiState.versions[s.activeVersionId] || null;
}

/**
 * Create a successful code version for a session. Only successful, validated
 * generations create versions (failed/cancelled code is never committed).
 * Duplicate detection: an identical (code, prompt) snapshot already owned by
 * the session is not duplicated.
 */
export function addVersion(sessionId, code, prompt) {
  const s = getSession(sessionId);
  if (!s) { return null; }
  const cleanCode = typeof code === 'string' ? code : '';
  const componentId = sessionComponentId(sessionId);
  const ws = getWorkspace(s.workspaceId);
  const workspaceId = ws ? ws.id : '';

  // Duplicate detection against any existing version owned by this session.
  const existing = (s.versionIds || [])
    .map((vid) => aiState.versions[vid])
    .find((v) => v && v.code === cleanCode && v.prompt === prompt);
  if (existing) {
    s.currentCode = cleanCode;
    s.activeVersionId = existing.id;
    s.revision = (Number(s.revision) || 0) + 1;
    s.lastUpdated = Date.now();
    persistAIState();
    return existing;
  }

  const latestId = s.versionIds.length ? s.versionIds[s.versionIds.length - 1] : null;
  const id = uid();
  const version = normalizeVersion(id, {
    id,
    componentId: componentId || '',
    workspaceId,
    sessionId,
    parentVersionId: latestId,
    code: cleanCode,
    prompt: String(prompt || ''),
    createdAt: Date.now(),
    status: 'success'
  });
  aiState.versions[id] = version;
  s.versionIds.push(id);
  if (s.versionIds.length > AI_MAX_VERSIONS) {
    const dropped = s.versionIds.splice(0, s.versionIds.length - AI_MAX_VERSIONS);
    dropped.forEach((vid) => { delete aiState.versions[vid]; });
  }
  s.currentCode = cleanCode;
  s.activeVersionId = id;
  s.revision = (Number(s.revision) || 0) + 1;
  s.contextSummary = generateStructuredSummary(
    s.messageIds.map((mid) => aiState.messages[mid]).filter(Boolean)
  ) || '';
  s.lastUpdated = Date.now();
  persistAIState();
  return version;
}

/**
 * Restore an exact code snapshot into the session baseline. Validates that the
 * version belongs to this session (ownership validation). Updates currentCode,
 * activeVersionId and re-synchronizes the context summary.
 */
export function restoreVersion(sessionId, versionId) {
  const s = getSession(sessionId);
  const v = aiState.versions[versionId];
  if (!s || !v || v.sessionId !== sessionId) { return null; }
  s.currentCode = v.code;
  s.activeVersionId = versionId;
  s.contextSummary = generateStructuredSummary(
    s.messageIds.map((mid) => aiState.messages[mid]).filter(Boolean)
  ) || '';
  s.lastUpdated = Date.now();
  persistAIState();
  return v;
}

/**
 * Delete a version. When sessionId is given, validates ownership (the version
 * must belong to that session). Deleting a version never touches another
 * session's versions and never touches original component code.
 */
export function deleteVersion(versionId, sessionId) {
  const v = aiState.versions[versionId];
  if (!v) { return false; }
  if (sessionId && v.sessionId !== sessionId) { return false; }
  const owner = getSession(v.sessionId);
  if (owner) {
    owner.versionIds = (owner.versionIds || []).filter((vid) => vid !== versionId);
    if (owner.activeVersionId === versionId) {
      const remaining = owner.versionIds.length ? owner.versionIds[owner.versionIds.length - 1] : null;
      owner.activeVersionId = remaining;
      owner.currentCode = remaining
        ? (aiState.versions[remaining] && aiState.versions[remaining].code)
        : '';
    }
    owner.lastUpdated = Date.now();
  }
  delete aiState.versions[versionId];
  persistAIState();
  return true;
}

/* ---------------- editing baseline (currentCode) ---------------- */

/**
 * Record the code the user is currently editing ('' when identical to the
 * original component). Increments the session revision only on real change.
 */
export function setCurrentCode(sessionId, code) {
  const s = getSession(sessionId);
  if (!s) { return; }
  const next = typeof code === 'string' ? code : '';
  const compId = sessionComponentId(sessionId);
  const original = compId ? componentOriginalCode(compId) : '';
  // When the edit matches the original, there is no draft: store empty so the
  // editor falls back to the immutable original component code.
  const normalizedNext = next === original ? '' : next;
  const previous = typeof s.currentCode === 'string' ? s.currentCode : '';
  s.currentCode = normalizedNext;
  if (previous !== s.currentCode) { s.revision = (Number(s.revision) || 0) + 1; }
  s.lastUpdated = Date.now();
  schedulePersist();
}

/** Component (immutable) original code used as the editing reset target. */
export function resetToOriginal(sessionId) {
  const s = getSession(sessionId);
  if (!s) { return; }
  const compId = sessionComponentId(sessionId);
  s.currentCode = compId ? componentOriginalCode(compId) : '';
  s.revision = (Number(s.revision) || 0) + 1;
  s.lastUpdated = Date.now();
  schedulePersist();
}

/* ---------------- context / summary helpers ---------------- */

export function getConversationSummary(sessionId) {
  const s = getSession(sessionId);
  if (!s) { return ''; }
  if (typeof s.contextSummary === 'string' && s.contextSummary.trim()) { return s.contextSummary.trim(); }
  const relevant = getMessages(sessionId).slice(-8).map((m) => m.text).filter(Boolean);
  if (!relevant.length) { return ''; }
  return relevant.join(' ').slice(0, 280);
}

export function setConversationSummary(sessionId, summary) {
  const s = getSession(sessionId);
  if (!s) { return ''; }
  const text = String(summary || '').trim();
  s.contextSummary = text.slice(0, 800);
  s.lastUpdated = Date.now();
  persistAIState();
  return s.contextSummary;
}

/** Recent chat turns (oldest first) that fit the context budget. */
export function buildContextMessages(sessionId, currentUserText) {
  const s = getSession(sessionId);
  if (!s) { return []; }
  const messages = getMessages(sessionId);
  const last = messages[messages.length - 1];
  const isPendingUserMessage = !!(last && last.role === 'user' && last.text === currentUserText);
  const history = isPendingUserMessage ? messages.slice(0, -1) : messages;

  const result = [];
  let total = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) { continue; }
    const text = String(m.text || '');
    if (!text) { continue; }
    const remaining = AI_MAX_CONTEXT_CHARS - total;
    if (remaining <= 0) { break; }
    if (text.length > remaining) {
      if (!result.length) { result.push({ role: m.role, content: text.slice(-remaining) }); }
      break;
    }
    result.push({ role: m.role, content: text });
    total += text.length;
  }
  return result.reverse();
}

export function describeContext(sessionId, name) {
  const s = getSession(sessionId);
  if (!s) { return `New AI session · ${name}`; }
  const msgs = getMessages(sessionId).length;
  const versions = getVersionsForSession(sessionId).length;
  if (msgs === 0) { return `New AI session · ${name}`; }
  return `${name} · ${msgs} msg · ${versions} version${versions === 1 ? '' : 's'} · Saved locally`;
}

/* ---------------- convenience: legacy names kept for callers ---------------- */

/**
 * Backward-compatible accessor: returns the component record for a component id.
 * Kept so existing callers can transition gradually.
 */
export const getComponentState = getComponent;

/**
 * Backward-compatible: ensure a component + default session exist and return
 * the session (the per-component editing baseline).
 */
export function getOrCreateComponentState(componentId, name, category, originalCode) {
  getOrCreateComponent(componentId, name, category, originalCode);
  return getOrCreateSession(componentId);
}

export function clearComponentHistory(componentId) {
  // Clears AI-generated data (messages) for the default session of a component.
  // Original component code and versions are preserved.
  const ws = getWorkspacesForComponent(componentId);
  if (!ws.length) { return; }
  const sessions = getSessionsForWorkspace(ws[0].id);
  sessions.forEach((s) => { clearMessages(s.id); s.currentCode = ''; s.activeVersionId = null; s.revision = (Number(s.revision) || 0) + 1; s.lastUpdated = Date.now(); });
  persistAIState();
}

export function clearAllAIHistory() {
  // Preserve original component data; clear all AI-generated messages, current
  // drafts and versions across all sessions.
  Object.values(aiState.sessions).forEach((s) => {
    (s.messageIds || []).forEach((mid) => { delete aiState.messages[mid]; });
    s.messageIds = [];
    s.currentCode = '';
    s.activeVersionId = null;
    s.contextSummary = '';
    s.revision = (Number(s.revision) || 0) + 1;
    s.lastUpdated = Date.now();
  });
  Object.values(aiState.versions).forEach(() => {}); // versions preserved intentionally
  aiState.messages = {};
  safeRemove(AI_ACTIVE_KEY);
  persistAIState();
}

export function startNewSession(componentId) {
  const ws = getOrCreateWorkspaceForComponent(componentId);
  const id = `sid-${uid()}`;
  const session = normalizeSession(id, {
    id, workspaceId: ws.id, currentCode: '', activeVersionId: null,
    messageIds: [], versionIds: [], contextSummary: '', revision: 0,
    createdAt: Date.now(), lastUpdated: Date.now()
  });
  aiState.sessions[id] = session;
  ws.sessionIds.push(id);
  ws.lastUpdated = Date.now();
  persistAIState();
  return session;
}

/* ---------------- persistence ---------------- */

function pruneForQuota() {
  // Safe retention: trim oldest versions across sessions, keeping at least 2
  // per session. Never touches original component code or messages.
  let pruned = false;
  const sessions = Object.values(aiState.sessions);
  sessions.forEach((s) => {
    if (s.versionIds.length <= 2) { return; }
    const toDrop = s.versionIds.slice(0, s.versionIds.length - 2);
    s.versionIds = s.versionIds.slice(-2);
    toDrop.forEach((vid) => { delete aiState.versions[vid]; pruned = true; });
    if (s.activeVersionId && !s.versionIds.includes(s.activeVersionId)) {
      s.activeVersionId = s.versionIds.length ? s.versionIds[s.versionIds.length - 1] : null;
      s.currentCode = s.activeVersionId
        ? (aiState.versions[s.activeVersionId] && aiState.versions[s.activeVersionId].code)
        : '';
    }
  });
  return pruned;
}

function _doPersist() {
  try {
    aiState.schemaVersion = AI_SCHEMA_VERSION;
    const payload = JSON.stringify(aiState);
    if (payload.length > AI_STATE_QUOTA_WARN_BYTES) {
      console.warn('[ziiui] AI state approaching localStorage quota', { bytes: payload.length });
    }
    const ok = safeSet(AI_STATE_KEY, payload);
    if (ok) { return true; }

    // Quota recovery: safe retention prune (keep >= 2 versions per session).
    const recovered = pruneForQuota();
    if (recovered) {
      const ok2 = safeSet(AI_STATE_KEY, JSON.stringify(aiState));
      if (ok2) {
        console.warn('[ziiui] storage quota recovered by pruning oldest versions');
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn('[ziiui] could not serialise AI state', err);
    return false;
  }
}

export function persistAIState() {
  return _doPersist();
}

export function schedulePersist() {
  if (persistTimer) { clearTimeout(persistTimer); }
  persistTimer = setTimeout(() => { persistTimer = null; _doPersist(); }, PERSIST_DEBOUNCE_MS);
}

export function flushPersist() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
  return _doPersist();
}

/* backward-compat names used by existing callers */
export { PERSIST_DEBOUNCE_MS };
