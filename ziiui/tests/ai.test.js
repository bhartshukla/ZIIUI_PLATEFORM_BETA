import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeCode, looksLikeCode, buildSystemPrompt, describeAIError } from '../src/ai/prompt.js';
import {
  loadAIState, getAIState, getOrCreateComponentState, pushChatMessage, addCodeVersion,
  setCurrentCode, buildContextMessages, clearComponentHistory, persistAIState
} from '../src/ai/state.js';
import { AI_STATE_KEY, AI_MAX_MESSAGES, AI_MAX_VERSIONS, aiIsConfigured } from '../src/ai/config.js';
import { beginRequest, cancelActiveRequest, endRequest, isActiveRequest, isCurrent } from '../src/ai/request.js';

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
  it('includes original and current code', () => {
    const p = buildSystemPrompt({ name: 'Roll', category: 'Text', original: 'ORIG', current: 'CURR' });
    expect(p).toContain('Component name: Roll');
    expect(p).toContain('ORIG');
    expect(p).toContain('CURR');
  });
  it('says so when there is no edited version', () => {
    expect(buildSystemPrompt({ name: 'x', category: 'y', original: 'o', current: '' }))
      .toContain('identical to the original');
  });
});

describe('describeAIError', () => {
  it('maps known codes and aborts', () => {
    expect(describeAIError(new Error('NOKEY'))).toContain('VITE_OPENROUTER_API_KEY');
    expect(describeAIError(new DOMException('x', 'AbortError'))).toContain('timed out');
    expect(describeAIError(new Error('API:500 - boom'))).toBe('OpenRouter error 500 - boom.');
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

      cancelActiveRequest();

      expect(request.signal.aborted).toBe(true);
      expect(isActiveRequest(request)).toBe(true);
      expect(isCurrent(request)).toBe(false);

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
    expect(getOrCreateComponentState('roll', 'Text Roll', 'Text', '<p>new</p>').originalCode).toBe('<p>new</p>');
  });

  it('caps chat history and versions', () => {
    const s = getOrCreateComponentState('a', 'A', 'Text', 'o');
    for (let i = 0; i < AI_MAX_MESSAGES + 10; i++) pushChatMessage(s, 'user', 'm' + i);
    expect(s.chatHistory).toHaveLength(AI_MAX_MESSAGES);
    for (let i = 0; i < AI_MAX_VERSIONS + 5; i++) addCodeVersion(s, 'code' + i, 'p');
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
});
