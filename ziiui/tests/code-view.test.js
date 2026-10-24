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

describe('component dependency analysis', () => {
  it('detects GSAP, ScrollTrigger, Lenis, Google Fonts, and RemixIcon in splitsection', async () => {
    const { getComponentDependencies } = await import('../src/pages/library/viewer.js');
    const deps = getComponentDependencies(BY_ID.splitsection.code());
    const ids = deps.map((d) => d.id);
    expect(ids).toContain('gsap');
    expect(ids).toContain('scrolltrigger');
    expect(ids).toContain('lenis');
    expect(ids).toContain('fonts');
    expect(ids).toContain('remixicon');
  });

  it('detects Three.js (WebGL) in noisypixel and mirror', async () => {
    const { getComponentDependencies } = await import('../src/pages/library/viewer.js');
    const noisyDeps = getComponentDependencies(BY_ID.noisypixel.code());
    expect(noisyDeps.some((d) => d.id === 'three')).toBe(true);

    const mirrorDeps = getComponentDependencies(BY_ID.mirror.code());
    expect(mirrorDeps.some((d) => d.id === 'three')).toBe(true);
  });

  it('returns empty dependencies list for vanilla components without external scripts or icon fonts', async () => {
    const { getComponentDependencies } = await import('../src/pages/library/viewer.js');
    const maskdragDeps = getComponentDependencies(BY_ID.maskdrag.code());
    expect(maskdragDeps).toEqual([]);
  });

  it('renders dependency chips into previewDeps container and displays pure badge for zero-dependency components', async () => {
    const { renderDependencies } = await import('../src/pages/library/viewer.js');
    document.body.innerHTML = '<div id="previewDeps"></div>';

    renderDependencies(BY_ID.splitsection.code());
    const depsContainer = document.getElementById('previewDeps');
    expect(depsContainer.innerHTML).toContain('dep-chip');
    expect(depsContainer.textContent).toContain('GSAP');
    expect(depsContainer.textContent).toContain('ScrollTrigger');

    renderDependencies(BY_ID.maskdrag.code());
    expect(depsContainer.innerHTML).toContain('dep-chip-pure');
    expect(depsContainer.textContent).toContain('Vanilla (Zero dependencies)');
  });

  it('toggles fullscreen classes and button labels via updateFullscreenUI', async () => {
    const { updateFullscreenUI, isFullscreen } = await import('../src/pages/library/viewer.js');
    document.body.innerHTML = `
      <div class="stage" id="previewStage">
        <button id="stageExitFs" hidden></button>
      </div>
      <button id="previewFullscreen">
        <i id="previewFsIcon"></i>
        <span id="previewFsLabel">Fullscreen</span>
      </button>
    `;

    const stage = document.getElementById('previewStage');
    const exitBtn = document.getElementById('stageExitFs');
    const fsLabel = document.getElementById('previewFsLabel');
    const fsIcon = document.getElementById('previewFsIcon');

    updateFullscreenUI(true);
    expect(stage.classList.contains('is-fullscreen')).toBe(true);
    expect(exitBtn.hidden).toBe(false);
    expect(fsLabel.textContent).toBe('Exit');
    expect(fsIcon.className).toBe('ri-fullscreen-exit-line');
    expect(isFullscreen()).toBe(true);

    updateFullscreenUI(false);
    expect(stage.classList.contains('is-fullscreen')).toBe(false);
    expect(exitBtn.hidden).toBe(true);
    expect(fsLabel.textContent).toBe('Fullscreen');
    expect(fsIcon.className).toBe('ri-fullscreen-line');
    expect(isFullscreen()).toBe(false);
  });
});

