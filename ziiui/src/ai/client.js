/*
 * OpenRouter client. Tries each configured model in order and returns the first
 * reply that looks like valid component HTML.
 *
 * Errors thrown (err.message): NOKEY, AUTH, NETWORK, ALLMODELS — plus
 * AbortError when the request is cancelled or times out.
 */
import { AI_API_KEY, AI_ENDPOINT, AI_MODELS, AI_USES_PROXY, aiIsConfigured } from './config.js';
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

function extractResponseText(payload) {
  if (!payload) return '';
  const choice = payload?.choices?.[0];
  const message = choice?.message;
  if (typeof message?.content === 'string') return message.content;
  if (Array.isArray(message?.content)) {
    return message.content.map((part) => {
      if (typeof part === 'string') return part;
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
  if (!aiIsConfigured()) throw new Error('NOKEY');
  const prompt = String(request || '').trim();
  if (!prompt) throw new Error('INVALID');
  if (prompt.length > 4000) throw new Error('INVALID');

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
    headers.Authorization = 'Bearer ' + AI_API_KEY;
    headers['HTTP-Referer'] = window.location.origin || 'https://ziiui.local';
    headers['X-Title'] = 'ZiiUI';
  }

  let lastError = null;
  for (const model of AI_MODELS) {
    if (signal && signal.aborted) throw abortError();
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 5000 }),
        signal
      });
      if (response.status === 401 || response.status === 403) throw new Error('AUTH');
      if (response.status === 408 || response.status === 504) throw new Error('TIMEOUT');
      if (response.status === 429) { lastError = new Error('RATE'); continue; }
      if (!response.ok) {
        let detail = '';
        try { detail = await response.text(); } catch (_) { /* ignore */ }
        lastError = new Error('API:' + response.status + (detail ? ' - ' + detail.slice(0, 140) : ''));
        continue;
      }

      let data;
      try { data = await response.json(); } catch (_) { lastError = new Error('BADJSON'); continue; }
      const output = extractResponseText(data);
      if (!output) { lastError = new Error('EMPTY'); continue; }
      if (output.length > MAX_CODE_CHARS) { lastError = new Error('INVALID'); continue; }

      const code = normalizeCode(output);
      if (!code) { lastError = new Error('EMPTY'); continue; }
      if (!looksLikeCode(code)) { lastError = new Error('INVALID'); continue; }

      const validation = validateGeneratedCode(code);
      if (!validation.ok) { lastError = new Error('INVALID'); continue; }

      return code;
    } catch (err) {
      if (err && err.name === 'AbortError') throw err;
      if (err && err.message === 'AUTH') throw err;
      if (err && err.message === 'TIMEOUT') throw err;
      lastError = err instanceof TypeError ? new Error('NETWORK') : err;
    }
  }
  if (lastError && lastError.message === 'NETWORK') throw lastError;
  if (lastError && lastError.message === 'RATE') throw lastError;
  throw new Error('ALLMODELS');
}
