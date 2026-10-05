import { beforeEach, describe, expect, it } from 'vitest';
import { buildContextMessages, getOrCreateComponentState, pushChatMessage, setCurrentCode } from '../src/ai/state.js';
import { normalizeCode } from '../src/ai/prompt.js';
import { AI_MAX_CONTEXT_CHARS } from '../src/ai/config.js';

function createStorageMock() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

beforeEach(() => {
  globalThis.localStorage = createStorageMock();
});

describe('AI state and prompt helpers', () => {
  it('keeps the active revision stable until the code actually changes', () => {
    const state = getOrCreateComponentState('demo-component', 'Demo', 'Text', '<div>Original</div>');
    const before = state.revision || 0;
    setCurrentCode(state, '<div>Original</div>');
    expect(state.revision).toBe(before);
    setCurrentCode(state, '<div>Updated</div>');
    expect(state.currentCode).toBe('<div>Updated</div>');
    expect(state.revision).toBeGreaterThan(before);
  });

  it('builds bounded context from recent conversation messages', () => {
    const state = getOrCreateComponentState('ctx-component', 'Context', 'Text', '<section>Original</section>');
    pushChatMessage(state, 'user', 'Make the button blue.');
    pushChatMessage(state, 'assistant', 'Done — the button is now blue.');
    const ctx = buildContextMessages(state, 'Make it darker.');
    expect(ctx).toEqual([
      { role: 'user', content: 'Make the button blue.' },
      { role: 'assistant', content: 'Done — the button is now blue.' }
    ]);
    expect(ctx.some((m) => m.role === 'system')).toBe(false);
  });

  it('never exceeds the conversation context budget', () => {
    const state = getOrCreateComponentState('large-context', 'Large', 'Text', '<div></div>');
    pushChatMessage(state, 'assistant', 'a'.repeat(AI_MAX_CONTEXT_CHARS + 100));
    pushChatMessage(state, 'user', 'current request');
    const ctx = buildContextMessages(state, 'current request');
    expect(ctx).toHaveLength(1);
    expect(ctx[0].content).toHaveLength(AI_MAX_CONTEXT_CHARS);
    expect(ctx[0].content.endsWith('a'.repeat(50))).toBe(true);
  });

  it('normalizes markdown or JSON code payloads to HTML content', () => {
    expect(normalizeCode('```html\n<div class="demo">Hello</div>\n```')).toBe('<div class="demo">Hello</div>');
    expect(normalizeCode('{"code":"<section>Embedded</section>"}')).toContain('<section>Embedded</section>');
  });
});
