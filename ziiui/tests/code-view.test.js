import { describe, expect, it } from 'vitest';
import { splitComponentCode } from '../src/pages/library/viewer.js';
import { BY_ID } from '../src/effects/registry.js';

import { hasTemplate, tpl } from '../src/effects/templates.js';

describe('component code tabs', () => {
  it('separates markup, stylesheets, and scripts from a standalone component', () => {
    const sections = splitComponentCode(
      '<!doctype html><html><head><link rel="stylesheet" href="theme.css"><style>.card { color: red; }</style></head>' +
      '<body><main class="card">Hello</main><script src="vendor.js"></script><script>start();</script></body></html>'
    );

    expect(sections.html).toContain('<main class="card">Hello</main>');
    expect(sections.html).not.toContain('<style');
    expect(sections.html).not.toContain('<script');
    expect(sections.html).not.toContain('theme.css');
    expect(sections.css).toContain('@import url("theme.css");');
    expect(sections.css).toContain('.card { color: red; }');
    expect(sections.js).toContain('// External script: vendor.js');
    expect(sections.js).toContain('start();');
  });

  it('correctly splits Block Reveal Animation and Reveal Menu code', () => {
    const blockSections = splitComponentCode(BY_ID.blockreveal.code());
    expect(blockSections.html).toContain('id="squareContainer"');
    expect(blockSections.html).toContain('class="menuContent"');
    expect(blockSections.css).toContain('.square');
    expect(blockSections.css).toContain('#menuBtn');
    expect(blockSections.js).toContain('initBlockReveal');
    expect(blockSections.js).toContain('gsap');

    const revealSections = splitComponentCode(BY_ID.revealmenu.code());
    expect(revealSections.html).toContain('class="hamburger"');
    expect(revealSections.html).toContain('class="menu-items"');
    expect(revealSections.css).toContain('.hamburger');
    expect(revealSections.css).toContain('morph1');
    expect(revealSections.js).toContain('initRevealMenu');
    expect(revealSections.js).toContain('paths');
  });

  it('correctly splits Image Trail code', () => {
    const trailSections = splitComponentCode(BY_ID.imagetrail.code());
    expect(trailSections.html).toContain('Image Trail');
    expect(trailSections.html).toContain('Field Notes');
    expect(trailSections.css).toContain('cursor: crosshair');
    expect(trailSections.js).toContain('showImage');
    expect(trailSections.js).toContain('gsap');
  });
});

