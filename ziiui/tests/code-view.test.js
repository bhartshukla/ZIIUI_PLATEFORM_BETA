import { describe, expect, it } from 'vitest';
import { splitComponentCode } from '../src/pages/library/viewer.js';

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
});
