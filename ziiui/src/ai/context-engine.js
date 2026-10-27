/*
 * ZiiUI Smart Context Engine.
 *
 * Implements a 4-layer context builder with:
 * Layer A: Project Rules (immutable platform constraints)
 * Layer B: Component Memory (component-specific decisions & constraints)
 * Layer C: Task Memory (current goal, classified task intent, reference resolution)
 * Layer D: Relevant Conversation (relevance + recency scored message retrieval)
 *
 * Plus:
 * - Conservative token estimation (~3.8 chars/token)
 * - Structured incremental summaries
 * - Safe HTML/JS code validation
 * - Content deduplication
 * - Development-only logging without exposing secrets
 */

import { AI_MAX_CONTEXT_CHARS } from './config.js';

/** Conservative token estimation (~3.8 characters per token). */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(String(text).length / 3.8);
}

/** Layer A: Immutable Project Rules and Architecture Constraints. */
export const PROJECT_RULES = [
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
  '23. Do not change component IDs/classes unnecessarily.'
].join('\n');

/** Stop words filtered out when extracting relevance keywords. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
  'where', 'who', 'which', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'too', 'very', 'can',
  'just', 'should', 'now', 'please', 'make', 'change', 'component', 'ziiui'
]);

/** Extract meaningful keyword tokens from text. */
export function extractKeywords(text) {
  if (!text) return [];
  const words = String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return [...new Set(words)];
}

/**
 * Classifies the task intent from the user request.
 * Useful for Layer C (Task Memory) to focus the model's attention.
 */
export function classifyTaskIntent(prompt) {
  const p = String(prompt || '').toLowerCase();
  const intents = [];
  if (/color|bg|background|theme|glow|border|shadow|opacity|gradient|palette/i.test(p)) {
    intents.push('visual-style');
  }
  if (/speed|duration|ease|delay|stagger|timing|faster|slower|loop|pulse|bounce|timeline|gsap/i.test(p)) {
    intents.push('animation-timing');
  }
  if (/size|width|height|margin|padding|align|flex|grid|gap|position|responsive|mobile/i.test(p)) {
    intents.push('layout-structure');
  }
  if (/shader|glsl|canvas|particle|three|webgl|uniform|fragment|vertex/i.test(p)) {
    intents.push('webgl-shader');
  }
  if (/click|hover|scroll|trigger|event|drag|pointer|interaction|cursor/i.test(p)) {
    intents.push('interaction-event');
  }
  if (/fix|bug|broken|error|nan|undefined|syntax|console/i.test(p)) {
    intents.push('bug-fix');
  }
  return intents.length ? intents : ['general-refinement'];
}

/**
 * Layer B: Extract explicit user constraints and persistent decisions from history.
 * Looks for patterns like "always keep...", "never use...", "color must be...", "use font...".
 */
