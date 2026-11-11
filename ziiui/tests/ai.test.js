import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeCode, looksLikeCode, buildSystemPrompt, describeAIError, getUserFacingAIMessage, AI_TRAINING_PHASE_TITLE, AI_TRAINING_PHASE_MESSAGE } from '../src/ai/prompt.js';
import {
  loadAIState, getAIState, getOrCreateComponentState, pushChatMessage, addCodeVersion,
  setCurrentCode, buildContextMessages, clearComponentHistory, persistAIState,
  flushPersist, PERSIST_DEBOUNCE_MS, migrateState, restoreCodeVersion, deleteCodeVersion,
  startNewSession
} from '../src/ai/state.js';
import { AI_STATE_KEY, AI_MAX_MESSAGES, AI_MAX_VERSIONS, AI_SCHEMA_VERSION, aiIsConfigured, DEFAULT_MODELS, MODEL_METADATA, AI_MODEL_TIMEOUT_MS, AI_MAX_TOKENS, getModelMaxTokens } from '../src/ai/config.js';
import { beginRequest, cancelActiveRequest, endRequest, isActiveRequest, isCurrent, isUserCancelled } from '../src/ai/request.js';

describe('normalizeCode', () => {
  it('strips markdown fences', () => {
    expect(normalizeCode('```html\n<div>hi there, friend</div>\n```')).toBe('<div>hi there, friend</div>');
  });
  it('drops prose before the doctype', () => {
    expect(normalizeCode('Sure! Here you go:\n<!DOCTYPE html><html></html>')).toBe('<!DOCTYPE html><html></html>');
  });
  it('returns empty for empty input', () => {
    expect(normalizeCode('   ')).toBe('');
    expect(normalizeCode(null)).toBe('');
  });
});

describe('looksLikeCode', () => {
  it('accepts html and rejects prose', () => {
    expect(looksLikeCode('<!DOCTYPE html><html><body>x</body></html>')).toBe(true);
    expect(looksLikeCode('I cannot help with that request, sorry about it.')).toBe(false);
    expect(looksLikeCode('<div>')).toBe(false); // too short
  });
});

describe('buildSystemPrompt', () => {
  it('uses the selected working code without duplicating the original', () => {
    const p = buildSystemPrompt({ name: 'Roll', category: 'Text', original: 'ORIG', current: 'CURR' });
    expect(p).toContain('Component name: Roll');
    expect(p).toContain('CURR');
    expect(p).not.toContain('ORIG');
  });
  it('falls back to the original code when no edit exists', () => {
    expect(buildSystemPrompt({ name: 'x', category: 'y', original: 'o', current: '' }))
      .toContain('o');
  });
});

describe('describeAIError', () => {
  it('maps known codes and aborts', () => {
    expect(describeAIError(new Error('NOKEY'))).toContain('VITE_OPENROUTER_API_KEY');
    expect(describeAIError(new DOMException('x', 'AbortError'))).toContain('timed out');
    expect(describeAIError(new Error('API:500 - boom'))).toBe('OpenRouter error 500 - boom.');
  });
});

describe('User-Facing AI Messaging', () => {
  it('returns clean training phase message for general errors hiding provider details', () => {
    const msg = getUserFacingAIMessage(new Error('ALLMODELS'));
    expect(msg).toContain(AI_TRAINING_PHASE_TITLE);
    expect(msg).toContain(AI_TRAINING_PHASE_MESSAGE);
    expect(msg).not.toContain('OpenRouter');
    expect(msg).not.toContain('API');
  });

  it('returns dedicated cancellation message for user cancellations', () => {
    const msg = getUserFacingAIMessage(new Error('AbortError'), true);
    expect(msg).toBe('AI request was cancelled. Your existing component was preserved.');
  });
});

