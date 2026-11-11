/*
 * AI configuration.
 *
 * The API key is read only during local development. Production builds
 * require a server-side proxy configured with VITE_AI_ENDPOINT.
 */
export const AI_STATE_KEY = 'ziiui-ai-state-v2';
export const AI_ACTIVE_KEY = 'ziiui-ai-active-component';
export const AI_SETTINGS_KEY = 'ziiui-ai-settings';
export const AI_PENDING_KEY = 'ziiui-ai-pending-request';
export const AI_SCHEMA_VERSION = 3;

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const AI_MAX_CONTEXT_CHARS = 8000;
/** Per-model timeout (default 25 seconds). If a model hangs or takes too long, fallback proceeds to next model. */
export const AI_MODEL_TIMEOUT_MS = Number(env.VITE_AI_MODEL_TIMEOUT_MS) || 25000;
/** Overall request timeout (default 120 seconds) for the entire fallback cascade. */
export const AI_REQUEST_TIMEOUT_MS = Number(env.VITE_AI_REQUEST_TIMEOUT_MS) || 120000;
export const AI_MAX_VERSIONS = 30;
export const AI_MAX_MESSAGES = 60;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Netlify Function that forwards to API using a server-side key.
const PROXY_URL = '/api/ai';

const DEFAULT_ENDPOINT = env.DEV ? OPENROUTER_URL : PROXY_URL;

/**
 * 6 Free Coding Models configured in strict priority order:
 * 1. Cohere — North Mini Code (Free)
 * 2. Recursive — Flint (Free)
 * 3. NVIDIA — Nemotron 3.5 Lightning (Free)
 * 4. Dots — Dots3-Note Preview (Free)
 * 5. NVIDIA — Nemotron 3 Ultra (Free)
 * 6. Inkling 2 Small (Free)
 */
export const DEFAULT_MODELS = [
  'cohere/north-mini-code:free',
  'recursive/flint-v1.0:free',
  'nvidia/nemotron-3.5-lightning:free',
  'dots-studio/dots-3-note-preview:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'thinkingmachines/inkling-2-small:free'
];

export const MODEL_METADATA = {
  'cohere/north-mini-code:free': {
    name: 'Cohere — North Mini Code (Free)',
    context: 256000
  },
  'recursive/flint-v1.0:free': {
    name: 'Recursive — Flint (Free)',
    context: 262144
  },
  'nvidia/nemotron-3.5-lightning:free': {
    name: 'NVIDIA — Nemotron 3.5 Lightning (Free)',
    context: 1000000
  },
  'dots-studio/dots-3-note-preview:free': {
    name: 'Dots — Dots3-Note Preview (Free)',
    context: 512000
  },
  'nvidia/nemotron-3-ultra-550b-a55b:free': {
    name: 'NVIDIA — Nemotron 3 Ultra (Free)',
    context: 1000000
  },
  'thinkingmachines/inkling-2-small:free': {
    name: 'Inkling 2 Small (Free)',
    context: 1048576
  }
};

export const AI_ENDPOINT = (env.VITE_AI_ENDPOINT || '').trim() || DEFAULT_ENDPOINT;
export const AI_USES_PROXY = AI_ENDPOINT !== OPENROUTER_URL;

/** Comma-separated override, e.g. VITE_AI_MODELS=cohere/north-mini-code:free,recursive/flint-v1.0:free */
const modelOverride = (env.VITE_AI_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
export const AI_MODELS = modelOverride.length ? modelOverride : DEFAULT_MODELS;

const PLACEHOLDER = /your[_-]?(new[_-]?)?key|x{6,}|add your|paste/i;

function cleanKey(raw) {
  const key = String(raw || '').trim();
  return key && !PLACEHOLDER.test(key) ? key : '';
}

export const AI_API_KEY = env.DEV
  ? cleanKey(env.VITE_OPENROUTER_API_KEY)
  : '';

/** True when requests can be sent (own key, or a proxy that holds the key). */
export const aiIsConfigured = () => AI_USES_PROXY || !!AI_API_KEY;
