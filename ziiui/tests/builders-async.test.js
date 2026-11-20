import { describe, it, expect } from 'vitest';
import * as B from '../src/effects/builders.js';

describe('Async builder parity', () => {
  it('templatePageAsync matches templatePage', async () => {
    const sync = B.templatePage('maskdrag');
    const async = await B.templatePageAsync('maskdrag');
    expect(async).toBe(sync);
  });

  it('splitEffectPageAsync matches (char/fade)', async () => {
    const sync = B.splitEffectPage('char', 'fade');
    const async = await B.splitEffectPageAsync('char', 'fade');
    expect(async).toBe(sync);
  });

  it('rollPageAsync matches', async () => {
    const o = { dur: '1s', ease: 'linear', from: '0', to: '1', a: 'x', b: 'y' };
    const sync = B.rollPage(o);
    const async = await B.rollPageAsync(o);
    expect(async).toBe(sync);
  });

  it('wavePageAsync matches', async () => {
    const o = { base: 1, grad: 2, z: 3, s: 4, r: 5 };
    const sync = B.wavePage(o);
    const async = await B.wavePageAsync(o);
    expect(async).toBe(sync);
  });

  it('scramblePageAsync matches', async () => {
    const sync = B.scramblePage();
    const async = await B.scramblePageAsync();
    expect(async).toBe(sync);
  });

  it('textPageAsync matches textPage', async () => {
    const css = 'body{color:red;}';
    const js = 'console.log(1);';
    const sync = B.textPage(css, js);
    const async = await B.textPageAsync(css, js);
    expect(async).toBe(sync);
  });
});
