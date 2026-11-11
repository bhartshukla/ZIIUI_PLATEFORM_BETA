/*
 * OpenRouter client. Tries each configured model in order and returns the first
 * reply that looks like valid component HTML.
 *
 * Errors thrown (err.message): NOKEY, AUTH, NETWORK, ALLMODELS — plus
 * AbortError when the request is cancelled or times out.
 */
import { AI_API_KEY, AI_ENDPOINT, AI_MODELS, AI_USES_PROXY, aiIsConfigured, MODEL_METADATA, AI_MODEL_TIMEOUT_MS } from './config.js';
import { buildContextMessages } from './state.js';
import { buildSystemPrompt, normalizeCode, looksLikeCode } from './prompt.js';

import {
  classifyTaskIntent,
  extractComponentConstraints,
  validateGeneratedCode,
  logContextMetrics
} from './context-engine.js';

const abortError = () => new DOMException('Aborted', 'AbortError');
const MAX_CODE_CHARS = 200000;

/** Tracks the last model that successfully generated valid component code. */
let lastSuccessfulModel = null;

export function getLastSuccessfulModel() {
  return lastSuccessfulModel;
}

/**
 * Structured AI request error. Carries HTTP status, model id, Retry-After and
 * a sanitized response body so the UI can show a helpful message without ever
 * exposing the API key.
 */
class AIError extends Error {
  constructor(message, { status, model, retryAfter, body } = {}) {
    super(message);
    this.name = 'AIError';
    this.status = Number.isInteger(status) ? status : undefined;
    this.model = model || undefined;
    this.retryAfter = retryAfter || undefined;
    this.body = body;
  }
}

/** Read a response body once (a Response body stream can only be read once). */
async function readResponseBody(response) {
  try {
    const text = await response.text();
    try { return JSON.parse(text); } catch (_) { /* ignore */ return text; }
  } catch (_) { /* ignore */ return undefined; }
}

/**
 * Dev-only diagnostic logging of an AI error. Never logs the API key or
 * authorization headers.
 */
function logAIError({ phase, status, model, body, retryAfter }) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    const info = { phase, status, model, retryAfter };
    if (body) {
      const e = body && body.error ? body.error : body;
      if (e && typeof e === 'object') {
        info.error = {};
        if (typeof e.message === 'string') { info.error.message = e.message; }
        if (e.code !== undefined) { info.error.code = e.code; }
        if (e.metadata !== undefined) { info.error.metadata = e.metadata; }
      }
    }
    console.debug('[ziiui:ai]', info);
  }
}

/**
 * Dev-only structured diagnostic logging for AI model fallback attempts.
 * Records model identity, attempt number, status, outcome, reason, and latency.
 * Never logs API keys, bearer tokens, or secret credentials.
 */
function logModelAttempt({ attempt, modelId, modelName, status, ok, reason, durationMs }) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    console.debug('[ziiui:ai:attempt]', {
      attempt,
      modelId,
      modelName,
      status,
      ok,
      reason,
      durationMs: Number.isFinite(durationMs) ? durationMs : undefined
    });
  }
}

function extractResponseText(payload) {
  if (!payload) {return '';}
  const choice = payload?.choices?.[0];
  const message = choice?.message;
  if (typeof message?.content === 'string') {return message.content;}
  if (Array.isArray(message?.content)) {
    return message.content.map((part) => {
      if (typeof part === 'string') {return part;}
      if (part && typeof part === 'object') {
        return part.text || part.content || '';
      }
      return '';
    }).join('\n');
  }
  if (message?.content && typeof message.content === 'object') {
    return String(message.content.text || message.content.content || JSON.stringify(message.content));
  }
  return '';
}

/**
 * @param {object}  p
 * @param {{name:string, category:string, original:string, current:string}} p.component
 * @param {object}  p.compState  persisted state, used for the chat context
 * @param {string}  p.request    the user's latest instruction
 * @param {AbortSignal} [p.signal]
 * @returns {Promise<string>} the complete updated HTML
 */
