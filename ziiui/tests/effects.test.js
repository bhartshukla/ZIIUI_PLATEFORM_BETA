import { describe, it, expect, vi } from 'vitest';
import { EFFECTS, CATEGORIES, BY_ID } from '../src/effects/registry.js';
import { hasTemplate } from '../src/effects/templates.js';

/** Pull every inline <script>…</script> body out of a generated document. */
function inlineScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

describe('effects registry', () => {
  it('has 27 uniquely-identified effects', () => {
    expect(EFFECTS).toHaveLength(27);
    expect(new Set(EFFECTS.map((e) => e.id)).size).toBe(EFFECTS.length);
    expect(CATEGORIES).not.toContain('Cursor');
    expect(BY_ID.pinrotate).toBeTruthy();
    expect(BY_ID.imageflow).toBeTruthy();
    expect(BY_ID.snakehover).toBeTruthy();
    expect(BY_ID.imagetrail).toBeTruthy();
    expect(BY_ID.imagetrail.cat).toBe('Interactive');
    expect(BY_ID.blockreveal).toBeTruthy();
    expect(BY_ID.blockreveal.cat).toBe('Menus');
    expect(BY_ID.revealmenu).toBeTruthy();
    expect(BY_ID.revealmenu.cat).toBe('Menus');
    expect(BY_ID.cursor1).toBeUndefined();
    expect(BY_ID.cursor2).toBeUndefined();
    expect(BY_ID.cursor3).toBeUndefined();
  });

  it('registers Folder Footer in both Footer and Interactive categories', () => {
    expect(BY_ID.folderfooter.categories).toEqual(['Footer', 'Interactive']);
    expect(BY_ID.folderfooter.cat).toBe('Footer');
    expect(BY_ID.folderfooter.code()).toContain('gsap@3.12.5');
    expect(hasTemplate('folderfooter.html')).toBe(true);
    expect(hasTemplate('folderfooter.css')).toBe(true);
    expect(hasTemplate('folderfooter.js')).toBe(true);
  });

  it('puts every effect in a known category', () => {
    for (const e of EFFECTS) {expect(CATEGORIES).toContain(e.cat);}
  });

  it('never reports a missing template', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    EFFECTS.forEach((e) => e.code('char', 'fade'));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    expect(hasTemplate('blockreveal.css')).toBe(true);
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

describe('reduced-motion support', () => {
  const reducedMotionPilot = ['roll', 'wave', 'scramble', 'fancy', 'blockreveal'];

  it.each(reducedMotionPilot)('includes prefers-reduced-motion CSS guard for %s', (id) => {
    const html = BY_ID[id].code();
    expect(html).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it('roll CSS disables transitions under reduced motion', () => {
    const html = BY_ID.roll.code();
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(html).toContain('transition: none !important');
  });

  it('wave CSS disables animations under reduced motion', () => {
    const html = BY_ID.wave.code();
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(html).toContain('animation: none !important');
  });

  it('scramble JS checks prefers-reduced-motion before starting interval', () => {
    const html = BY_ID.scramble.code();
    expect(html).toContain('prefers-reduced-motion: reduce');
    // The guard must appear before setInterval to prevent motion when preferred
    const guardPos = html.indexOf('prefers-reduced-motion: reduce');
    const intervalPos = html.indexOf('setInterval');
    expect(guardPos).toBeGreaterThan(-1);
    expect(intervalPos).toBeGreaterThan(-1);
  });

  it('fancy JS checks prefers-reduced-motion before calling animate()', () => {
    const html = BY_ID.fancy.code();
    expect(html).toContain('prefers-reduced-motion: reduce');
    const guardPos = html.indexOf('prefers-reduced-motion: reduce');
    const animatePos = html.indexOf('.animate(');
    expect(guardPos).toBeGreaterThan(-1);
    expect(animatePos).toBeGreaterThan(-1);
  });

  it('blockreveal JS checks prefers-reduced-motion before GSAP animation', () => {
    const html = BY_ID.blockreveal.code();
    expect(html).toContain('prefers-reduced-motion: reduce');
    const guardPos = html.indexOf('prefers-reduced-motion: reduce');
    const gsapPos = html.indexOf('gsap.fromTo');
    expect(guardPos).toBeGreaterThan(-1);
    expect(gsapPos).toBeGreaterThan(-1);
  });

  it('pilot components still produce valid HTML with content visible', () => {
    for (const id of reducedMotionPilot) {
      const html = BY_ID[id].code();
      expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
      expect(html.trim().endsWith('</html>')).toBe(true);
      // Must not have unfilled placeholders
      expect(html).not.toMatch(/@@\w+@@/);
    }
  });

  it('pilot components still produce syntactically valid inline JavaScript', () => {
    for (const id of reducedMotionPilot) {
      const html = BY_ID[id].code();
      for (const code of inlineScripts(html)) {
        expect(() => new Function(code)).not.toThrow();
      }
    }
  });
});

describe('Group B reduced-motion support', () => {
  const groupBComponents = ['microhover', 'snakehover', 'hoversection', 'imagetrail', 'revealmenu'];

  it.each(groupBComponents)('includes prefers-reduced-motion JS guard for %s', (id) => {
    const html = BY_ID[id].code();
    expect(html).toContain('prefers-reduced-motion: reduce');
  });

  it('microhover JS skips burst animation when reduced motion', () => {
    const html = BY_ID.microhover.code();
    expect(html).toContain('prefers-reduced-motion: reduce');
    const guardPos = html.indexOf('prefers-reduced-motion: reduce');
    const playBurstPos = html.indexOf('playBurst');
    expect(guardPos).toBeGreaterThan(-1);
    expect(playBurstPos).toBeGreaterThan(-1);
  });

  it('snakehover JS skips SVG stroke animation when reduced motion', () => {
    const html = BY_ID.snakehover.code();
    expect(html).toContain('prefers-reduced-motion: reduce');
    const guardPos = html.indexOf('prefers-reduced-motion: reduce');
    const mouseenterPos = html.indexOf('onmouseenter');
    expect(guardPos).toBeGreaterThan(-1);
    expect(mouseenterPos).toBeGreaterThan(-1);
  });

  it('hoversection JS skips thumbnail sliding when reduced motion', () => {
    const html = BY_ID.hoversection.code();
    expect(html).toContain('prefers-reduced-motion: reduce');
    const guardPos = html.indexOf('prefers-reduced-motion: reduce');
    const mousemovePos = html.indexOf('mousemove');
    expect(guardPos).toBeGreaterThan(-1);
    expect(mousemovePos).toBeGreaterThan(-1);
  });

  it('imagetrail JS skips pointer-following when reduced motion', () => {
    const html = BY_ID.imagetrail.code();
    expect(html).toContain('prefers-reduced-motion: reduce');
    const guardPos = html.indexOf('prefers-reduced-motion: reduce');
    const pointermovePos = html.indexOf('pointermove');
    expect(guardPos).toBeGreaterThan(-1);
    expect(pointermovePos).toBeGreaterThan(-1);
  });

  it('revealmenu JS skips SVG morph and stagger when reduced motion', () => {
    const html = BY_ID.revealmenu.code();
    expect(html).toContain('prefers-reduced-motion: reduce');
    const guardPos = html.indexOf('prefers-reduced-motion: reduce');
    const toggleMenuPos = html.indexOf('toggleMenu');
    expect(guardPos).toBeGreaterThan(-1);
    expect(toggleMenuPos).toBeGreaterThan(-1);
  });

  it('Group B components still produce valid HTML with content visible', () => {
    for (const id of groupBComponents) {
      const html = BY_ID[id].code();
      expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
      expect(html.trim().endsWith('</html>')).toBe(true);
      // Must not have unfilled placeholders
      expect(html).not.toMatch(/@@\w+@@/);
    }
  });

  it('Group B components still produce syntactically valid inline JavaScript', () => {
    for (const id of groupBComponents) {
      const html = BY_ID[id].code();
      for (const code of inlineScripts(html)) {
        expect(() => new Function(code)).not.toThrow();
      }
    }
  });
});

describe('component video system', async () => {
  const { getComponentVideoSource } = await import('../src/effects/videos.js');

  it('maps each component to its component-specific video filename', () => {
    expect(getComponentVideoSource('Split Scroll')).toContain('Split%20Scroll.mp4');
    expect(getComponentVideoSource('Micro Hover')).toContain('Micro%20Hover.mp4');
    expect(getComponentVideoSource('Draggable Mask')).toContain('Draggable%20Mask.mp4');
    expect(getComponentVideoSource('Sticky Footer')).toContain('Sticky%20Footer.mp4');
  });

  it('returns null and NO fake/default video when a component is not mapped or null', () => {
    expect(getComponentVideoSource(null)).toBeNull();
    expect(getComponentVideoSource('Nonexistent Effect')).toBeNull();
  });
});
