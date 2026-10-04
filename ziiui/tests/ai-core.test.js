import { beforeEach, describe, expect, it } from 'vitest';
import { buildContextMessages, getOrCreateComponentState, pushChatMessage, setCurrentCode } from '../src/ai/state.js';
import { normalizeCode } from '../src/ai/prompt.js';

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

  it('builds bounded context with a conversation summary', () => {
    const state = getOrCreateComponentState('ctx-component', 'Context', 'Text', '<section>Original</section>');
    pushChatMessage(state, 'user', 'Make the button blue.');
    pushChatMessage(state, 'assistant', 'Done — the button is now blue.');
    const ctx = buildContextMessages(state, 'Make it darker.');
    expect(ctx.some((m) => m.role === 'system' && m.content.includes('Conversation summary:'))).toBe(true);
    expect(ctx.some((m) => m.role === 'user' && m.content.includes('button blue'))).toBe(true);
    expect(ctx.some((m) => m.role === 'assistant')).toBe(true);
  });

  it('normalizes markdown or JSON code payloads to HTML content', () => {
    expect(normalizeCode('```html\n<div class="demo">Hello</div>\n```')).toBe('<div class="demo">Hello</div>');
    expect(normalizeCode('{"code":"<section>Embedded</section>"}')).toContain('<section>Embedded</section>');
  });
});