export async function generateCode({ component, compState, request, signal }) {
  if (!aiIsConfigured()) {throw new Error('NOKEY');}
  const prompt = String(request || '').trim();
  if (!prompt) {throw new Error('INVALID');}
  if (prompt.length > 4000) {throw new Error('INVALID');}

  // Enrich component with Layer B memory and Layer C task intent
  const taskIntent = classifyTaskIntent(prompt);
  const constraints = extractComponentConstraints(compState?.chatHistory);
  const enrichedComponent = {
    ...component,
    summary: compState?.summary || '',
    constraints,
    taskIntent
  };

  const systemPrompt = buildSystemPrompt(enrichedComponent);
  const messages = [{ role: 'system', content: systemPrompt }];
  const context = buildContextMessages(compState, prompt);
  context.forEach((m) => messages.push(m));
  messages.push({ role: 'user', content: prompt });

  // Dev-mode context metrics logging (zero secrets)
  logContextMetrics({
    componentId: compState?.componentId || component?.name,
    intents: taskIntent,
    rulesText: systemPrompt,
    memoryText: compState?.summary || '',
    codeText: component?.current || component?.original || '',
    chatText: context.map((m) => m.content).join('\n'),
    totalText: messages.map((m) => m.content).join('\n'),
    messageCount: context.length
  });

  const headers = { 'Content-Type': 'application/json' };
  if (!AI_USES_PROXY) {
    headers.Authorization = `Bearer ${  AI_API_KEY}`;
    headers['HTTP-Referer'] = window.location.origin || 'https://ziiui.local';
    headers['X-Title'] = 'ZiiUI';
  }

  let lastError = null;
  let attempt = 0;

  for (const model of AI_MODELS) {
    if (signal && signal.aborted) {throw abortError();}
    attempt++;
    const meta = MODEL_METADATA?.[model] || {};
    const modelName = meta.name || model;
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    // Per-model AbortController: enforces AI_MODEL_TIMEOUT_MS on this specific model attempt
    const modelController = new AbortController();
    let timedOut = false;
    const modelTimer = setTimeout(() => {
      timedOut = true;
      try { modelController.abort(); } catch (_) { /* ignore */ }
    }, AI_MODEL_TIMEOUT_MS);

    // If parent signal aborts (user clicked Cancel), abort this attempt immediately
    const onParentAbort = () => {
      try { modelController.abort(); } catch (_) { /* ignore */ }
    };
    if (signal) {
      signal.addEventListener('abort', onParentAbort, { once: true });
    }

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 5000 }),
        signal: modelController.signal
      });

      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const durationMs = Math.round(now - startTime);

      // 401 Unauthorized: Invalid API key -> Stop immediately
      if (response.status === 401) {
        const body = await readResponseBody(response);
        logModelAttempt({ attempt, modelId: model, modelName, status: 401, ok: false, reason: 'AUTH_INVALID_KEY', durationMs });
        logAIError({ phase: 'auth-failed', status: 401, model, body });
        throw new AIError('AUTH', { status: 401, model, body });
      }

      // 403 Forbidden: Differentiate model-specific gating from general account failure
      if (response.status === 403) {
        const body = await readResponseBody(response);
        const errorMsg = (body?.error?.message || (typeof body === 'string' ? body : '')).toLowerCase();
        const isModelGated = errorMsg.includes('agentic') || errorMsg.includes('harness') || errorMsg.includes('only available') || errorMsg.includes(model.toLowerCase());

        if (isModelGated) {
          logModelAttempt({ attempt, modelId: model, modelName, status: 403, ok: false, reason: 'MODEL_GATED', durationMs });
          logAIError({ phase: 'model-gated', status: 403, model, body });
          lastError = new AIError('MODEL_GATED', { status: 403, model, body });
          continue; // Advance to next fallback model
        }

        logModelAttempt({ attempt, modelId: model, modelName, status: 403, ok: false, reason: 'AUTH_FORBIDDEN', durationMs });
        logAIError({ phase: 'auth-forbidden', status: 403, model, body });
        throw new AIError('AUTH', { status: 403, model, body });
      }

      // 404 Not Found: Model unavailable/deprecated -> Advance to next model
      if (response.status === 404) {
        const body = await readResponseBody(response);
        logModelAttempt({ attempt, modelId: model, modelName, status: 404, ok: false, reason: 'MODEL_NOT_FOUND', durationMs });
        logAIError({ phase: 'not-found', status: 404, model, body });
        lastError = new AIError('The selected AI model is not available.', { status: 404, model, body });
        continue; // Advance to next fallback model
      }

      // 408 / 504 Timeout: Upstream timed out -> Advance to next model
      if (response.status === 408 || response.status === 504) {
        logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: false, reason: 'TIMEOUT', durationMs });
        lastError = new AIError('TIMEOUT', { status: response.status, model });
        continue;
      }

      // 429 Rate Limited: Quota/rate-limit reached -> Advance to next model
      if (response.status === 429) {
        const body = await readResponseBody(response);
        const retryAfter = response.headers.get('Retry-After') || undefined;
        logModelAttempt({ attempt, modelId: model, modelName, status: 429, ok: false, reason: 'RATE_LIMITED', durationMs });
        logAIError({ phase: 'rate-limited', status: 429, model, body, retryAfter });
        lastError = new AIError('RATE', { status: 429, model, retryAfter, body });
        continue;
      }

      // Other non-200 responses (e.g. 400, 500, 502, 503) -> Advance to next model
      if (!response.ok) {
        const body = await readResponseBody(response);
        logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: false, reason: `HTTP_${response.status}`, durationMs });
        logAIError({ phase: 'error', status: response.status, model, body });
        lastError = new AIError(`API:${response.status}`, { status: response.status, model, body });
        continue;
      }

      let data;
      try {
        data = await response.json();
      } catch (_) {
        logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: false, reason: 'BADJSON', durationMs });
        lastError = new Error('BADJSON');
        continue;
      }

      const output = extractResponseText(data);
      if (!output) {
        logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: false, reason: 'EMPTY', durationMs });
        lastError = new Error('EMPTY');
        continue;
      }

      if (output.length > MAX_CODE_CHARS) {
        logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: false, reason: 'TOO_LONG', durationMs });
        lastError = new Error('INVALID');
        continue;
      }

      const code = normalizeCode(output);
      if (!code) {
        logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: false, reason: 'NORMALIZED_EMPTY', durationMs });
        lastError = new Error('EMPTY');
        continue;
      }

      if (!looksLikeCode(code)) {
        logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: false, reason: 'NOT_CODE', durationMs });
        lastError = new Error('INVALID');
        continue;
      }

      const validation = validateGeneratedCode(code);
      if (!validation.ok) {
        logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: false, reason: 'VALIDATION_FAILED', durationMs });
        lastError = new Error('INVALID', { model });
        continue;
      }

      // Successful code generation
      lastSuccessfulModel = {
        modelId: model,
        modelName,
        attempt,
        durationMs
      };
      logModelAttempt({ attempt, modelId: model, modelName, status: response.status, ok: true, reason: 'SUCCESS', durationMs });
      return code;

    } catch (err) {
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const durationMs = Math.round(now - startTime);

      // If user explicitly cancelled via parent signal, stop immediately
      if (signal && signal.aborted) {throw abortError();}

      // If this model attempt timed out, log and advance to next model!
      if (timedOut || (err && (err.name === 'AbortError' || err.name === 'TimeoutError') && !signal?.aborted)) {
        logModelAttempt({ attempt, modelId: model, modelName, status: 408, ok: false, reason: 'TIMEOUT', durationMs });
        logAIError({ phase: 'timeout', status: 408, model });
        lastError = new AIError('TIMEOUT', { status: 408, model });
        continue;
      }

      if (err && (err.message === 'AUTH' || err.status === 401)) {throw err;}

      if (err instanceof TypeError) {
        logModelAttempt({ attempt, modelId: model, modelName, status: 0, ok: false, reason: 'NETWORK', durationMs });
        lastError = new AIError('NETWORK', { model });
        continue;
      }

      logModelAttempt({ attempt, modelId: model, modelName, status: err?.status || 0, ok: false, reason: err?.message || 'ERROR', durationMs });
      lastError = err;
    } finally {
      clearTimeout(modelTimer);
      if (signal) {
        signal.removeEventListener('abort', onParentAbort);
      }
    }
  }

  if (lastError && lastError.message === 'NETWORK') {throw lastError;}
  throw new Error('ALLMODELS');
}
