import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  estimateTokens,
  extractKeywords,
  classifyTaskIntent,
  extractComponentConstraints,
  generateStructuredSummary,
  retrieveRelevantMessages,
  buildSmartSystemPrompt,
  validateGeneratedCode
} from '../src/ai/context-engine.js';
import {
  getOrCreateComponentState,
  addMessage,
  addVersion,
  persistAIState,
  loadAIState,
  saveActiveComponentId,
  getMessages,
  getVersionsForSession
} from '../src/ai/state.js';
import { AI_STATE_KEY } from '../src/ai/config.js';

describe('Smart Context Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    loadAIState();
  });

  describe('Token Estimation and Budgeting', () => {
    it('estimates tokens conservatively (~3.8 chars/token)', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('abcd')).toBe(2);
      expect(estimateTokens('a'.repeat(380))).toBe(100);
      expect(estimateTokens('a'.repeat(381))).toBe(101);
    });
  });

  describe('Keyword Extraction and Task Intent Classification', () => {
    it('extracts non-stopword unique keywords', () => {
      const keywords = extractKeywords('Make the glow pulse faster with a neon-green color!');
      expect(keywords).toContain('glow');
      expect(keywords).toContain('pulse');
      expect(keywords).toContain('faster');
      expect(keywords).toContain('neon-green');
      expect(keywords).toContain('color');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('with');
    });

    it('classifies task intents across visual, animation, layout, and bug-fix', () => {
      expect(classifyTaskIntent('Change background to dark charcoal')).toContain('visual-style');
      expect(classifyTaskIntent('Speed up the GSAP timeline animation')).toContain('animation-timing');
      expect(classifyTaskIntent('Make it responsive for mobile grid layout')).toContain('layout-structure');
      expect(classifyTaskIntent('Update WebGL fragment shader uniforms')).toContain('webgl-shader');
      expect(classifyTaskIntent('Fix the undefined cursor click handler')).toContain('bug-fix');
    });
  });

  describe('Layer B & C: Component Memory and Task Constraints', () => {
    it('extracts user constraints from chat history', () => {
      const history = [
        { role: 'user', text: 'Please always keep the 60fps frame rate' },
        { role: 'assistant', text: 'Applied 60fps lock' },
        { role: 'user', text: 'The color palette must be monochrome' }
      ];
      const constraints = extractComponentConstraints(history);
      expect(constraints.some((c) => c.includes('always keep'))).toBe(true);
      expect(constraints.some((c) => c.includes('must be monochrome'))).toBe(true);
    });

    it('generates structured compact summaries', () => {
      const history = [
        { role: 'user', text: 'Increase text size' },
        { role: 'assistant', text: 'Applied: Increase text size' },
        { role: 'user', text: 'Add subtle shadow' },
        { role: 'assistant', text: 'Applied: Add subtle shadow' }
      ];
      const summary = generateStructuredSummary(history);
      expect(summary).toContain('Recent goals');
      expect(summary).toContain('Increase text size');
      expect(summary).toContain('Applied modifications');
    });

    it('builds a 5-layer system prompt: rules, component intelligence, session memory, task', () => {
      const prompt = buildSmartSystemPrompt({
        name: 'Glow Wave',
        category: 'Shader',
        original: '<canvas></canvas>',
        current: '<canvas id="active"></canvas>',
        constraints: ['always keep reduced-motion intact'],
        taskIntent: ['animation-timing', 'visual-style'],
        summary: 'Prior session summary text',
        currentTask: 'make it pulse',
        scope: 'opacity',
        preserve: 'canvas structure'
      });

      expect(prompt).toContain('Component name: Glow Wave');
      expect(prompt).toContain('Category: Shader');
      expect(prompt).toContain('always keep reduced-motion intact');
      expect(prompt).toContain('Active focus areas: animation-timing, visual-style');
      expect(prompt).toContain('Prior session summary text');
      // Layer 2: original code present as preservation reference
      expect(prompt).toContain('Original component code');
      expect(prompt).toContain('<canvas></canvas>');
      // Layer 3: current baseline present
      expect(prompt).toContain('<canvas id="active"></canvas>');
      // Layer 5: current task
      expect(prompt).toContain('Current task: make it pulse');
      expect(prompt).toContain('Elements to change (scope): opacity');
      expect(prompt).toContain('Elements to preserve: canvas structure');
    });
  });

  describe('Layer D: Relevance and Recency Retrieval', () => {
    it('prioritizes task-relevant messages over purely recent ones', () => {
      const state = getOrCreateComponentState('particle', 'Particle', 'Shader', '<div>orig</div>');
      addMessage(state.id, 'user', 'Configure Three.js particle density to 5000');
      addMessage(state.id, 'assistant', 'Applied: particle density 5000');
      addMessage(state.id, 'user', 'Change the font of the title');
      addMessage(state.id, 'assistant', 'Applied: title font');
      addMessage(state.id, 'user', 'Now adjust the particle density higher');

      const retrieved = retrieveRelevantMessages({ chatHistory: getMessages(state.id) }, 'particle density', 1500);
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved.some((m) => m.content.includes('particle density to 5000'))).toBe(true);
    });

    it('preserves component isolation across sessions', () => {
      const compA = getOrCreateComponentState('compA', 'Component A', 'Text', '<div>A</div>');
      const compB = getOrCreateComponentState('compB', 'Component B', 'Menus', '<div>B</div>');

      addMessage(compA.id, 'user', 'Instruction specifically for component A');
      addMessage(compB.id, 'user', 'Instruction specifically for component B');

      const retrievedA = retrieveRelevantMessages({ chatHistory: getMessages(compA.id) }, 'Instruction');
      const retrievedB = retrieveRelevantMessages({ chatHistory: getMessages(compB.id) }, 'Instruction');

      expect(retrievedA.every((m) => !m.content.includes('component B'))).toBe(true);
      expect(retrievedB.every((m) => !m.content.includes('component A'))).toBe(true);
    });
  });

  describe('Code Validation (Phase 3 & Phase 6)', () => {
    it('accepts valid HTML structures', () => {
      expect(validateGeneratedCode('<!DOCTYPE html><html><body><script>const a = 1;</script></body></html>').ok).toBe(true);
      expect(validateGeneratedCode('<div class="box"><style>.box{color:red;}</style></div>').ok).toBe(true);
    });

    it('rejects empty, short, or invalid markup', () => {
      expect(validateGeneratedCode('').ok).toBe(false);
      expect(validateGeneratedCode('short').ok).toBe(false);
      expect(validateGeneratedCode('I am an AI assistant and here is no HTML.').ok).toBe(false);
    });

    it('rejects mismatched script or style tags', () => {
      expect(validateGeneratedCode('<div><script>console.log("unclosed");</div>').ok).toBe(false);
      expect(validateGeneratedCode('<div><style>.a{color:blue;}</div>').ok).toBe(false);
    });
  });

  describe('Storage Deduplication & Safe Quota Recovery (Phase 4)', () => {
    it('deduplicates identical consecutive code snapshots', () => {
      const state = getOrCreateComponentState('dedup-test', 'Dedup', 'Text', '<div>Canonical</div>');
      const v1 = addVersion(state.id, '<div>Draft 1</div>', 'make change');
      const v2 = addVersion(state.id, '<div>Draft 1</div>', 'make change');
      expect(v1.id).toBe(v2.id);
      expect(getVersionsForSession(state.id)).toHaveLength(1);
    });

    it('recovers from storage quota errors by safely pruning inactive component snapshots', () => {
      saveActiveComponentId('active-comp');
      const inactiveState = getOrCreateComponentState('inactive-comp', 'Inactive', 'Shader', '<div>Inactive</div>');

      for (let i = 0; i < 6; i++) {
        addVersion(inactiveState.id, `<div>Inactive Snapshot ${i}</div>`, `prompt ${i}`);
      }
      expect(getVersionsForSession(inactiveState.id)).toHaveLength(6);

      let failedOnce = false;
      const originalSetItem = Storage.prototype.setItem;
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (k, v) {
        if (!failedOnce && k === AI_STATE_KEY) {
          failedOnce = true;
          const err = new Error('Quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        }
        return originalSetItem.call(this, k, v);
      });

      try {
        const ok = persistAIState();
        expect(ok).toBe(true);
        expect(failedOnce).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
