import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the Netlify function handler directly. No network access is used;
// global fetch is mocked per test.
const { handler } = await import('../netlify/functions/ai.mjs');

function makeEvent({ method = 'POST', body = null, headers = {} } = {}) {
  return {
    httpMethod: method,
    body: body === null ? null : JSON.stringify(body),
    headers
  };
}

function okResponse(payload) {
  return { status: 200, ok: true, json: async () => payload, text: async () => JSON.stringify(payload) };
}
function errResponse(status, detail) {
  return { status, ok: false, json: async () => ({ error: detail }), text: async () => detail };
}

describe('Netlify AI proxy', () => {
  let originalFetch;
  let fetchCalls;

  beforeEach(() => {
    fetchCalls = [];
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it('returns 500 when OPENROUTER_API_KEY is missing', async () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const res = await handler(makeEvent({ body: { model: 'm', messages: [{ role: 'user', content: 'hi' }] } }));
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).error).toContain('not configured');
    } finally {
      if (originalKey !== undefined) process.env.OPENROUTER_API_KEY = originalKey;
    }
  });

  it('rejects non-POST methods', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const res = await handler(makeEvent({ method: 'GET', body: {} }));
    expect(res.statusCode).toBe(405);
  });

  it('rejects invalid JSON body', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const res = await handler({ httpMethod: 'POST', body: '{not json', headers: {} });
    expect(res.statusCode).toBe(400);
  });

  it('rejects body missing messages or model', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const res1 = await handler(makeEvent({ body: { model: 'm' } }));
    expect(res1.statusCode).toBe(400);
    const res2 = await handler(makeEvent({ body: { messages: [{ role: 'user', content: 'hi' }] } }));
    expect(res2.statusCode).toBe(400);
  });

  it('forwards to OpenRouter with the server-side key and returns the response', async () => {
    process.env.OPENROUTER_API_KEY = 'secret-server-key';
    globalThis.fetch = vi.fn(async (url, opts) => {
      fetchCalls.push({ url, opts });
      expect(opts.headers.Authorization).toBe('Bearer secret-server-key');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.model).toBe('m');
      expect(Array.isArray(body.messages)).toBe(true);
      return okResponse({ choices: [{ message: { content: '<div>hi</div>' } }] });
    });

    const res = await handler(makeEvent({
      body: { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
      headers: { 'http-referer': 'https://ziiui.local', 'x-title': 'ZiiUI' }
    }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ choices: [{ message: { content: '<div>hi</div>' } }] });
    expect(fetchCalls.length).toBe(1);
  });

  it('maps upstream 401/403 to 401', async () => {
    process.env.OPENROUTER_API_KEY = 'k';
    globalThis.fetch = vi.fn(async () => errResponse(401, 'unauthorized'));
    const res = await handler(makeEvent({ body: { model: 'm', messages: [{ role: 'user', content: 'hi' }] } }));
    expect(res.statusCode).toBe(401);
  });

  it('maps upstream 429 to 429', async () => {
    process.env.OPENROUTER_API_KEY = 'k';
    globalThis.fetch = vi.fn(async () => errResponse(429, 'rate'));
    const res = await handler(makeEvent({ body: { model: 'm', messages: [{ role: 'user', content: 'hi' }] } }));
    expect(res.statusCode).toBe(429);
  });

  it('maps upstream 5xx to 502', async () => {
    process.env.OPENROUTER_API_KEY = 'k';
    globalThis.fetch = vi.fn(async () => errResponse(500, 'boom'));
    const res = await handler(makeEvent({ body: { model: 'm', messages: [{ role: 'user', content: 'hi' }] } }));
    expect(res.statusCode).toBe(500);
  });

  it('maps network failure to 502', async () => {
    process.env.OPENROUTER_API_KEY = 'k';
    globalThis.fetch = vi.fn(async () => { throw new TypeError('fetch failed'); });
    const res = await handler(makeEvent({ body: { model: 'm', messages: [{ role: 'user', content: 'hi' }] } }));
    expect(res.statusCode).toBe(502);
  });

  it('does not include the API key in any response body', async () => {
    process.env.OPENROUTER_API_KEY = 'should-not-leak';
    globalThis.fetch = vi.fn(async () => okResponse({ choices: [{ message: { content: 'ok' } }] }));
    const res = await handler(makeEvent({ body: { model: 'm', messages: [{ role: 'user', content: 'hi' }] } }));
    expect(res.body).not.toContain('should-not-leak');
  });
});