describe('Model Priority and Configuration', () => {
  it('defines the 6 free coding models in exact priority order', () => {
    expect(DEFAULT_MODELS).toEqual([
      'cohere/north-mini-code:free',
      'recursive/flint-v1.0:free',
      'nvidia/nemotron-3.5-lightning:free',
      'dots-studio/dots-3-note-preview:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'thinkingmachines/inkling-2-small:free'
    ]);
  });

  it('contains metadata for all 6 models', () => {
    DEFAULT_MODELS.forEach((id) => {
      expect(MODEL_METADATA[id]).toBeDefined();
      expect(MODEL_METADATA[id].name).toBeTruthy();
      expect(MODEL_METADATA[id].context).toBeGreaterThan(0);
    });
  });

  it('configures a sensible per-model timeout', () => {
    expect(AI_MODEL_TIMEOUT_MS).toBeGreaterThanOrEqual(10000);
    expect(AI_MODEL_TIMEOUT_MS).toBeLessThanOrEqual(60000);
  });

  it('configures output token limit of at least 16384', () => {
    expect(AI_MAX_TOKENS).toBeGreaterThanOrEqual(16384);
  });

  it('caps model output token limit to verified provider maximum', () => {
    const cohereBudget = getModelMaxTokens('cohere/north-mini-code:free');
    expect(cohereBudget).toBeLessThanOrEqual(64000);
    expect(cohereBudget).toBe(Math.min(AI_MAX_TOKENS, 64000));
  });
});

describe('config', () => {
  it('treats a placeholder key as not configured', () => {
    expect(aiIsConfigured()).toBe(false);
  });

  describe('AI request cancellation', () => {
    it('keeps an aborted request identifiable for UI cleanup until it ends', () => {
      const request = beginRequest('component', 'change it', 0, 'test');
      expect(isActiveRequest(request)).toBe(true);
      expect(isCurrent(request)).toBe(true);
      expect(isUserCancelled(request)).toBe(false);

      cancelActiveRequest();

      expect(request.signal.aborted).toBe(true);
      expect(isActiveRequest(request)).toBe(true);
      expect(isCurrent(request)).toBe(false);
      expect(isUserCancelled(request)).toBe(true);

      endRequest(request);
      expect(isActiveRequest(request)).toBe(false);
    });
  });
});

describe('AI state', () => {
  beforeEach(() => { localStorage.clear(); loadAIState(); clearAll(); });
  function clearAll() { Object.keys(getAIState().components).forEach((k) => delete getAIState().components[k]); }

  it('creates and updates component state', () => {
    const s = getOrCreateComponentState('roll', 'Text Roll', 'Text', '<p>orig</p>');
    expect(s.originalCode).toBe('<p>orig</p>');
    // Original code must be preserved on subsequent calls (immutable)
    expect(getOrCreateComponentState('roll', 'Text Roll', 'Text', '<p>new</p>').originalCode).toBe('<p>orig</p>');
  });

  it('caps chat history and versions', () => {
    const s = getOrCreateComponentState('a', 'A', 'Text', 'o');
    for (let i = 0; i < AI_MAX_MESSAGES + 10; i++) {pushChatMessage(s, 'user', `m${  i}`);}
    expect(s.chatHistory).toHaveLength(AI_MAX_MESSAGES);
    for (let i = 0; i < AI_MAX_VERSIONS + 5; i++) {addCodeVersion(s, `code${  i}`, 'p');}
    expect(s.codeVersions).toHaveLength(AI_MAX_VERSIONS);
  });

  it('setCurrentCode stores "" when identical to the original', () => {
    const s = getOrCreateComponentState('b', 'B', 'Text', 'same');
    setCurrentCode(s, 'same');
    expect(s.currentCode).toBe('');
    setCurrentCode(s, 'different');
    expect(s.currentCode).toBe('different');
  });

  it('persists and reloads from localStorage', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', 'o');
    pushChatMessage(s, 'user', 'hello');
    persistAIState();
    expect(JSON.parse(localStorage.getItem(AI_STATE_KEY)).components.c.chatHistory[0].text).toBe('hello');
    loadAIState();
    expect(getAIState().components.c.chatHistory[0].text).toBe('hello');
  });

  it('recovers from corrupted storage', () => {
    localStorage.setItem(AI_STATE_KEY, '{not json');
    loadAIState();
    expect(getAIState().components).toEqual({});
  });

  it('drops the pending user message from the context window', () => {
    const s = getOrCreateComponentState('d', 'D', 'Text', 'o');
    pushChatMessage(s, 'user', 'first');
    pushChatMessage(s, 'assistant', 'Applied: first');
    pushChatMessage(s, 'user', 'second');
    const ctx = buildContextMessages(s, 'second');
    expect(ctx.map((m) => m.content)).toEqual(['first', 'Applied: first']);
  });

  it('clears a single component history', () => {
    const s = getOrCreateComponentState('e', 'E', 'Text', 'o');
    pushChatMessage(s, 'user', 'x');
    addCodeVersion(s, 'code', 'x');
    clearComponentHistory('e');
    expect(s.chatHistory).toEqual([]);
    expect(s.codeVersions).toEqual([]);
    expect(s.currentCode).toBe('');
  });

  it('preserves the original canonical component code when AI drafts are created and modified', () => {
    const s = getOrCreateComponentState('canonical-test', 'Canonical', 'Menus', '<nav>Original Canonical</nav>');
    expect(s.originalCode).toBe('<nav>Original Canonical</nav>');

    // AI creates a draft
    addCodeVersion(s, '<nav>AI Modified Draft v1</nav>', 'make it glow');
    expect(s.currentCode).toBe('<nav>AI Modified Draft v1</nav>');
    // Original code is 100% untouched
    expect(s.originalCode).toBe('<nav>Original Canonical</nav>');

    // AI modifies draft again
    addCodeVersion(s, '<nav>AI Modified Draft v2</nav>', 'change colors');
    expect(s.currentCode).toBe('<nav>AI Modified Draft v2</nav>');
    expect(s.originalCode).toBe('<nav>Original Canonical</nav>');
  });

  it('restores canonical component state when draft is reset', () => {
    const s = getOrCreateComponentState('reset-test', 'Reset Comp', 'Web', '<div>Base HTML</div>');
    addCodeVersion(s, '<div>Draft Version</div>', 'modify layout');
    expect(s.currentCode).toBe('<div>Draft Version</div>');

    // Resetting draft clears currentCode while preserving originalCode
    setCurrentCode(s, '');
    expect(s.currentCode).toBe('');
    expect(s.originalCode).toBe('<div>Base HTML</div>');
  });

  it('triggers client-side file export without throwing', async () => {
    const { exportFile } = await import('../src/lib/dom.js');
    const ok = exportFile('test-export.html', '<div>Export Content</div>');
    expect(ok).toBe(true);
  });
});

