import { describe, it, expect, vi } from 'vitest';
import { EFFECTS, CATEGORIES, BY_ID } from '../src/effects/registry.js';
import { hasTemplate } from '../src/effects/templates.js';

/** Pull every inline <script>…</script> body out of a generated document. */
function inlineScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

describe('effects registry', () => {
  it('has 25 uniquely-identified effects', () => {
    expect(EFFECTS).toHaveLength(25);
    expect(new Set(EFFECTS.map((e) => e.id)).size).toBe(EFFECTS.length);
    expect(BY_ID.pinrotate).toBeTruthy();
    expect(BY_ID.imageflow).toBeTruthy();
  });

  it('puts every effect in a known category', () => {
    for (const e of EFFECTS) expect(CATEGORIES).toContain(e.cat);
  });

  it('never reports a missing template', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    EFFECTS.forEach((e) => e.code('char', 'fade'));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    expect(hasTemplate('cursor1.css')).toBe(true);
    expect(hasTemplate('nope.css')).toBe(false);
  });
});

describe.each(EFFECTS.map((e) => [e.id, e]))('effect %s', (_id, effect) => {
  const html = effect.opts ? effect.code('char', 'fade') : effect.code();

  it('generates a complete standalone document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<style>');
    expect(html.trim().endsWith('</html>')).toBe(true);
  });

  it('leaves no unfilled @@placeholders@@', () => {
    expect(html).not.toMatch(/@@\w+@@/);
  });

  it('only contains syntactically valid inline JavaScript', () => {
    for (const code of inlineScripts(html)) {
      expect(() => new Function(code)).not.toThrow();
    }
  });
});

describe('text effect options', () => {
  const e = BY_ID.effect;
  it.each(['char', 'word', 'line'])('builds for split=%s with every preset', (per) => {
    for (const preset of ['fade', 'blur', 'fade-in-blur', 'scale', 'slide']) {
      const html = e.code(per, preset);
      expect(html).toContain('__TEXT__');
      inlineScripts(html).forEach((c) => expect(() => new Function(c)).not.toThrow());
    }
  });
});

describe('component video system', async () => {
  const { getComponentVideoSource, COMPONENT_VIDEOS } = await import('../src/effects/videos.js');

  it('maps each component to its component-specific video filename', () => {
    expect(getComponentVideoSource('Split Scroll')).toContain('Split%20Scroll.mp4');
    expect(getComponentVideoSource('Micro Hover')).toContain('Micro%20Hover.mp4');
    expect(getComponentVideoSource('Draggable Mask')).toContain('Draggable%20Mask.mp4');
    expect(getComponentVideoSource('Cursor: Expand')).toContain('Expand.mp4');
  });

  it('returns null and NO fake/default video when a component is not mapped or null', () => {
    expect(getComponentVideoSource(null)).toBeNull();
    expect(getComponentVideoSource('Nonexistent Effect')).toBeNull();
  });
});

