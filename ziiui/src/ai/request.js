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

export function buildRequestFingerprint(componentId, prompt, baseRevision, model = '') {
  return JSON.stringify({
    componentId: String(componentId || ''),
    prompt: String(prompt || '').trim(),
    baseRevision: Number(baseRevision) || 0,
    model: String(model || '')
  });
}

export function isDuplicateRequest(componentId, prompt, baseRevision, model = '') {
  if (!active) return false;
  const fingerprint = buildRequestFingerprint(componentId, prompt, baseRevision, model);
  return active.componentId === componentId && active.requestFingerprint === fingerprint;
}

export function beginRequest(componentId, prompt = '', baseRevision = 0, model = '') {
  const fingerprint = buildRequestFingerprint(componentId, prompt, baseRevision, model);
  if (active && active.componentId === componentId && active.requestFingerprint === fingerprint) {
    return active;
  }
  const controller = new AbortController();
  const req = {
    id: uid(),
    componentId,
    requestFingerprint: fingerprint,
    baseRevision: Number(baseRevision) || 0,
    prompt: String(prompt || '').trim(),
    controller,
    signal: controller.signal,
    timeoutId: setTimeout(() => { try { controller.abort(); } catch (_) { /* ignore */ } }, AI_REQUEST_TIMEOUT_MS)
  };
  active = req;
  safeSet(AI_PENDING_KEY, JSON.stringify({ requestId: req.id, componentId, baseRevision: req.baseRevision, timestamp: Date.now() }));
  return req;
}

/** False once the request was superseded (e.g. a newer one started). */
export const isCurrent = (req) => active === req && (!req || !req.signal || !req.signal.aborted);

export function endRequest(req) {
  if (!req) return;
  clearTimeout(req.timeoutId);
  if (active === req) {
    active = null;
    safeRemove(AI_PENDING_KEY);
  }
}

export function cancelActiveRequest() {
  if (!active) return;
  try { active.controller.abort(); } catch (_) { /* ignore */ }
}

/** Read and clear the marker left by an interrupted request (or null). */
export function consumePendingMarker() {
  const raw = safeGet(AI_PENDING_KEY);
  if (!raw) return null;
  safeRemove(AI_PENDING_KEY);
  try { return JSON.parse(raw); } catch (_) { return null; }
}