describe('localStorage reliability', () => {
  beforeEach(() => { localStorage.clear(); loadAIState(); });

  it('salvages valid components on schema version mismatch instead of wiping all state', () => {
    localStorage.setItem(AI_STATE_KEY, JSON.stringify({
      schemaVersion: 1,
      components: {
        comp1: {
          componentId: 'comp1',
          componentName: 'Saved Component',
          category: 'Text',
          originalCode: '<p>x</p>',
          currentCode: '',
          chatHistory: [],
          codeVersions: [],
          activeVersionId: null,
          summary: '',
          revision: 0,
          lastUpdated: 1
        }
      }
    }));
    loadAIState();
    expect(getAIState().schemaVersion).toBe(AI_SCHEMA_VERSION);
    expect(getAIState().components.comp1.componentName).toBe('Saved Component');
    expect(getAIState().components.comp1.originalCode).toBe('<p>x</p>');
  });

  it('resets on unparseable JSON (single corrupted blob cannot be salvaged)', () => {
    localStorage.setItem(AI_STATE_KEY, '{not json');
    loadAIState();
    expect(getAIState().components).toEqual({});
  });

  it('defers setCurrentCode persistence until flushPersist is called', () => {
    const s = getOrCreateComponentState('defer', 'Defer', 'Text', 'orig');
    setCurrentCode(s, 'deferred-change');
    // Deferred: not yet written to localStorage
    const rawBefore = localStorage.getItem(AI_STATE_KEY);
    const parsedBefore = rawBefore ? JSON.parse(rawBefore) : { components: {} };
    const deferBefore = parsedBefore.components ? parsedBefore.components.defer : undefined;
    expect(deferBefore).toBeUndefined();
    // Explicit flush point writes immediately
    flushPersist();
    expect(JSON.parse(localStorage.getItem(AI_STATE_KEY)).components.defer.currentCode).toBe('deferred-change');
  });

  it('flushPersist forces an immediate write', () => {
    const s = getOrCreateComponentState('flush', 'Flush', 'Text', 'orig');
    setCurrentCode(s, 'flush-me');
    const rawBefore = localStorage.getItem(AI_STATE_KEY);
    const parsedBefore = rawBefore ? JSON.parse(rawBefore) : { components: {} };
    const flushBefore = parsedBefore.components ? parsedBefore.components.flush : undefined;
    expect(flushBefore).toBeUndefined();
    flushPersist();
    expect(JSON.parse(localStorage.getItem(AI_STATE_KEY)).components.flush.currentCode).toBe('flush-me');
  });
});

