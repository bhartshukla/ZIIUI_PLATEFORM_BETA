import { describe, it, expect, beforeEach } from 'vitest';
import { loadTemplate, preloadTemplates, hasLazyTemplate, clearTemplateCache, getTemplateCacheSize } from '../src/effects/templates.js';

describe('Lazy template loader', () => {
  beforeEach(() => clearTemplateCache());

  it('loads a known template', async () => {
    expect(hasLazyTemplate('base.css')).toBe(true);
    const src = await loadTemplate('base.css');
    expect(typeof src).toBe('string');
    expect(src.length).toBeGreaterThan(0);
  });

  it('throws for unknown template', async () => {
    await expect(loadTemplate('nope-unknown.css')).rejects.toThrow();
  });

  it('caches on repeat calls', async () => {
    const a = await loadTemplate('tail.js');
    const b = await loadTemplate('tail.js');
    expect(a).toBe(b);
    expect(getTemplateCacheSize()).toBe(1);
  });

  it('dedups concurrent requests', async () => {
    const p1 = loadTemplate('wrap.js');
    const p2 = loadTemplate('wrap.js');
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(b);
    expect(getTemplateCacheSize()).toBe(1);
  });

  it('preloadTemplates resolves', async () => {
    await preloadTemplates(['base.css', 'tail.js', 'missing.css']);
    expect(getTemplateCacheSize()).toBeGreaterThanOrEqual(2);
  });
});
