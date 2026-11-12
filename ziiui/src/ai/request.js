/*
 * Tracks the single in-flight AI request: cancel / timeout handling and the
 * "pending request" marker used to tell the user that an interrupted request
 * (page closed mid-flight) was not completed.
 */
import { AI_PENDING_KEY, AI_REQUEST_TIMEOUT_MS } from './config.js';
import { safeGet, safeSet, safeRemove, uid } from '../lib/storage.js';

let active = null;

export const isBusy = () => active !== null;

export function getActiveRequest() { return active; }

/** True while this request still owns the active-request slot, even if aborted. */
export const isActiveRequest = (req) => !!req && active === req;

export function buildRequestFingerprint(sessionId, prompt, baseRevision, model = '') {
  return JSON.stringify({
    sessionId: String(sessionId || ''),
    prompt: String(prompt || '').trim(),
    baseRevision: Number(baseRevision) || 0,
    model: String(model || '')
  });
}

export function isDuplicateRequest(sessionId, prompt, baseRevision, model = '') {
  if (!active) {return false;}
  const fingerprint = buildRequestFingerprint(sessionId, prompt, baseRevision, model);
  return active.sessionId === sessionId && active.requestFingerprint === fingerprint;
}

export function beginRequest(sessionId, prompt = '', baseRevision = 0, model = '') {
  const fingerprint = buildRequestFingerprint(sessionId, prompt, baseRevision, model);
  if (active && active.sessionId === sessionId && active.requestFingerprint === fingerprint) {
    return active;
  }
  const controller = new AbortController();
  const req = {
    id: uid(),
    sessionId,
    requestFingerprint: fingerprint,
    baseRevision: Number(baseRevision) || 0,
    prompt: String(prompt || '').trim(),
    controller,
    signal: controller.signal,
    isUserCancelled: false,
    timeoutId: setTimeout(() => { try { controller.abort(); } catch (_) { /* ignore */ } }, AI_REQUEST_TIMEOUT_MS)
  };
  active = req;
  safeSet(AI_PENDING_KEY, JSON.stringify({ requestId: req.id, sessionId, baseRevision: req.baseRevision, timestamp: Date.now() }));
  return req;
}

/** False once the request was superseded (e.g. a newer one started). */
export const isCurrent = (req) => active === req && (!req || !req.signal || !req.signal.aborted);

export function endRequest(req) {
  if (!req) {return;}
  clearTimeout(req.timeoutId);
  if (active === req) {
    active = null;
    safeRemove(AI_PENDING_KEY);
  }
}

export function cancelActiveRequest() {
  if (!active) {return;}
  active.isUserCancelled = true;
  try { active.controller.abort(); } catch (_) { /* ignore */ }
}

export const isUserCancelled = (req) => Boolean(req && req.isUserCancelled);

/** Read and clear the marker left by an interrupted request (or null). */
export function consumePendingMarker() {
  const raw = safeGet(AI_PENDING_KEY);
  if (!raw) {return null;}
  safeRemove(AI_PENDING_KEY);
  try { return JSON.parse(raw); } catch (_) { return null; }
}
