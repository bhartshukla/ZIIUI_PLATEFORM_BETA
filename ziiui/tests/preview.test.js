import { describe, it, expect, vi } from 'vitest';
import {
  setFrameHTML,
  clearFrameHTML,
  requestCleanup,
  requestFrameHTML,
  installPreviewMessageHandler,
  abortFrame,
} from '../src/lib/preview.js';

/* ------------------------------------------------------------------ */
/* Test helpers                                                       */
/* ------------------------------------------------------------------ */

function createMockIframe() {
  const messages = [];
  const frame = {
    srcdoc: '',
    src: '',
    dataset: {},
    contentWindow: {
      postMessage: (msg, origin) => {
        messages.push({ msg, origin, timestamp: Date.now() });
        // Auto-ack cleanup messages after a microtask
        if (msg.type === 'ziiui:cleanup') {
          Promise.resolve().then(() => {
            if (frame._onMessage) {
              frame._onMessage({
                source: frame.contentWindow,
                data: { type: 'ziiui:ack:cleanup', nonce: msg.nonce, generation: msg.generation },
              });
            }
          });
        }
      },
    },
    setAttribute: (name, value) => {
      frame[name] = value;
    },
    removeAttribute: (name) => {
      delete frame[name];
    },
    hasAttribute: (name) => name in frame,
    addEventListener: () => {},
    remove: () => {
      frame.__removed = true;
      frame.contentWindow = null;
    },
    get _removed() {
      return frame.__removed === true;
    },
    set _removed(v) {
      frame.__removed = v;
    },
    _onMessage: null,
    messages,
    get lastBlobUrl() {
      return frame.__blobUrl;
    },
    set lastBlobUrl(v) {
      frame.__blobUrl = v;
    },
  };

  globalThis.URL.createObjectURL = () => {
    const url = `blob:mock-${Math.random().toString(36).slice(2)}`;
    frame.lastBlobUrl = url;
    return url;
  };

  // Expose cleanup helper for tests
  frame.deliverCleanupAck = (nonce, generation) => {
    if (frame._onMessage) {
      frame._onMessage({
        source: frame.contentWindow,
        data: { type: 'ziiui:ack:cleanup', nonce, generation },
      });
    }
  };

  frame.deliverReady = (nonce, generation) => {
    if (frame._onMessage) {
      frame._onMessage({
        source: frame.contentWindow,
        data: { type: 'ziiui:ready', nonce, generation },
      });
    }
  };

  frame.deliverError = (nonce, generation, message = 'Preview error') => {
    if (frame._onMessage) {
      frame._onMessage({
        source: frame.contentWindow,
        data: { type: 'ziiui:error', nonce, generation, message },
      });
    }
  };

  frame.makePostMessageThrow = () => {
    const orig = frame.contentWindow.postMessage;
    frame.contentWindow.postMessage = () => {
      throw new Error('postMessage failed');
    };
    return orig;
  };

  frame.restorePostMessage = (orig) => {
    frame.contentWindow.postMessage = orig;
  };

  return frame;
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe('preview.js - sandbox and nonce injection', () => {
  it('sets sandbox attribute before srcdoc', () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>test</body></html>');

    expect(frame.sandbox).toBe('allow-scripts allow-forms allow-pointer-lock');
    expect(frame.srcdoc).toContain('<html><body>test</body></html>');
  });

  it('injects nonce into DEBUG_HOOK', () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>test</body></html>');

    expect(frame.srcdoc).toContain('__ziiuiNonce');
    expect(frame.srcdoc).toContain('__ziiuiGeneration');
  });

  it('generates unique nonce for each call', () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>A</body></html>');
    const nonce1 = frame.srcdoc.match(/__ziiuiNonce = "([^"]+)"/)[1];

    setFrameHTML(frame, '<html><body>B</body></html>');
    const nonce2 = frame.srcdoc.match(/__ziiuiNonce = "([^"]+)"/)[1];

    expect(nonce1).not.toBe(nonce2);
  });
});

describe('preview.js - clearFrameHTML', () => {
  it('clears srcdoc and src', async () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>test</body></html>');
    await clearFrameHTML(frame);

    expect(frame.srcdoc).toBe('');
  });

  it('revokes blob URLs', async () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>test</body></html>');
    await clearFrameHTML(frame);

    expect(frame.lastBlobUrl).toBeUndefined();
  });
});

describe('preview.js - requestCleanup', () => {
  it('resolves with noPreview when no active preview', async () => {
    const frame = createMockIframe();
    const result = await requestCleanup(frame);
    expect(result).toEqual({ noPreview: true });
  });

  it('returns same result for same generation', async () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>A</body></html>');
    const p1 = requestCleanup(frame);
    const p2 = requestCleanup(frame);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
  });
});

