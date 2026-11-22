import { describe, it, expect } from 'vitest';
import { handlePreviewMessage } from '../src/lib/preview.js';

describe('handlePreviewMessage', () => {
  it('rejects unknown type', () => {
    const rec = { aborted: false, requestedNonce: 'n', requestedGeneration: 1, pending: null };
    expect(handlePreviewMessage(rec, { data: { type: 'foo' } })).toBe(false);
  });

  it('ready promotes when nonce/gen match', () => {
    const rec = { aborted: false, requestedNonce: 'n', requestedGeneration: 1, activeNonce: null, activeGeneration: null, pending: null };
    const ok = handlePreviewMessage(rec, { data: { type: 'ziiui:ready', nonce: 'n', generation: 1 } });
    expect(ok).toBe(true);
    expect(rec.activeNonce).toBe('n');
    expect(rec.activeGeneration).toBe(1);
  });

  it('ready rejects mismatched nonce', () => {
    const rec = { aborted: false, requestedNonce: 'n', requestedGeneration: 1, activeNonce: null, activeGeneration: null, pending: null };
    expect(handlePreviewMessage(rec, { data: { type: 'ziiui:ready', nonce: 'x', generation: 1 } })).toBe(false);
    expect(rec.activeNonce).toBeNull();
  });

  it('cleanup ack accepted with matching nonce/gen', () => {
    const pending = { settled: false, nonce: 'n', generation: 1, resolve: () => {}, timeoutId: null };
    const rec = { aborted: false, pending, requestedNonce: null, requestedGeneration: null };
    const ok = handlePreviewMessage(rec, { data: { type: 'ziiui:ack:cleanup', nonce: 'n', generation: 1 } });
    expect(ok).toBe(true);
    expect(rec.pending).toBeNull();
  });

  it('cleanup ack rejected on stale generation', () => {
    const pending = { settled: false, nonce: 'n', generation: 1, resolve: () => {}, timeoutId: null };
    const rec = { aborted: false, pending, requestedNonce: null, requestedGeneration: null };
    expect(handlePreviewMessage(rec, { data: { type: 'ziiui:ack:cleanup', nonce: 'n', generation: 2 } })).toBe(false);
    expect(rec.pending).toBe(pending);
  });

  it('blocked link message is accepted', () => {
    const rec = { aborted: false, pending: null };
    const ok = handlePreviewMessage(rec, { data: { type: 'ziiui:blocked:link', nonce: 'n', generation: 1, href: '#' } });
    expect(ok).toBe(true);
  });

  it('blocked link message with missing href is still accepted', () => {
    const rec = { aborted: false, pending: null };
    const ok = handlePreviewMessage(rec, { data: { type: 'ziiui:blocked:link', nonce: 'n', generation: 1 } });
    expect(ok).toBe(true);
  });
});