export function extractComponentConstraints(chatHistory) {
  if (!Array.isArray(chatHistory) || !chatHistory.length) return [];
  const constraints = [];
  const patterns = [
    /(?:always|never|must|don't|do not|keep|preserve)\s+[^.!?\n]{5,60}/gi,
    /(?:color|palette|font|theme)\s+(?:should be|is|must be)\s+[^.!?\n]{3,40}/gi
  ];

  chatHistory.forEach((msg) => {
    if (msg.role !== 'user' || !msg.text) return;
    patterns.forEach((re) => {
      const matches = msg.text.match(re);
      if (matches) {
        matches.forEach((m) => {
          const clean = m.trim();
          if (clean && !constraints.includes(clean)) constraints.push(clean);
        });
      }
    });
  });

  return constraints.slice(-6); // Keep the most recent 6 explicit constraints
}

/**
 * Generates an incremental structured summary of past conversation turns.
 * Preserves key decisions and user directions without redundant re-summarization.
 */
export function generateStructuredSummary(chatHistory) {
  if (!Array.isArray(chatHistory) || !chatHistory.length) return '';
  const userInstructions = [];
  const appliedActions = [];

  chatHistory.slice(-12).forEach((m) => {
    if (!m || typeof m.text !== 'string') return;
    const txt = m.text.trim();
    if (!txt) return;
    if (m.role === 'user') {
      userInstructions.push(txt.slice(0, 100));
    } else if (m.role === 'assistant') {
      appliedActions.push(txt.replace(/^Applied:\s*/i, '').slice(0, 80));
    }
  });

  const parts = [];
  if (userInstructions.length) {
    parts.push(`Recent goals: ${userInstructions.slice(-4).join('; ')}`);
  }
  if (appliedActions.length) {
    parts.push(`Applied modifications: ${appliedActions.slice(-4).join('; ')}`);
  }

  return parts.join(' | ').slice(0, 800);
}

/**
 * Layer D: Smart Message Retrieval with Task Relevance + Recency Scoring.
 * Selects the most informative historical messages that fit within the character budget.
 */
export function retrieveRelevantMessages(compState, currentPrompt, budgetChars = AI_MAX_CONTEXT_CHARS) {
  if (!compState || !Array.isArray(compState.chatHistory) || !compState.chatHistory.length) {
    return [];
  }

  const promptText = String(currentPrompt || '').trim();
  const promptKeywords = extractKeywords(promptText);

  // Exclude pending duplicate user message if already present at the end
  const history = compState.chatHistory.slice();
  const last = history[history.length - 1];
  if (last && last.role === 'user' && last.text === promptText) {
    history.pop();
  }

  if (!history.length) return [];

  // Score each message based on:
  // 1. Keyword overlap with current prompt (relevance)
  // 2. Correction / feedback signals (user says "no", "fix", "instead")
  // 3. Recency (higher index = more recent)
  const scored = history.map((msg, idx) => {
    let score = (idx / history.length) * 2; // Baseline recency score (0.0 to 2.0)
    const text = String(msg.text || '').toLowerCase();

    // Keyword relevance
    promptKeywords.forEach((kw) => {
      if (text.includes(kw)) score += 3.0;
    });

    // Correction or refinement boost
    if (msg.role === 'user' && /\b(no|not|instead|fix|undo|revert|wrong|broken)\b/i.test(text)) {
      score += 2.5;
    }

    // Assistant confirmation boost
    if (msg.role === 'assistant' && text.startsWith('applied:')) {
      score += 1.0;
    }

    return { msg, idx, score, length: text.length };
  });

  // Sort by score descending to pick top messages
  scored.sort((a, b) => b.score - a.score);

  const selected = [];
  let totalChars = 0;

  for (const item of scored) {
    if (totalChars + item.length > budgetChars) {
      // If we haven't included any message yet and it exceeds budget, slice it
      if (!selected.length && budgetChars > 100) {
        selected.push({
          msg: { role: item.msg.role, text: item.msg.text.slice(-budgetChars) },
          idx: item.idx
        });
      }
      break;
    }
    selected.push(item);
    totalChars += item.length;
  }

  // Restore chronological order
  selected.sort((a, b) => a.idx - b.idx);

  return selected.map((item) => ({
    role: item.msg.role === 'ai' ? 'assistant' : item.msg.role,
    content: item.msg.text
  }));
}

/**
 * Builds the complete 4-layer system prompt.
 *
 * @param {object} c
 * @param {string} c.name - Component display name
 * @param {string} c.category - Component category
 * @param {string} c.original - Original immutable code
 * @param {string} [c.current] - Active edited code draft
 * @param {string} [c.summary] - Cached conversation summary
 * @param {string[]} [c.constraints] - Explicit user constraints
 * @param {string} [c.taskIntent] - Classified task intent
 */
export function buildSmartSystemPrompt(c = {}) {
  const workingCode = c.current || c.original || '(unavailable)';
  const constraints = Array.isArray(c.constraints) ? c.constraints : [];
  const lines = [PROJECT_RULES, ''];

  // Layer B: Component Memory & Constraints
  lines.push('Component name: ' + (c.name || '(none)'));
  lines.push('Category: ' + (c.category || '(none)'));

  if (constraints.length) {
    lines.push('');
    lines.push('Persistent user constraints for this component:');
    constraints.forEach((cons) => lines.push(`- ${cons}`));
  }

  if (c.summary) {
    lines.push('');
    lines.push('Prior session summary: ' + c.summary);
  }

  // Layer C: Task Intent Guidance
  if (c.taskIntent && c.taskIntent.length) {
    lines.push('');
    lines.push('Active focus areas: ' + c.taskIntent.join(', '));
  }

  lines.push('');
  lines.push('Selected component code (authoritative working version — modify THIS):');
  lines.push(workingCode);
  lines.push('');
  lines.push('Return ONLY the complete updated HTML.');

  return lines.join('\n');
}

/**
 * Validates that an AI response contains structurally valid HTML/JS.
 * Prevents corrupted or incomplete code from becoming the active draft.
 */
export function validateGeneratedCode(code) {
  if (!code || typeof code !== 'string') {
    return { ok: false, error: 'Empty code response' };
  }
  const trimmed = code.trim();
  if (trimmed.length < 20) {
    return { ok: false, error: 'Code too short to be a valid component' };
  }

  const lower = trimmed.toLowerCase();
  const hasHtmlStructure = ['<!doctype', '<html', '<body', '<div', '<section', '<canvas', '<svg', '<style', '<script']
    .some((tag) => lower.includes(tag));

  if (!hasHtmlStructure) {
    return { ok: false, error: 'Response does not contain valid HTML markup' };
  }

  // Check script tags for balance
  const openScripts = (lower.match(/<script\b/g) || []).length;
  const closeScripts = (lower.match(/<\/script>/g) || []).length;
  if (openScripts !== closeScripts) {
    return { ok: false, error: 'Mismatched <script> tags in generated code' };
  }

  // Check style tags for balance
  const openStyles = (lower.match(/<style\b/g) || []).length;
  const closeStyles = (lower.match(/<\/style>/g) || []).length;
  if (openStyles !== closeStyles) {
    return { ok: false, error: 'Mismatched <style> tags in generated code' };
  }

  return { ok: true };
}

/**
 * Safe development-mode logging for context composition without secrets.
 */
export function logContextMetrics(metrics) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    console.debug('[ziiui:context-engine]', {
      componentId: metrics.componentId || 'unknown',
      intents: metrics.intents || [],
      estimatedTokens: {
        rules: estimateTokens(metrics.rulesText),
        memory: estimateTokens(metrics.memoryText),
        code: estimateTokens(metrics.codeText),
        chat: estimateTokens(metrics.chatText),
        total: estimateTokens(metrics.totalText)
      },
      messageCount: metrics.messageCount || 0
    });
  }
}