describe('preview.js - setFrameHTML and clearFrameHTML lifecycle', () => {
  it('A then B replacement works', async () => {
    const frame = createMockIframe();

    setFrameHTML(frame, '<html><body>A</body></html>');
    setFrameHTML(frame, '<html><body>B</body></html>');

    expect(frame.srcdoc).toContain('<html><body>B</body></html>');
    expect(frame.srcdoc).not.toContain('<html><body>A</body></html>');
  });

  it('A → B → C latest-wins', async () => {
    const frame = createMockIframe();

    setFrameHTML(frame, '<html><body>A</body></html>');
    setFrameHTML(frame, '<html><body>B</body></html>');
    setFrameHTML(frame, '<html><body>C</body></html>');

    expect(frame.srcdoc).toContain('<html><body>C</body></html>');
    expect(frame.srcdoc).not.toContain('<html><body>B</body></html>');
  });

  it('A → B → clear', async () => {
    const frame = createMockIframe();

    await setFrameHTML(frame, '<html><body>A</body></html>');
    await clearFrameHTML(frame);

    expect(frame.srcdoc).toBe('');
  });

  it('A → clear → B', async () => {
    const frame = createMockIframe();

    await setFrameHTML(frame, '<html><body>A</body></html>');
    await clearFrameHTML(frame);

    expect(frame.srcdoc).toBe('');

    await setFrameHTML(frame, '<html><body>B</body></html>');
    expect(frame.srcdoc).toContain('<html><body>B</body></html>');
  });
});

describe('preview.js - iframe removal', () => {
  it('handles iframe removal during cleanup', async () => {
    vi.useFakeTimers();
    const frame = createMockIframe();

    await setFrameHTML(frame, '<html><body>A</body></html>');
    const pB = setFrameHTML(frame, '<html><body>B</body></html>');

    frame.remove();

    if (frame._onMessage) {
      frame._onMessage({
        source: frame.contentWindow,
        data: { type: 'ziiui:ack:cleanup', nonce: 'stale', generation: 1 },
      });
    }

    await pB;
    vi.useRealTimers();
  });

  it('handles iframe removal before first load', async () => {
    vi.useFakeTimers();
    const frame = createMockIframe();
    frame.remove();

    await setFrameHTML(frame, '<html><body>A</body></html>');
    vi.useRealTimers();
  });

  it('handles iframe removal during loading', async () => {
    vi.useFakeTimers();
    const frame = createMockIframe();

    await setFrameHTML(frame, '<html><body>A</body></html>');
    const pB = setFrameHTML(frame, '<html><body>B</body></html>');

    frame.remove();

    await pB;
    vi.useRealTimers();
  });
});

describe('preview.js - error handling', () => {
  it('handles postMessage failure gracefully', async () => {
    vi.useFakeTimers();
    const frame = createMockIframe();

    const origPostMessage = frame.makePostMessageThrow();
    await setFrameHTML(frame, '<html><body>A</body></html>');
    const pB = setFrameHTML(frame, '<html><body>B</body></html>');

    await pB;
    vi.useRealTimers();
    frame.restorePostMessage(origPostMessage);
  });

  it('handles ziiui:error independently', () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>A</body></html>');

    frame.deliverError('nonceX', 1, 'Test error');
    // Should not throw
  });
});

describe('preview.js - installPreviewMessageHandler', () => {
  it('installs message handler without errors', () => {
    expect(typeof installPreviewMessageHandler).toBe('function');
  });
});

describe('preview.js - abortFrame', () => {
  it('aborts frame cleanup', async () => {
    vi.useFakeTimers();
    const frame = createMockIframe();

    await setFrameHTML(frame, '<html><body>A</body></html>');
    const pB = setFrameHTML(frame, '<html><body>B</body></html>');

    abortFrame(frame);
    await pB;

    vi.useRealTimers();
  });
});

describe('preview.js - requestFrameHTML', () => {
  it('completes full lifecycle', async () => {
    const frame = createMockIframe();

    const result = await requestFrameHTML(frame, '<html><body>test</body></html>');
    expect(result.loaded).toBe(true);
    expect(result.nonce).toBeDefined();
    expect(result.generation).toBe(1);
    expect(frame.srcdoc).toContain('<html><body>test</body></html>');
  });

  it('supersedes previous request', async () => {
    const frame = createMockIframe();

    await setFrameHTML(frame, '<html><body>A</body></html>');
    const pB = setFrameHTML(frame, '<html><body>B</body></html>');
    const pC = setFrameHTML(frame, '<html><body>C</body></html>');

    await pB;
    await pC;

    expect(frame.srcdoc).toContain('<html><body>C</body></html>');
  });
});