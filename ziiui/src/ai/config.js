/*
 * AI configuration.
 *
 * The OpenRouter key is read only during local development. Production builds
 * require a server-side proxy configured with VITE_AI_ENDPOINT.
 */
export const AI_STATE_KEY = 'ziiui-ai-state-v2';
export const AI_ACTIVE_KEY = 'ziiui-ai-active-component';
export const AI_SETTINGS_KEY = 'ziiui-ai-settings';
export const AI_PENDING_KEY = 'ziiui-ai-pending-request';
export const AI_SCHEMA_VERSION = 2;

export const AI_MAX_CONTEXT_CHARS = 8000;
export const AI_REQUEST_TIMEOUT_MS = 90000;
export const AI_MAX_VERSIONS = 30;
export const AI_MAX_MESSAGES = 60;

const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = [
  'qwen/qwen3-coder:free',
  'poolside/laguna-s-2.1:free',
  'google/gemma-4-26b-a4b-it:free',
  'deepseek/deepseek-r1:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free'
];

export const AI_ENDPOINT = (import.meta.env.VITE_AI_ENDPOINT || '').trim() || DEFAULT_ENDPOINT;
export const AI_USES_PROXY = AI_ENDPOINT !== DEFAULT_ENDPOINT;

/** Comma-separated override, e.g. VITE_AI_MODELS=openai/gpt-4o-mini,qwen/qwen3-coder:free */
const modelOverride = (import.meta.env.VITE_AI_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
export const AI_MODELS = modelOverride.length ? modelOverride : DEFAULT_MODELS;

const PLACEHOLDER = /your[_-]?(new[_-]?)?key|x{6,}|add your|paste/i;

function cleanKey(raw) {
  const key = String(raw || '').trim();
  return key && !PLACEHOLDER.test(key) ? key : '';
}

export const AI_API_KEY = import.meta.env.DEV
  ? cleanKey(import.meta.env.VITE_OPENROUTER_API_KEY)
  : '';

/** True when requests can be sent (own key, or a proxy that holds the key). */
export const aiIsConfigured = () => AI_USES_PROXY || !!AI_API_KEY;
