/**
 * Netlify Function: ZiiUI AI proxy.
 *
 * Forwards AI component-edit requests from the ZiiUI frontend to OpenRouter,
 * authenticating with the server-side OPENROUTER_API_KEY environment variable.
 * The frontend never sees or transmits the key.
 *
 * Served at /api/ai via a Netlify redirect to /.netlify/functions/ai.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_PAYLOAD_BYTES = 1_000_000;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function readHeader(event, name) {
  // Netlify lowercases all header keys.
  return event.headers[name.toLowerCase()] || '';
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json(500, { error: 'AI service is not configured on the server.' });
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : null;
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  if (!body || typeof body !== 'object') {
    return json(400, { error: 'Request body must be a JSON object.' });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, { error: 'messages array is required.' });
  }
  if (!body.model) {
    return json(400, { error: 'model is required.' });
  }

  const payload = JSON.stringify(body);
  if (payload.length > MAX_PAYLOAD_BYTES) {
    return json(413, { error: 'Request too large.' });
  }

  const headers = {
    Authorization: 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
    'HTTP-Referer': readHeader(event, 'http-referer') || readHeader(event, 'referer') || 'https://ziiui.local',
    'X-Title': readHeader(event, 'x-title') || 'ZiiUI'
  };

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers,
      body: payload
    });
  } catch {
    return json(502, { error: 'Could not reach OpenRouter.' });
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    data = null;
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return json(401, { error: 'Upstream authentication failed.' });
  }
  if (upstream.status === 429) {
    return json(429, { error: 'Rate limit reached. Try again shortly.' });
  }
  if (!upstream.ok) {
    return json(upstream.status, { error: 'Upstream error.', detail: data });
  }

  return json(200, data);
}