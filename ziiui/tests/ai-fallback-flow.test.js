import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateCode, getLastSuccessfulModel } from '../src/ai/client.js';
import { DEFAULT_MODELS } from '../src/ai/config.js';
import {
  getUserFacingAIMessage,
  AI_TRAINING_PHASE_TITLE,
  AI_TRAINING_PHASE_MESSAGE,
  AI_CANCELLED_MESSAGE
} from '../src/ai/prompt.js';

vi.mock('../src/ai/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    aiIsConfigured: () => true,
    AI_API_KEY: 'test-mock-key'
  };
});

describe('AI Fallback & Timeout Flow', () => {
  let originalFetch;
  let attempts;

  const validHtml = '<!DOCTYPE html><html><head><style>.btn{color:red;}</style></head><body><button class="btn">Updated</button></body></html>';

  const sampleComponent = {
    name: 'Glow Button',
    category: 'Interactive',
    original: '<button class="btn">Original</button>',
    current: ''
  };

  const sampleCompState = {
    componentId: 'glow-button',
    summary: '',
    chatHistory: [],
    revision: 1
  };

  beforeEach(() => {
    attempts = [];
    originalFetch = globalThis.fetch;
    globalThis.window = { location: { origin: 'https://ziiui.local' } };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('falls back to the next model when the first model times out', async () => {
    globalThis.fetch = vi.fn(async (url, opts) => {
      const payload = JSON.parse(opts.body);
      attempts.push(payload.model);

      if (payload.model === DEFAULT_MODELS[0]) {
        // Simulate per-model timeout: abort signal triggered
        const err = new DOMException('The operation was aborted due to timeout.', 'AbortError');
        throw err;
      }

      if (payload.model === DEFAULT_MODELS[1]) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            choices: [{ message: { content: validHtml } }]
          })
        };
      }

      return { status: 500, ok: false, text: async () => 'Error' };
    });

    const code = await generateCode({
      component: sampleComponent,
      compState: sampleCompState,
      request: 'make it red'
    });

    expect(code).toBe(validHtml);
    expect(attempts).toEqual([DEFAULT_MODELS[0], DEFAULT_MODELS[1]]);
    expect(getLastSuccessfulModel().modelId).toBe(DEFAULT_MODELS[1]);
  });

  it('falls back to the next model when the first model returns 429', async () => {
    globalThis.fetch = vi.fn(async (url, opts) => {
      const payload = JSON.parse(opts.body);
      attempts.push(payload.model);

      if (payload.model === DEFAULT_MODELS[0]) {
        return {
          status: 429,
          ok: false,
          headers: new Headers({ 'Retry-After': '10' }),
          text: async () => JSON.stringify({ error: { message: 'Rate limit exceeded' } })
        };
      }

      if (payload.model === DEFAULT_MODELS[1]) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            choices: [{ message: { content: validHtml } }]
          })
        };
      }

      return { status: 500, ok: false, text: async () => 'Error' };
    });

    const code = await generateCode({
      component: sampleComponent,
      compState: sampleCompState,
      request: 'make it red'
    });

    expect(code).toBe(validHtml);
    expect(attempts).toEqual([DEFAULT_MODELS[0], DEFAULT_MODELS[1]]);
    expect(getLastSuccessfulModel().modelId).toBe(DEFAULT_MODELS[1]);
  });

  it('falls back to the next model when the first model returns 404', async () => {
    globalThis.fetch = vi.fn(async (url, opts) => {
      const payload = JSON.parse(opts.body);
      attempts.push(payload.model);

      if (payload.model === DEFAULT_MODELS[0]) {
        return {
          status: 404,
          ok: false,
          text: async () => JSON.stringify({ error: { message: 'Model not found' } })
        };
      }

      if (payload.model === DEFAULT_MODELS[1]) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            choices: [{ message: { content: validHtml } }]
          })
        };
      }

      return { status: 500, ok: false, text: async () => 'Error' };
    });

    const code = await generateCode({
      component: sampleComponent,
      compState: sampleCompState,
      request: 'make it red'
    });

    expect(code).toBe(validHtml);
    expect(attempts).toEqual([DEFAULT_MODELS[0], DEFAULT_MODELS[1]]);
  });

  it('falls back to the next model when encountering model-specific 403 gating', async () => {
    globalThis.fetch = vi.fn(async (url, opts) => {
      const payload = JSON.parse(opts.body);
      attempts.push(payload.model);

      if (payload.model === DEFAULT_MODELS[0]) {
        return {
          status: 403,
          ok: false,
          text: async () => JSON.stringify({
            error: { message: `${DEFAULT_MODELS[0]} is only available on agentic harnesses.` }
          })
        };
      }

      if (payload.model === DEFAULT_MODELS[1]) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            choices: [{ message: { content: validHtml } }]
          })
        };
      }

      return { status: 500, ok: false, text: async () => 'Error' };
    });

    const code = await generateCode({
      component: sampleComponent,
      compState: sampleCompState,
      request: 'make it red'
    });

    expect(code).toBe(validHtml);
    expect(attempts).toEqual([DEFAULT_MODELS[0], DEFAULT_MODELS[1]]);
  });

  it('throws ALLMODELS when all configured models fail', async () => {
    globalThis.fetch = vi.fn(async (url, opts) => {
      const payload = JSON.parse(opts.body);
      attempts.push(payload.model);
      return {
        status: 503,
        ok: false,
        text: async () => JSON.stringify({ error: { message: 'Service unavailable' } })
      };
    });

    await expect(generateCode({
      component: sampleComponent,
      compState: sampleCompState,
      request: 'make it red'
    })).rejects.toThrow('ALLMODELS');

    expect(attempts.length).toBe(DEFAULT_MODELS.length);

    // Verify clean user-facing error message
    const msg = getUserFacingAIMessage(new Error('ALLMODELS'), false);
    expect(msg).toContain(AI_TRAINING_PHASE_TITLE);
    expect(msg).toContain(AI_TRAINING_PHASE_MESSAGE);
    expect(msg).not.toContain('OpenRouter');
    expect(msg).not.toContain('503');
  });

  it('stops immediately when cancelled by the user and does not try subsequent models', async () => {
    const parentController = new AbortController();

    globalThis.fetch = vi.fn(async (url, opts) => {
      const payload = JSON.parse(opts.body);
      attempts.push(payload.model);

      // User clicks Cancel while first model is running
      parentController.abort();
      const err = new DOMException('Aborted', 'AbortError');
      throw err;
    });

    await expect(generateCode({
      component: sampleComponent,
      compState: sampleCompState,
      request: 'make it red',
      signal: parentController.signal
    })).rejects.toThrow();

    // Must NOT have attempted subsequent models
    expect(attempts.length).toBe(1);

    // Verify user cancellation message
    const cancelMsg = getUserFacingAIMessage(new Error('Aborted'), true);
    expect(cancelMsg).toBe(AI_CANCELLED_MESSAGE);
  });

  it('does not retry 401 unauthorized errors across models', async () => {
    globalThis.fetch = vi.fn(async (url, opts) => {
      const payload = JSON.parse(opts.body);
      attempts.push(payload.model);
      return {
        status: 401,
        ok: false,
        text: async () => JSON.stringify({ error: { message: 'Invalid API key' } })
      };
    });

    await expect(generateCode({
      component: sampleComponent,
      compState: sampleCompState,
      request: 'make it red'
    })).rejects.toThrow('AUTH');

    // Should stop immediately after 1 attempt
    expect(attempts.length).toBe(1);
  });
});