describe('schema migration', () => {
  it('migrates v2 → v3 by adding lastUpdated to each code version snapshot', () => {
    const migrated = migrateState({
      schemaVersion: 2,
      components: {
        comp: {
          componentId: 'comp', componentName: 'Comp', category: 'Text',
          originalCode: 'o', currentCode: 'c',
          chatHistory: [{ role: 'user', text: 'hi', timestamp: 1 }],
          codeVersions: [{ id: 'v1', code: 'c', prompt: 'p', timestamp: 100 }],
          activeVersionId: 'v1', summary: '', revision: 1, lastUpdated: 5
        }
      }
    });
    expect(migrated.schemaVersion).toBe(AI_SCHEMA_VERSION);
    expect(migrated.components.comp.codeVersions[0].lastUpdated).toBe(100);
  });

  it('migrates v1 → v3 through intermediate versions preserving conversations and versions', () => {
    const migrated = migrateState({
      schemaVersion: 1,
      components: {
        comp: {
          componentId: 'comp', componentName: 'Comp', category: 'Text',
          originalCode: 'o', currentCode: 'c',
          chatHistory: [{ role: 'user', text: 'hi', timestamp: 1 }],
          codeVersions: [{ id: 'v1', code: 'c', prompt: 'p', timestamp: 100 }],
          activeVersionId: 'v1', summary: '', revision: 1, lastUpdated: 5
        }
      }
    });
    expect(migrated.schemaVersion).toBe(AI_SCHEMA_VERSION);
    expect(migrated.components.comp.chatHistory[0].text).toBe('hi');
    expect(migrated.components.comp.codeVersions[0].lastUpdated).toBe(100);
  });

  it('preserves valid components and drops malformed entries', () => {
    const migrated = migrateState({
      schemaVersion: 2,
      components: {
        good: {
          componentId: 'good', componentName: 'Good', category: 'Text',
          originalCode: 'o', currentCode: '',
          chatHistory: [], codeVersions: [], activeVersionId: null, summary: '', revision: 0, lastUpdated: 1
        },
        bad: null,
        garbage: 'not an object',
        worse: { componentName: 'NoId' }
      }
    });
    expect(Object.keys(migrated.components).sort()).toEqual(['good', 'worse']);
    expect(migrated.components.good.componentName).toBe('Good');
    expect(migrated.components.worse.componentName).toBe('NoId');
  });

  it('defaults missing fields instead of losing data', () => {
    const migrated = migrateState({
      schemaVersion: 2,
      components: {
        sparse: { componentId: 'sparse', originalCode: '<p>x</p>' }
      }
    });
    expect(migrated.components.sparse.originalCode).toBe('<p>x</p>');
    expect(migrated.components.sparse.currentCode).toBe('');
    expect(migrated.components.sparse.chatHistory).toEqual([]);
    expect(migrated.components.sparse.revision).toBe(0);
  });

  it('handles unknown future schema versions without destructive reset', () => {
    const migrated = migrateState({
      schemaVersion: 99,
      components: {
        comp: {
          componentId: 'comp', componentName: 'Future', category: 'Text',
          originalCode: 'o', currentCode: 'c',
          chatHistory: [{ role: 'user', text: 'keep me', timestamp: 1 }],
          codeVersions: [], activeVersionId: null, summary: '', revision: 0, lastUpdated: 1
        }
      }
    });
    expect(migrated.schemaVersion).toBe(AI_SCHEMA_VERSION);
    expect(migrated.components.comp.chatHistory[0].text).toBe('keep me');
  });

  it('returns fresh state for non-object input', () => {
    const migrated = migrateState(null);
    expect(migrated.components).toEqual({});
    expect(migrated.schemaVersion).toBe(AI_SCHEMA_VERSION);
  });

  it('loads and persists migrated state so a reload preserves the upgrade', () => {
    localStorage.clear();
    loadAIState();
    localStorage.setItem(AI_STATE_KEY, JSON.stringify({
      schemaVersion: 2,
      components: {
        comp: {
          componentId: 'comp', componentName: 'Comp', category: 'Text',
          originalCode: 'o', currentCode: 'c',
          chatHistory: [{ role: 'user', text: 'hi', timestamp: 1 }],
          codeVersions: [{ id: 'v1', code: 'c', prompt: 'p', timestamp: 100 }],
          activeVersionId: 'v1', summary: '', revision: 1, lastUpdated: 5
        }
      }
    }));
    loadAIState();
    expect(getAIState().schemaVersion).toBe(AI_SCHEMA_VERSION);
    expect(getAIState().components.comp.codeVersions[0].lastUpdated).toBe(100);
    flushPersist();
    const reloaded = JSON.parse(localStorage.getItem(AI_STATE_KEY));
    expect(reloaded.schemaVersion).toBe(AI_SCHEMA_VERSION);
    expect(reloaded.components.comp.codeVersions[0].lastUpdated).toBe(100);
  });

  describe('P0: Original code immutability', () => {
    it('clearAllAIHistory preserves originalCode for every component', () => {
      const s1 = getOrCreateComponentState('c1', 'Comp 1', 'Text', '<div>Original 1</div>');
      const s2 = getOrCreateComponentState('c2', 'Comp 2', 'Text', '<div>Original 2</div>');
      pushChatMessage(s1, 'user', 'change it');
      addCodeVersion(s1, '<div>AI v1</div>', 'change it');

      clearAllAIHistory();

      const reloaded1 = getComponentState('c1');
      const reloaded2 = getComponentState('c2');
      expect(reloaded1.originalCode).toBe('<div>Original 1</div>');
      expect(reloaded2.originalCode).toBe('<div>Original 2</div>');
      expect(reloaded1.chatHistory).toEqual([]);
      expect(reloaded1.codeVersions).toEqual([]);
      expect(reloaded1.currentCode).toBe('');
    });
  });

  describe('P1: Version dedup and restore', () => {
    it('addCodeVersion deduplicates against any existing version, not just the last', () => {
      const s = getOrCreateComponentState('dedup-all', 'Dedup All', 'Text', '<div>orig</div>');
      addCodeVersion(s, '<div>v1</div>', 'change 1');
      addCodeVersion(s, '<div>v2</div>', 'change 2');
      const v3 = addCodeVersion(s, '<div>v1</div>', 'change 1');

      expect(v3.id).toBe(s.codeVersions[0].id);
      expect(s.codeVersions).toHaveLength(2);
      expect(s.activeVersionId).toBe(s.codeVersions[0].id);
    });

    it('restoreCodeVersion restores exact code and active version id', () => {
      const s = getOrCreateComponentState('restore-test', 'Restore', 'Text', '<div>orig</div>');
      addCodeVersion(s, '<div>v1</div>', 'change 1');
      addCodeVersion(s, '<div>v2</div>', 'change 2');

      const v1 = s.codeVersions[0];
      const restored = restoreCodeVersion(s, v1.id);

      expect(restored.code).toBe('<div>v1</div>');
      expect(s.currentCode).toBe('<div>v1</div>');
      expect(s.activeVersionId).toBe(v1.id);
    });

    it('restoreCodeVersion returns null for non-existent version id', () => {
      const s = getOrCreateComponentState('restore-null', 'Restore Null', 'Text', '<div>orig</div>');
      const result = restoreCodeVersion(s, 'non-existent-id');
      expect(result).toBeNull();
      expect(s.currentCode).toBe('');
    });

    it('deleteCodeVersion removes the version and repoints active if needed', () => {
      const s = getOrCreateComponentState('delete-test', 'Delete', 'Text', '<div>orig</div>');
      addCodeVersion(s, '<div>v1</div>', 'change 1');
      addCodeVersion(s, '<div>v2</div>', 'change 2');

      const deleted = deleteCodeVersion(s, s.codeVersions[0].id);

      expect(deleted).toBe(true);
      expect(s.codeVersions).toHaveLength(1);
      expect(s.codeVersions[0].code).toBe('<div>v2</div>');
      expect(s.activeVersionId).toBe(s.codeVersions[0].id);
      expect(s.currentCode).toBe('<div>v2</div>');
    });

    it('deleteCodeVersion on active version clears currentCode when no versions remain', () => {
      const s = getOrCreateComponentState('delete-last', 'Delete Last', 'Text', '<div>orig</div>');
      addCodeVersion(s, '<div>v1</div>', 'change 1');

      deleteCodeVersion(s, s.codeVersions[0].id);

      expect(s.codeVersions).toHaveLength(0);
      expect(s.activeVersionId).toBeNull();
      expect(s.currentCode).toBe('');
    });

    it('deleteCodeVersion returns false for non-existent version id', () => {
      const s = getOrCreateComponentState('delete-false', 'Delete False', 'Text', '<div>orig</div>');
      const result = deleteCodeVersion(s, 'non-existent-id');
      expect(result).toBe(false);
      expect(s.codeVersions).toHaveLength(0);
    });
  });

  describe('P2: Session IDs', () => {
    it('getOrCreateComponentState assigns a session id', () => {
      const s = getOrCreateComponentState('session-1', 'Session', 'Text', '<div>orig</div>');
      expect(typeof s.currentSessionId).toBe('string');
      expect(s.currentSessionId.length).toBeGreaterThan(0);
    });

    it('pushChatMessage includes sessionId on each message', () => {
      const s = getOrCreateComponentState('session-msg', 'Session Msg', 'Text', '<div>orig</div>');
      const sid = s.currentSessionId;
      pushChatMessage(s, 'user', 'hello');
      pushChatMessage(s, 'assistant', 'Applied: hello');

      expect(s.chatHistory[0].sessionId).toBe(sid);
      expect(s.chatHistory[1].sessionId).toBe(sid);
    });

    it('addCodeVersion includes sessionId on each version', () => {
      const s = getOrCreateComponentState('session-ver', 'Session Ver', 'Text', '<div>orig</div>');
      const sid = s.currentSessionId;
      addCodeVersion(s, '<div>v1</div>', 'change 1');

      expect(s.codeVersions[0].sessionId).toBe(sid);
    });

    it('startNewSession rotates the session id and clears history', () => {
      const s = getOrCreateComponentState('session-new', 'Session New', 'Text', '<div>orig</div>');
      pushChatMessage(s, 'user', 'old message');
      addCodeVersion(s, '<div>old v1</div>', 'old change');
      const oldSid = s.currentSessionId;

      const restarted = startNewSession('session-new');

      expect(restarted.currentSessionId).not.toBe(oldSid);
      expect(restarted.chatHistory).toEqual([]);
      expect(restarted.codeVersions).toEqual([]);
      expect(restarted.currentCode).toBe('');
      expect(restarted.originalCode).toBe('<div>orig</div>');
    });

    it('restoreCodeVersion syncs currentSessionId to the version session', () => {
      const s = getOrCreateComponentState('session-rest', 'Session Rest', 'Text', '<div>orig</div>');
      const oldSid = s.currentSessionId;
      addCodeVersion(s, '<div>v1</div>', 'change 1');
      const verSid = s.codeVersions[0].sessionId;

      // Simulate a session change
      s.currentSessionId = 'different-session';
      restoreCodeVersion(s, s.codeVersions[0].id);

      expect(s.currentSessionId).toBe(verSid);
      expect(s.currentSessionId).not.toBe('different-session');
    });
  });

  describe('P1: Generation baseline uses originalCode', () => {
    it('getOrCreateComponentState no longer overwrites originalCode on re-call', () => {
      const s = getOrCreateComponentState('baseline', 'Baseline', 'Text', '<div>ORIGINAL</div>');
      // Simulate a rebuild with different html
      getOrCreateComponentState('baseline', 'Baseline', 'Text', '<div>CHANGED BY REBUILD</div>');
      expect(s.originalCode).toBe('<div>ORIGINAL</div>');
    });
  });
});
