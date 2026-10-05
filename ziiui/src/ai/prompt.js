/* Prompt construction and response validation. */

/**
 * @param {{name:string, category:string, original:string, current:string}} c
 *   `current` is the AI-edited code, or '' when it is identical to the original.
 */
export function buildSystemPrompt(c) {
  const workingCode = c.current || c.original || '(unavailable)';
  return [
    'You are an expert frontend developer working for ZiiUI.',
    '',
    'You are editing the currently selected ZiiUI component through an iterative conversation.',
    '',
    'The current edited code is the authoritative working version.',
    "Apply the user's latest request to the current edited code.",
    'Use previous conversation messages to resolve references such as "it", "this", "that", "make it bigger", "undo that", etc.',
    'Do not revert previous changes unless the user explicitly asks.',
    'Preserve all functionality that was not requested to change.',
    'Return ONLY the complete updated runnable HTML component.',
    '',
    'Rules:',
    '1. Return the COMPLETE updated component code.',
    '2. Do not return explanations before the code.',
    '3. Preserve all functionality that the user did not ask to change.',
    '4. Do not modify unrelated parts of the component.',
    '5. Preserve existing HTML structure when possible.',
    '6. Preserve existing JavaScript behavior unless the user requests a behavior change.',
    '7. Preserve existing CSS behavior unless the user requests a style change.',
    '8. Preserve external libraries such as GSAP, Three.js, fonts.',
    '9. Make the resulting component self-contained.',
    '10. Make sure the returned code can run directly inside the preview iframe.',
    '11. Do not use backend code.',
    '12. Do not use Node.js.',
    '13. Do not use server-side APIs.',
    '14. Do not include Markdown fences.',
    '15. Return only the complete runnable HTML component.',
    '16. Do not modify the original source code.',
    '17. The edited code is a new temporary version of the selected component.',
    '18. If the request is ambiguous, make the smallest reasonable change.',
    '19. Ensure responsive behavior is preserved.',
    '20. Ensure JavaScript errors are avoided.',
    '21. Do not remove existing accessibility features unless necessary.',
    '22. Do not remove reduced-motion support.',
    '23. Do not change component IDs/classes unnecessarily.',
    '',
    'Component name: ' + (c.name || '(none)'),
    'Category: ' + (c.category || '(none)'),
    '',
    'Selected component code (authoritative working version — modify THIS):',
    workingCode,
    '',
    'Return ONLY the complete updated HTML.'
  ].join('\n');
}

/** Strip Markdown fences and any prose before <!DOCTYPE html>. */
export function normalizeCode(text) {
  let t = String(text == null ? '' : text).trim();
  if (!t) return '';

  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      const jsonText = typeof parsed === 'string' ? parsed : parsed && parsed.code ? parsed.code : parsed && parsed.html ? parsed.html : '';
      if (jsonText) t = String(jsonText).trim();
    } catch (_) { /* ignore malformed JSON */ }
  }

  const fenced = t.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)```/);
  if (fenced && fenced[1] && fenced[1].trim()) t = fenced[1].trim();
  else t = t.replace(/^```[a-zA-Z0-9]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

  const docIdx = t.search(/<!DOCTYPE\s+html/i);
  if (docIdx >= 0) return t.slice(docIdx).trim();

  const htmlIdx = t.search(/<html|<body|<section|<div|<style|<script|<svg/i);
  if (htmlIdx > 0) return t.slice(htmlIdx).trim();

  return t.trim();
}

/** Cheap sanity check that a model reply is HTML rather than prose. */
export function looksLikeCode(code) {
  if (!code || code.trim().length < 20) return false;
  const c = code.toLowerCase();
  return ['html', 'body', 'div', 'section', 'canvas', 'svg', 'style', 'script']
    .some((tag) => c.includes('<' + tag));
}

/** Human-friendly text for an error thrown by the AI client. */
export function describeAIError(err) {
  const m = (err && err.message) || '';
  if (err && err.name === 'AbortError') return 'AI request timed out. Your existing component was preserved.';
  if (m === 'NOKEY') return 'AI is not configured. Use VITE_OPENROUTER_API_KEY for local development or configure VITE_AI_ENDPOINT to a server-side proxy for production.';
  if (m === 'AUTH') return 'OpenRouter rejected the API key. Check that your key is valid and has credits.';
  if (m === 'RATE') return 'OpenRouter rate limit reached. Please try again shortly.';
  if (m === 'NETWORK') return 'Could not reach OpenRouter. Check your internet connection.';
  if (m === 'EMPTY') return 'AI did not return component code.';
  if (m === 'INVALID') return 'AI returned invalid component code. Please try again.';
  if (m === 'BADJSON') return 'OpenRouter returned an unreadable response.';
  if (m === 'ALLMODELS') return 'All configured AI models failed. Please try again later.';
  if (m === 'TIMEOUT') return 'AI request timed out. Your existing component was preserved.';
  if (m.indexOf('API:') === 0) return 'OpenRouter error ' + m.slice(4) + '.';
  return 'Something went wrong: ' + (m || 'unknown error');
}
