import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Floating AI Button Idle Animation & Interactions', () => {
  const cssPath = resolve(__dirname, '../src/styles/style.css');
  const htmlPath = resolve(__dirname, '../index.html');
  const css = readFileSync(cssPath, 'utf-8');
  const html = readFileSync(htmlPath, 'utf-8');

  it('defines coordinated continuous idle animations with 3-5s cycle and organic phase offsets', () => {
    // Check .ai-spark has 4s idle animation
    expect(css).toMatch(/\.ai-spark\s*\{[^}]*animation:\s*ai-spark-idle\s+4s\s+ease-in-out\s+infinite/);
    // Check .ai-cursor has 4s idle animation with phase offset
    expect(css).toMatch(/\.ai-cursor\s*\{[^}]*animation:\s*ai-cursor-idle\s+4s\s+ease-in-out\s+-0\.2s\s+infinite/);
    // Check .ai-spark-small has 4s idle animation with celestial phase offset
    expect(css).toMatch(/\.ai-spark-small\s*\{[^}]*animation:\s*ai-spark-small-idle\s+4s\s+ease-in-out\s+-0\.5s\s+infinite/);
  });

  it('animates four-point sparkle with rounded orbital floating movement and organic rotation/scale morphing', () => {
    const match = css.match(/@keyframes\s+ai-spark-idle\s*\{([\s\S]*?)\n\}/);
    expect(match).toBeTruthy();
    const keyframesBody = match[1];

    expect(keyframesBody).toMatch(/0%,\s*100%\s*\{\s*transform:\s*translate\(0(?:px)?,\s*0(?:px)?\)\s+rotate\(0deg\)\s+scale\(1\);/);

    // Verifies gentle circular orbit coordinates
    expect(keyframesBody).toMatch(/25%\s*\{\s*transform:\s*translate\([0-9.]+px,\s*-[0-9.]+px\)/);
    expect(keyframesBody).toMatch(/75%\s*\{\s*transform:\s*translate\(-[0-9.]+px,\s*-[0-9.]+px\)/);

    // Verifies rotation (~5-8 deg) and scale pulse (1.0 - 1.06)
    const midMatch = keyframesBody.match(/50%\s*\{\s*transform:\s*translate\([^)]+\)\s+rotate\(([0-9.]+)deg\)\s+scale\(([0-9.]+)\);/);
    expect(midMatch).toBeTruthy();
    const rotation = parseFloat(midMatch[1]);
    const scale = parseFloat(midMatch[2]);

    expect(rotation).toBeGreaterThanOrEqual(5);
    expect(rotation).toBeLessThanOrEqual(8);
    expect(scale).toBeGreaterThanOrEqual(1.0);
    expect(scale).toBeLessThanOrEqual(1.06);
  });

  it('animates smaller sparkle in a miniature rounded celestial orbit around the main sparkle', () => {
    const match = css.match(/@keyframes\s+ai-spark-small-idle\s*\{([\s\S]*?)\n\}/);
    expect(match).toBeTruthy();
    const keyframesBody = match[1];

    // Traces rounded orbit around main sparkle
    expect(keyframesBody).toMatch(/25%\s*\{\s*transform:\s*translate\(-?[0-9.]+px,\s*-?[0-9.]+px\)/);
    expect(keyframesBody).toMatch(/50%\s*\{\s*transform:\s*translate\(-?[0-9.]+px,\s*-?[0-9.]+px\)/);
    expect(keyframesBody).toMatch(/75%\s*\{\s*transform:\s*translate\(-?[0-9.]+px,\s*-?[0-9.]+px\)/);
    expect(keyframesBody).toContain('opacity: 1');
  });

  it('animates cursor gliding smoothly toward the sparkle and returning in coordinated rhythm', () => {
    const match = css.match(/@keyframes\s+ai-cursor-idle\s*\{([\s\S]*?)\n\}/);
    expect(match).toBeTruthy();
    const keyframesBody = match[1];

    expect(keyframesBody).toMatch(/0%,\s*100%\s*\{\s*transform:\s*translate\(0(?:px)?,\s*0(?:px)?\);/);
    const transMatch = keyframesBody.match(/55%\s*\{\s*transform:\s*translate\((-?[0-9.]+)px,\s*(-?[0-9.]+)px\);/);
    expect(transMatch).toBeTruthy();
    const x = Math.abs(parseFloat(transMatch[1]));
    const y = Math.abs(parseFloat(transMatch[2]));
    // Movement should be subtle and smooth toward sparkle
    expect(x).toBeGreaterThan(0.4);
    expect(x).toBeLessThan(1.5);
    expect(y).toBeGreaterThan(0.4);
    expect(y).toBeLessThan(1.5);
  });

  it('keeps button circular shape, size, and position unchanged during idle (no idle animation on .ai-fab itself)', () => {
    // Extract base .ai-fab definition before any hover/focus
    const baseFabMatch = css.match(/\.ai-fab\s*\{([^}]+)\}/);
    expect(baseFabMatch).toBeTruthy();
    const baseFabBody = baseFabMatch[1];

    // Ensure .ai-fab itself does not run an idle animation or pulse
    expect(baseFabBody).not.toMatch(/animation:/);
    expect(baseFabBody).toContain('width: 46px');
    expect(baseFabBody).toContain('height: 46px');
    expect(baseFabBody).toContain('border-radius: 9999px');
  });

  it('cancels/pauses idle animation smoothly and applies expressive transforms on hover and focus', () => {
    // Hover/focus on sparkle
    expect(css).toMatch(/\.ai-fab:(?:hover|focus-visible)[^{]*\.ai-spark[^{]*\{[^}]*animation:\s*none;[^}]*transform:\s*rotate\(18deg\)\s+scale\(1\.1\);/);
    // Hover/focus on cursor
    expect(css).toMatch(/\.ai-fab:(?:hover|focus-visible)[^{]*\.ai-cursor[^{]*\{[^}]*animation:\s*none;[^}]*transform:\s*translate\(-1\.5px,\s*-1\.5px\);/);
    // Button expansion into rounded pill
    expect(css).toMatch(/\.ai-fab:hover,\s*\.ai-fab:focus-visible\s*\{[^}]*width:\s*144px;/);
    // Label reveal
    expect(css).toMatch(/\.ai-fab:hover\s+\.ai-fab-label,\s*\.ai-fab:focus-visible\s+\.ai-fab-label\s*\{[^}]*max-width:\s*95px;\s*opacity:\s*1;/);
  });

  it('stops idle animation when panel is open', () => {
    expect(css).toMatch(/\.ai-fab\.is-open\s+\.ai-spark\s*\{[^}]*animation:\s*none;[^}]*transform:\s*rotate\(45deg\);/);
    expect(css).toMatch(/\.ai-fab\.is-open\s+\.ai-cursor\s*\{[^}]*animation:\s*none;/);
  });

  it('respects prefers-reduced-motion by disabling idle animations and transforms', () => {
    // Check reduced motion block for ai-fab elements
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.ai-spark[^}]*animation:\s*none\s*!important/s);
  });

  it('retains keyboard accessibility and standard button markup in index.html', () => {
    expect(html).toContain('id="aiFab"');
    expect(html).toContain('class="ai-fab"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Edit current component with AI"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="aiPanel"');
    expect(html).toContain('class="ai-spark"');
    expect(html).toContain('class="ai-cursor"');
    expect(html).toContain('class="ai-fab-label"');
  });
});
