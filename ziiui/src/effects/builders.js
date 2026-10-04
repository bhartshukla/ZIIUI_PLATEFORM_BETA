/*
 * Page builders: turn template fragments into complete, standalone HTML
 * documents (the code users copy and the code shown in the preview iframe).
 */
import { esc, indent } from '../lib/dom.js';
import { tpl, fill } from './templates.js';

/* ---------- <head> helpers ---------- */
export const scriptSrc = (src) => `<script src="${src}"></script>`;
export const linkHref = (href) => `<link rel="stylesheet" href="${href}">`;
export const preconnect = (href, cross) =>
  `<link rel="preconnect" href="${href}"${cross ? ' crossorigin' : ''}>`;

/** The standard Google Fonts preconnect pair. */
export const fontPreconnect = () => [
  preconnect('https://fonts.googleapis.com'),
  preconnect('https://fonts.gstatic.com', true)
];

/* ---------- document ---------- */
export function buildDoc(opts = {}) {
  const parts = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + esc(opts.title || 'ziiui — Effect') + '</title>'
  ];
  if (opts.head && opts.head.length) parts.push(...opts.head);
  parts.push('<style>', indent(opts.css || ''), '</style>', '</head>', '<body>', '', opts.body || '');
  if (opts.js) parts.push('', '<script>', indent(opts.js), '</script>');
  parts.push('', '</body>', '</html>');
  return parts.join('\n');
}

/* ---------- page shapes ---------- */
export function textPage(css, js) {
  return buildDoc({
    title: 'ziiui — Text Effect',
    css: tpl('base.css') + '\n' + css,
    body: '<p id="t">__TEXT__</p>',
    js: js === null ? null : fill(tpl('wrap.js'), { BODY: indent(js) })
  });
}

export function cursorPage(css, bodyHtml, js) {
  return buildDoc({
    title: 'ziiui — Cursor Effect',
    css: tpl('base.css') + '\n' + tpl('cursor-shared.css') + '\n' + css,
    body: bodyHtml,
    js
  });
}

export function fullPage(css, bodyHtml, js, head) {
  return buildDoc({ title: 'ziiui — Effect', head: head || [], css, body: bodyHtml, js });
}

/** A full page whose css/html/js live in templates/<name>.{css,html,js}. */
export function templatePage(name, head) {
  return fullPage(tpl(name + '.css'), tpl(name + '.html'), tpl(name + '.js'), head);
}

/* ---------- text-effect building blocks ---------- */
export const graphemesJs = () => tpl('graphemes.js');
export const buildJs = () => graphemesJs() + '\n\n' + tpl('build.js');

export const STAGGER = { char: 0.03, word: 0.05, line: 0.1 };

export const PRESETS = {
  'fade': { h: 'opacity: 0;', s: 'opacity: 1;', t: 'opacity .5s ease' },
  'blur': { h: 'opacity: 0; filter: blur(12px);', s: 'opacity: 1; filter: blur(0);', t: 'opacity .5s ease, filter .5s ease' },
  'fade-in-blur': { h: 'opacity: 0; filter: blur(12px); transform: translateY(20px);', s: 'opacity: 1; filter: blur(0); transform: none;', t: 'opacity .5s ease, filter .5s ease, transform .5s ease' },
  'scale': { h: 'opacity: 0; transform: scale(0);', s: 'opacity: 1; transform: scale(1);', t: 'opacity .5s ease, transform .5s ease' },
  'slide': { h: 'opacity: 0; transform: translateY(20px);', s: 'opacity: 1; transform: none;', t: 'opacity .5s ease, transform .5s ease' }
};

function splitJs(per) {
  if (per === 'char') return buildJs() + '\n\n' + tpl('split-char.js');
  if (per === 'word') return tpl('split-word.js');
  return tpl('split-line.js');
}

export function splitEffectPage(per, preset) {
  const p = PRESETS[preset] || PRESETS.fade;
  const css = fill(tpl('effect.css'), {
    WCSS: per === 'char' ? tpl('wcss.css') + '\n' : '',
    DISPLAY: per === 'line' ? 'block' : 'inline-block',
    MINH: per === 'line' ? ' min-height: 1.2em;' : '',
    HIDDEN: p.h, TRANS: p.t, STAG: STAGGER[per] || STAGGER.char, SHOWN: p.s
  });
  return textPage(css, splitJs(per) + '\n' + tpl('tail.js'));
}

export function rollPage(o) {
  const css = fill(tpl('roll.css'), { WCSS: tpl('wcss.css'), DUR: o.dur, EASE: o.ease, FROM: o.from, TO: o.to });
  const js = buildJs() + '\n\n' + fill(tpl('roll.js'), { A: o.a, B: o.b });
  return textPage(css, js);
}

export function wavePage(o) {
  const css = fill(tpl('wave.css'), { WCSS: tpl('wcss.css'), BASE: o.base });
  const js = buildJs() + '\n\n' + fill(tpl('wave.js'), { BASE: o.base, GRAD: o.grad, Z: o.z, S: o.s, R: o.r });
  return textPage(css, js);
}

export function scramblePage() {
  return textPage(tpl('scramble.css'), graphemesJs() + '\n\n' + tpl('scramble.js'));
}
