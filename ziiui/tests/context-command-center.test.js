import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AI_STATE_KEY, AI_ACTIVE_KEY } from '../src/ai/config.js';

describe('AI Context Command Center UI Redesign', () => {
  const htmlPath = resolve(__dirname, '../context.html');
  const cssPath = resolve(__dirname, '../src/styles/context.css');
  const html = readFileSync(htmlPath, 'utf-8');
  const css = readFileSync(cssPath, 'utf-8');

  describe('Markup & UI Structure (context.html)', () => {
    it('contains redesigned compact header with brand and action toolbar', () => {
      expect(html).toContain('class="cmd-header"');
      expect(html).toContain('class="brand-name"');
      expect(html).toContain('ziiui');
      expect(html).toContain('AI Context');
      expect(html).toContain('href="index.html"');
      expect(html).toContain('href="ai.html"');
      expect(html).toContain('id="refreshBtn"');
      expect(html).toContain('id="themeBtn"');
      expect(html).toContain('id="clearAllBtn"');
      expect(html).toContain('class="btn danger"');
    });

    it('renders Command Center introduction heading and supporting copy', () => {
      expect(html).toContain('AI Context Center');
      expect(html).toContain('Search, inspect and manage component memory.');
      expect(html).toContain('class="cmd-hero"');
    });

    it('provides prominent full-width search bar with Ctrl+K indicator and clear button', () => {
      expect(html).toContain('id="contextSearch"');
      expect(html).toContain('placeholder="Find a component or conversation…"');
      expect(html).toContain('aria-label="Find a component or conversation"');
      expect(html).toContain('id="searchClearBtn"');
      expect(html).toContain('id="searchKbd"');
    });

    it('renders the three required summary cards for Components, Conversations, and Saved Versions', () => {
      expect(html).toContain('id="statComponents"');
      expect(html).toContain('id="statConversations"');
      expect(html).toContain('id="statVersions"');
      expect(html).toContain('Components');
      expect(html).toContain('Conversations');
      expect(html).toContain('Saved Versions');
    });

    it('structures Recent Components section with list, count badge, and browse link', () => {
      expect(html).toContain('id="compPanelTitle"');
      expect(html).toContain('Recent Components');
      expect(html).toContain('id="compList"');
      expect(html).toContain('id="compListCount"');
      expect(html).toContain('id="searchNoResults"');
      expect(html).toContain('class="browse-all-link"');
    });

    it('structures Conversation Inspector with continue button, chat stream, and empty state', () => {
      expect(html).toContain('id="detailCard"');
      expect(html).toContain('id="detailCompName"');
      expect(html).toContain('id="openInEditorBtn"');
      expect(html).toContain('Continue in AI Editor');
      expect(html).toContain('id="chatMsgs"');
      expect(html).toContain('id="chatEmpty"');
    });
  });

  describe('Design & Styling (context.css)', () => {
    it('strictly utilizes black, white, and neutral grays without gradients or color accents', () => {
      expect(css).toContain('--bg: #0a0a0a');
      expect(css).toContain('--panel: #111111');
      expect(css).toContain('--fg: #f5f5f5');
      expect(css).toContain('--line: #222222');
      // No linear-gradient or radial-gradient backgrounds in core layout
      expect(css).not.toMatch(/background:\s*linear-gradient/);
    });

    it('defines responsive grid layouts for summary cards and command layout', () => {
      expect(css).toMatch(/\.summary-grid\s*\{[^}]*display:\s*grid/);
      expect(css).toMatch(/\.cmd-layout\s*\{[^}]*display:\s*grid/);
      // Media queries for tablet and mobile
      expect(css).toContain('@media (max-width: 820px)');
      expect(css).toContain('@media (max-width: 640px)');
    });

    it('styles destructive Clear History button with subtle danger highlight on hover', () => {
      expect(css).toContain('.btn.danger');
      expect(css).toContain('--danger-fg');
      expect(css).toContain('.btn.danger:hover');
    });

    it('provides high-contrast focus state for search input', () => {
      expect(css).toMatch(/\.search-input:focus\s*\{[^}]*border-color:\s*var\(--fg\)/);
    });
  });

  describe('Live DOM & Command Center Functionality', () => {
    let mockStorage = {};

    beforeEach(() => {
      mockStorage = {};
      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, val) => { mockStorage[key] = String(val); }),
        removeItem: vi.fn((key) => { delete mockStorage[key]; }),
        clear: vi.fn(() => { mockStorage = {}; })
      });

      // Inject clean DOM structure matching context.html
      document.body.innerHTML = html.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('calculates real metrics and updates summary cards based on AI state', async () => {
      const sampleState = {
        schemaVersion: 1,
        components: {
          comp1: {
            componentId: 'comp1',
            componentName: 'Wave Text',
            category: 'Text',
            chatHistory: [{ role: 'user', text: 'make it faster', timestamp: 1000 }],
            codeVersions: [{ id: 'v1', code: '<div>code</div>' }, { id: 'v2', code: '<div>v2</div>' }],
            lastUpdated: 1000
          },
          comp2: {
            componentId: 'comp2',
            componentName: 'Image Trail',
            category: 'Interactive',
            chatHistory: [
              { role: 'user', text: 'add opacity fade', timestamp: 2000 },
              { role: 'assistant', text: 'Applied opacity fade to trail', timestamp: 2005 }
            ],
            codeVersions: [{ id: 'v1', code: '<div>trail</div>' }],
            lastUpdated: 2005
          },
          comp3: {
            componentId: 'comp3',
            componentName: 'No Chat Component',
            category: 'Web',
            chatHistory: [],
            codeVersions: [],
            lastUpdated: 500
          }
        }
      };
      mockStorage[AI_STATE_KEY] = JSON.stringify(sampleState);

      // Re-import and execute context.js
      vi.resetModules();
      await import('../src/pages/context.js');

      // 3 components tracked
      expect(document.getElementById('statComponents').textContent).toBe('3');
      // 2 components have active conversation threads
      expect(document.getElementById('statConversations').textContent).toBe('2');
      // 3 total saved versions (2 + 1)
      expect(document.getElementById('statVersions').textContent).toBe('3');

      // Component list items rendered
      const items = document.querySelectorAll('.comp-list .comp-item');
      expect(items.length).toBe(3);
    });

    it('filters components and conversations in real-time as user types in search bar', async () => {
      const sampleState = {
        schemaVersion: 1,
        components: {
          alpha: {
            componentId: 'alpha',
            componentName: 'Magnetic Cursor',
            category: 'Cursor',
            chatHistory: [{ role: 'user', text: 'increase attraction radius', timestamp: 1000 }],
            lastUpdated: 1000
          },
          beta: {
            componentId: 'beta',
            componentName: 'Matrix Rain',
            category: 'Background',
            chatHistory: [{ role: 'user', text: 'change font color to white', timestamp: 2000 }],
            lastUpdated: 2000
          }
        }
      };
      mockStorage[AI_STATE_KEY] = JSON.stringify(sampleState);

      vi.resetModules();
      await import('../src/pages/context.js');

      const searchInput = document.getElementById('contextSearch');
      expect(searchInput).toBeTruthy();

      // Search by component name
      searchInput.value = 'Matrix';
      searchInput.dispatchEvent(new Event('input'));

      let items = document.querySelectorAll('.comp-list .comp-item');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('Matrix Rain');

      // Search by message content
      searchInput.value = 'attraction radius';
      searchInput.dispatchEvent(new Event('input'));

      items = document.querySelectorAll('.comp-list .comp-item');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('Magnetic Cursor');

      // Search with no matches
      searchInput.value = 'nonexistent keyword';
      searchInput.dispatchEvent(new Event('input'));

      items = document.querySelectorAll('.comp-list .comp-item');
      expect(items.length).toBe(0);
      expect(document.getElementById('searchNoResults').hidden).toBe(false);

      // Clear search
      const clearBtn = document.getElementById('searchClearBtn');
      clearBtn.dispatchEvent(new Event('click'));

      items = document.querySelectorAll('.comp-list .comp-item');
      expect(items.length).toBe(2);
      expect(document.getElementById('searchNoResults').hidden).toBe(true);
    });

    it('updates detail view and Continue in AI Editor link when selecting a component', async () => {
      const sampleState = {
        schemaVersion: 1,
        components: {
          glow: {
            componentId: 'glow',
            componentName: 'Glow Card',
            category: 'Cards',
            chatHistory: [
              { role: 'user', text: 'make glow subtle', timestamp: 1000 },
              { role: 'assistant', text: 'Updated blur radius to 12px', timestamp: 1010 }
            ],
            lastUpdated: 1010
          }
        }
      };
      mockStorage[AI_STATE_KEY] = JSON.stringify(sampleState);

      vi.resetModules();
      await import('../src/pages/context.js');

      expect(document.getElementById('detailCompName').textContent).toBe('Glow Card');
      expect(document.getElementById('detailCategory').textContent).toBe('Cards');
      expect(document.getElementById('openInEditorBtn').href).toContain('ai.html?component=glow');

      // Messages rendered
      const msgs = document.querySelectorAll('.chat-stream .msg');
      expect(msgs.length).toBe(2);
      expect(msgs[0].classList.contains('user')).toBe(true);
      expect(msgs[1].classList.contains('assistant')).toBe(true);
    });
  });
});
