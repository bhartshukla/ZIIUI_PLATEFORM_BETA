import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  beginRequest, endRequest, isBusy, isCurrent, isActiveRequest, isDuplicateRequest,
  cancelActiveRequest, isUserCancelled, consumePendingMarker, getActiveRequest
} from '../src/ai/request.js';
import {
  loadAIState, getOrCreateComponentState, getSession, addMessage, addVersion,
  setCurrentCode, getMessages, getVersionsForSession,
  flushPersist, saveActiveComponentId
} from '../src/ai/state.js';

function resetState() {
  localStorage.clear();
  loadAIState();
}

beforeEach(() => {
  resetState();
});
afterEach(() => {
  // Ensure no request is left active between tests.
  const active = getActiveRequest();
  if (active) { endRequest(active); }
  localStorage.clear();
  loadAIState();
});

describe('AI request - duplicate / concurrent request rejection', () => {
  it('rejects a duplicate request while one is active', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    const req = beginRequest(s.id, 'make it red', Number(s.revision || 0), 'editor');
    expect(isBusy()).toBe(true);
    expect(isDuplicateRequest(s.id, 'make it red', Number(s.revision || 0), 'editor')).toBe(true);
    // Same fingerprint returns the active request rather than creating a new one.
    const same = beginRequest(s.id, 'make it red', Number(s.revision || 0), 'editor');
    expect(same).toBe(req);
    endRequest(req);
    expect(isBusy()).toBe(false);
  });

  it('different prompt while busy is still rejected by isBusy guard', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    const req = beginRequest(s.id, 'make it red', Number(s.revision || 0), 'editor');
    expect(isBusy()).toBe(true);
    // A different prompt is not a "duplicate" fingerprint but the UI guard
    // (isBusy) still rejects starting a second concurrent request.
    expect(isDuplicateRequest(s.id, 'make it blue', Number(s.revision || 0), 'editor')).toBe(false);
    endRequest(req);
  });

  it('request is no longer busy after endRequest', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    const req = beginRequest(s.id, 'make it red', Number(s.revision || 0), 'editor');
    expect(isBusy()).toBe(true);
    endRequest(req);
    expect(isBusy()).toBe(false);
    expect(isActiveRequest(req)).toBe(false);
  });
});

describe('AI request - stale / out-of-order response rejection', () => {
  it('isCurrent returns false after a newer request supersedes it', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    const rev0 = Number(s.revision || 0);
    const req1 = beginRequest(s.id, 'change one', rev0, 'editor');
    expect(isCurrent(req1)).toBe(true);

    // A newer request starts (superseding req1).
    const req2 = beginRequest(s.id, 'change two', rev0, 'editor');
    expect(getActiveRequest()).toBe(req2);

    // req1 is now stale.
    expect(isCurrent(req1)).toBe(false);
    expect(isActiveRequest(req1)).toBe(false);
    expect(isCurrent(req2)).toBe(true);

    endRequest(req2);
  });

  it('out-of-order responses: older response is ignored after newer completes', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    const rev0 = Number(s.revision || 0);
    const reqOld = beginRequest(s.id, 'old prompt', rev0, 'editor');
    const reqNew = beginRequest(s.id, 'new prompt', rev0, 'editor');
    expect(getActiveRequest()).toBe(reqNew);

    // Simulate the older response arriving first: it must be rejected.
    expect(isCurrent(reqOld)).toBe(false);
    // Simulate the newer response arriving: accepted.
    expect(isCurrent(reqNew)).toBe(true);

    endRequest(reqNew);
    expect(isBusy()).toBe(false);
  });
});

describe('AI request - session switching during generation', () => {
  it('revision change mid-generation invalidates the in-flight request baseRevision', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    const rev0 = Number(s.revision || 0);
    const req = beginRequest(s.id, 'make it red', rev0, 'editor');
    expect(req.baseRevision).toBe(rev0);

    // Simulate a newer edit changing the revision while req is in flight.
    setCurrentCode(s.id, '<div>newer manual edit</div>');
    const rev1 = Number(s.revision || 0);
    expect(rev1).not.toBe(rev0);

    // The stale result would be ignored (revision mismatch).
    expect((s.revision || 0) !== Number(req.baseRevision || 0)).toBe(true);

    endRequest(req);
  });

  it('session isolation: requests for different sessions are tracked by sessionId', () => {
    const s1 = getOrCreateComponentState('c1', 'C1', 'Text', '<div>o1</div>');
    const s2 = getOrCreateComponentState('c2', 'C2', 'Text', '<div>o2</div>');
    const r1 = beginRequest(s1.id, 'prompt one', 0, 'editor');
    // A request for a different session while r1 active: isBusy guards concurrency
    // at the request-slot level regardless of session.
    expect(isBusy()).toBe(true);
    endRequest(r1);
    expect(isBusy()).toBe(false);

    const r2 = beginRequest(s2.id, 'prompt two', 0, 'editor');
    expect(getActiveRequest().sessionId).toBe(s2.id);
    endRequest(r2);
  });
});

describe('AI request - failed generation recovery', () => {
  it('cancelled request marks itself user-cancelled; the slot is released by endRequest', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    const req = beginRequest(s.id, 'make it red', Number(s.revision || 0), 'editor');
    cancelActiveRequest();
    // cancelActiveRequest aborts but holds the slot until endRequest.
    expect(isBusy()).toBe(true);
    expect(isCurrent(req)).toBe(false);
    expect(isUserCancelled(req)).toBe(true);
    endRequest(req);
    expect(isBusy()).toBe(false);
    // A fresh request can now begin.
    const req2 = beginRequest(s.id, 'make it blue', Number(s.revision || 0), 'editor');
    expect(isBusy()).toBe(true);
    endRequest(req2);
  });

  it('pending marker is written on begin and cleared on end', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    const req = beginRequest(s.id, 'make it red', Number(s.revision || 0), 'editor');
    const marker = consumePendingMarker();
    expect(marker).not.toBeNull();
    expect(marker.requestId).toBe(req.id);
    expect(marker.sessionId).toBe(s.id);
    // Marker consumed: next consume returns null.
    expect(consumePendingMarker()).toBeNull();
    endRequest(req);
  });
});

describe('AI request - version consistency across session switch', () => {
  it('versions and messages stay attached to the originating session', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    addMessage(s.id, 'user', 'make it bold');
    addVersion(s.id, '<div><b>orig</b></div>', 'make it bold');

    const versions = getVersionsForSession(s.id);
    expect(versions).toHaveLength(1);
    expect(versions[0].code).toBe('<div><b>orig</b></div>');
    expect(getMessages(s.id).map((m) => m.text)).toEqual(['make it bold']);

    // Creating another session does not leak versions/messages into it.
    const s2 = getOrCreateComponentState('c2', 'C2', 'Text', '<div>o2</div>');
    expect(getVersionsForSession(s2.id)).toEqual([]);
    expect(getMessages(s2.id)).toEqual([]);
  });

  it('persisted state survives refresh and session isolation is retained', () => {
    const s = getOrCreateComponentState('c', 'C', 'Text', '<div>orig</div>');
    addVersion(s.id, '<div>v1</div>', 'change it');
    setCurrentCode(s.id, '<div>baseline after refresh</div>');
    flushPersist();
    saveActiveComponentId(s.id);
    flushPersist();
    loadAIState();
    const reloaded = getSession(s.id);
    expect(reloaded.currentCode).toBe('<div>baseline after refresh</div>');
    expect(getVersionsForSession(reloaded.id).map((v) => v.code)).toEqual(['<div>v1</div>']);
  });
});
