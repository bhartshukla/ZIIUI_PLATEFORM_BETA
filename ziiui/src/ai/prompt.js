import { buildSmartSystemPrompt, validateGeneratedCode } from './context-engine.js';

export { buildSmartSystemPrompt, validateGeneratedCode };

/**
 * @param {{name:string, category:string, original:string, current:string, summary?:string, constraints?:string[], taskIntent?:string[]}} c
 *   `current` is the AI-edited code, or '' when it is identical to the original.
 */
export function buildSystemPrompt(c) {
  return buildSmartSystemPrompt(c);
}

/** Strip Markdown fences and any prose before <!DOCTYPE html>. */
export function normalizeCode(text) {
  let t = String(text == null ? '' : text).trim();
  if (!t) {return '';}

  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      const jsonText = typeof parsed === 'string' ? parsed : parsed && parsed.code ? parsed.code : parsed && parsed.html ? parsed.html : '';
      if (jsonText) {t = String(jsonText).trim();}
    } catch (_) { /* ignore malformed JSON */ }
  }

  const fenced = t.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)```/);
  if (fenced && fenced[1] && fenced[1].trim()) {t = fenced[1].trim();}
  else {t = t.replace(/^```[a-zA-Z0-9]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();}

  const docIdx = t.search(/<!DOCTYPE\s+html/i);
  if (docIdx >= 0) {return t.slice(docIdx).trim();}

  const htmlIdx = t.search(/<html|<body|<section|<div|<style|<script|<svg/i);
  if (htmlIdx > 0) {return t.slice(htmlIdx).trim();}

  return t.trim();
}

/** Cheap sanity check that a model reply is HTML rather than prose. */
export function looksLikeCode(code) {
  if (!code || code.trim().length < 20) {return false;}
  const c = code.toLowerCase();
  return ['html', 'body', 'div', 'section', 'canvas', 'svg', 'style', 'script']
    .some((tag) => c.includes(`<${  tag}`));
}

export const AI_TRAINING_PHASE_TITLE = 'Model in Training Phase';
export const AI_TRAINING_PHASE_MESSAGE = 'Our AI model is currently in its training and improvement phase. AI generation is temporarily unavailable. Please try again later.';

/**
 * Standard user-facing message strictly adhering to ZiiUI branding.
 * Hides all technical error details and provider references from users.
 */
export function getUserFacingAIMessage(err) {
  if (err && err.name === 'AbortError') {
    return 'AI request timed out or was cancelled. Your existing component was preserved.';
  }
  return `${AI_TRAINING_PHASE_TITLE}\n${AI_TRAINING_PHASE_MESSAGE}`;
}

/** Human-friendly text for an error thrown by the AI client. */
export function describeAIError(err) {
  const m = (err && err.message) || '';
  if (err && err.name === 'AbortError') {return 'AI request timed out. Your existing component was preserved.';}
  // Structured AI errors carry status/model/retryAfter but never the API key.
  if (err && err.name === 'AIError') {
    if (err.status === 404) {
      const modelText = err.model ? ` ${err.model}` : '';
      return `The AI model${modelText} is not available. Please try again.`;
    }
    if (err.status === 429) {
      const wait = err.retryAfter ? ` Wait about ${err.retryAfter} seconds before retrying.` : '';
      return `OpenRouter rate limit reached.${wait}`;
    }
    if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
      return `OpenRouter request failed (${err.status}). Please try again.`;
    }
    if (Number.isInteger(err.status) && err.status >= 500) {
      return `OpenRouter server error (${err.status}). Please try again later.`;
    }
    return 'AI request failed. Please try again.';
  }
  if (m === 'NOKEY') {return 'AI is not configured. Use VITE_OPENROUTER_API_KEY for local development or configure VITE_AI_ENDPOINT to a server-side proxy for production.';}
  if (m === 'AUTH') {return 'OpenRouter rejected the API key. Check that your key is valid and has credits.';}
  if (m === 'RATE') {return 'OpenRouter rate limit reached. Please try again shortly.';}
  if (m === 'NETWORK') {return 'Could not reach OpenRouter. Check your internet connection.';}
  if (m === 'EMPTY') {return 'AI did not return component code.';}
  if (m === 'INVALID') {return 'AI returned invalid component code. Please try again.';}
  if (m === 'BADJSON') {return 'OpenRouter returned an unreadable response.';}
  if (m === 'ALLMODELS') {return 'All configured AI models failed. Please try again later.';}
  if (m === 'TIMEOUT') {return 'AI request timed out. Your existing component was preserved.';}
  if (m.indexOf('API:') === 0) {return `OpenRouter error ${  m.slice(4)  }.`;}
  return `Something went wrong: ${  m || 'unknown error'}`;
}
