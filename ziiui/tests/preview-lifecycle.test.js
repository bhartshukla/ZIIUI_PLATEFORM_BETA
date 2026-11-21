import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setFrameHTML,
  clearFrameHTML,
  handlePreviewMessage,
  abortFrame,
} from '../src/lib/preview.js';

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
    setAttribute: (name, value) => { frame[name] = value; },
    removeAttribute: (name) => { delete frame[name]; },
    hasAttribute: (name) => name in frame,
    addEventListener: () => {},
    remove: () => {
      frame.__removed = true;
      frame.contentWindow = null;
    },
    get _removed() { return frame.__removed === true; },
    set _removed(v) { frame.__removed = v; },
    _onMessage: null,
    messages,
    get lastBlobUrl() { return frame.__blobUrl; },
    set lastBlobUrl(v) { frame.__blobUrl = v; },
    deliverReady: (nonce, generation) => {
      if (frame._onMessage) {
        frame._onMessage({ source: frame.contentWindow, data: { type: 'ziiui:ready', nonce, generation } });
      }
    },
  };

  globalThis.URL.createObjectURL = () => {
    const url = `blob:mock-${Math.random().toString(36).slice(2)}`;
    frame.lastBlobUrl = url;
    return url;
  };
  globalThis.URL.revokeObjectURL = () => { frame.lastBlobUrl = undefined; };

  return frame;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('preview lifecycle - stale async operation handling', () => {
  it('rejects a late ready for a superseded generation', () => {
    const rec = { aborted: false, requestedNonce: 'nA', requestedGeneration: 1, activeNonce: null, activeGeneration: null, pending: null };

    // A's ready is accepted first.
    expect(handlePreviewMessage(rec, { source: null, data: { type: 'ziiui:ready', nonce: 'nA', generation: 1 } })).toBe(true);
    expect(rec.activeNonce).toBe('nA');
    expect(rec.activeGeneration).toBe(1);

    // A newer request supersedes A: requested identity moves to B (generation 2).
    rec.requestedNonce = 'nB';
    rec.requestedGeneration = 2;

    // A's late ready now arrives but is rejected (stale nonce/generation).
    expect(handlePreviewMessage(rec, { source: null, data: { type: 'ziiui:ready', nonce: 'nA', generation: 1 } })).toBe(false);

    // B's ready matches the current requested identity and is accepted.
    expect(handlePreviewMessage(rec, { source: null, data: { type: 'ziiui:ready', nonce: 'nB', generation: 2 } })).toBe(true);
    expect(rec.activeNonce).toBe('nB');
    expect(rec.activeGeneration).toBe(2);
  });

  it('rejects a ready with mismatched nonce even when generation matches', () => {
    const rec = { aborted: false, requestedNonce: 'n', requestedGeneration: 1, activeNonce: null, activeGeneration: null, pending: null };
    expect(handlePreviewMessage(rec, { source: null, data: { type: 'ziiui:ready', nonce: 'wrong-nonce', generation: 1 } })).toBe(false);
    expect(rec.activeNonce).toBeNull();
  });
});

describe('preview lifecycle - cleanup after failed initialization', () => {
  it('handles postMessage failure during requestFrameHTML transition', async () => {
    const frame = createMockIframe();
    frame.contentWindow.postMessage = () => { throw new Error('postMessage failed'); };

    await setFrameHTML(frame, '<html><body>A</body></html>');
    const pB = setFrameHTML(frame, '<html><body>B</body></html>');
    await pB;
    // Should not throw and should settle on B.
    expect(frame.srcdoc).toContain('<html><body>B</body></html>');
  });

  it('abortFrame leaves the frame in a settled state', async () => {
    const frame = createMockIframe();
    await setFrameHTML(frame, '<html><body>A</body></html>');
    const pB = setFrameHTML(frame, '<html><body>B</body></html>');
    abortFrame(frame);
    await pB;
    expect(frame.srcdoc).toContain('<html><body>B</body></html>');
  });
});

describe('preview lifecycle - no stale preview updates', () => {
  it('successive setFrameHTML calls replace content without retaining the previous source', () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>A</body></html>');
    expect(frame.srcdoc).toContain('<html><body>A</body></html>');

    setFrameHTML(frame, '<html><body>B</body></html>');
    expect(frame.srcdoc).toContain('<html><body>B</body></html>');
    expect(frame.srcdoc).not.toContain('<html><body>A</body></html>');
  });

  it('setFrameHTML followed by clear leaves an empty document', async () => {
    const frame = createMockIframe();
    setFrameHTML(frame, '<html><body>A</body></html>');
    await clearFrameHTML(frame);
    expect(frame.srcdoc).toBe('');
  });
});

describe('preview lifecycle - clearFrameHTML idempotency', () => {
  it('clearing an already-cleared frame is a no-op', async () => {
    const frame = createMockIframe();
    await clearFrameHTML(frame);
    await clearFrameHTML(frame);
    expect(frame.srcdoc).toBe('');
  });
});
