/* =============================================================
   ziiui — app.js
   Main application logic (component library + AI editor).
   ============================================================= */
'use strict';
(function () {

  const $ = function (id) { return document.getElementById(id); };

  const esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const norm = function (s) { return String(s == null ? '' : s).replace(/\r\n?/g, '\n'); };
  const ind = function (s) {
    return norm(s).split('\n').map(function (l) { return l ? '  ' + l : l; }).join('\n');
  };

  let lastStatusTimer = null;
  function say(msg) {
    const el = $('status'); if (!el) return;
    el.textContent = '';
    clearTimeout(lastStatusTimer);
    lastStatusTimer = setTimeout(function () { el.textContent = msg; }, 30);
  }
  function report(err, ctx) {
    const msg = (err && err.message) ? err.message : String(err);
    try { console.error('[ziiui' + (ctx ? ':' + ctx : '') + ']', err); } catch (_) { }
    say('Something went wrong: ' + msg);
  }
  function guard(fn, ctx) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (err) { report(err, ctx || fn.name || 'handler'); }
    };
  }

  window.addEventListener('error', function (e) { report(e.error || e.message, 'window'); });
  window.addEventListener('unhandledrejection', function (e) { report(e.reason, 'promise'); });
  window.addEventListener('message', function (e) {
    const d = e.data;
    if (d && d.__ziiui) {
      try { console.error('[ziiui:preview]', d.message); } catch (_) { }
      say('Preview error: ' + d.message);
    }
  });

  const MAX = 3000, DEBOUNCE = 250, PLACEHOLDER = 'Your text here';
  function tpl(id) {
    const el = $(id);
    if (!el) { console.warn('[ziiui] missing template:', id); return ''; }
    return norm(el.textContent).replace(/^\n/, '').replace(/\s+$/, '');
  }
  function fill(s, map) {
    return String(s || '').replace(/@@(\w+)@@/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : m;
    });
  }

  const LT = String.fromCharCode(60);
  const GT = String.fromCharCode(62);
  const SLASH = String.fromCharCode(47);
  const TAG = function (n) { return LT + n + GT; };
  const END = function (n) { return LT + SLASH + n + GT; };
  const SCRIPT_SRC = function (src) { return LT + 'script src="' + src + '"' + GT + END('script'); };
  const LINK_HREF = function (href, extra) { return LT + 'link rel="stylesheet" href="' + href + '"' + (extra || '') + GT; };
  const PRECONNECT = function (href, cross) { return LT + 'link rel="preconnect" href="' + href + '"' + (cross ? ' crossorigin' : '') + GT; };

  function buildDoc(o) {
    const opts = o || {};
    const parts = [
      LT + '!DOCTYPE html' + GT,
      LT + 'html lang="en"' + GT,
      LT + 'head' + GT,
      LT + 'meta charset="UTF-8"' + GT,
      LT + 'meta name="viewport" content="width=device-width, initial-scale=1"' + GT,
      TAG('title') + esc(opts.title || 'ziiui — Effect') + END('title')
    ];
    if (opts.head && opts.head.length) parts.push.apply(parts, opts.head);
    parts.push(TAG('style'), ind(opts.css || ''), END('style'), END('head'), TAG('body'), '', opts.body || '');
    if (opts.js) parts.push('', TAG('script'), ind(opts.js), END('script'));
    parts.push('', END('body'), END('html'));
    return parts.join('\n');
  }

  function textPage(css, js) {
    return buildDoc({
      title: 'ziiui — Text Effect',
      css: tpl('t-base-css') + '\n' + css,
      body: LT + 'p id="t"' + GT + '__TEXT__' + END('p'),
      js: js === null ? null : fill(tpl('t-wrap'), { BODY: ind(js) })
    });
  }
  function cursorPage(css, bodyHtml, js) {
    return buildDoc({
      title: 'ziiui — Cursor Effect',
      css: tpl('t-base-css') + '\n' + tpl('t-cursor-shared-css') + '\n' + css,
      body: bodyHtml, js: js
    });
  }
  function fullPage(css, bodyHtml, js, head) {
    return buildDoc({ title: 'ziiui — Effect', head: head || [], css: css, body: bodyHtml, js: js });
  }
  function graphemesJs() { return tpl('t-graphemes'); }
  function buildJs() { return graphemesJs() + '\n\n' + tpl('t-build'); }

  const STAG = { char: .03, word: .05, line: .1 };
  const PRE = {
    'fade': { h: 'opacity: 0;', s: 'opacity: 1;', t: 'opacity .5s ease' },
    'blur': { h: 'opacity: 0; filter: blur(12px);', s: 'opacity: 1; filter: blur(0);', t: 'opacity .5s ease, filter .5s ease' },
    'fade-in-blur': { h: 'opacity: 0; filter: blur(12px); transform: translateY(20px);', s: 'opacity: 1; filter: blur(0); transform: none;', t: 'opacity .5s ease, filter .5s ease, transform .5s ease' },
    'scale': { h: 'opacity: 0; transform: scale(0);', s: 'opacity: 1; transform: scale(1);', t: 'opacity .5s ease, transform .5s ease' },
    'slide': { h: 'opacity: 0; transform: translateY(20px);', s: 'opacity: 1; transform: none;', t: 'opacity .5s ease, transform .5s ease' }
  };
  function splitJs(per) {
    if (per === 'char') return buildJs() + '\n\n' + tpl('t-split-char');
    if (per === 'word') return tpl('t-split-word');
    return tpl('t-split-line');
  }
  function rollPage(o) {
    const css = fill(tpl('t-roll-css'), { WCSS: tpl('t-wcss'), DUR: o.dur, EASE: o.ease, FROM: o.from, TO: o.to });
    const js = buildJs() + '\n\n' + fill(tpl('t-roll-js'), { A: o.a, B: o.b });
    return textPage(css, js);
  }
  function wavePage(o) {
    const css = fill(tpl('t-wave-css'), { WCSS: tpl('t-wcss'), BASE: o.base });
    const js = buildJs() + '\n\n' + fill(tpl('t-wave-js'), { BASE: o.base, GRAD: o.grad, Z: o.z, S: o.s, R: o.r });
    return textPage(css, js);
  }

  const EFFECTS = [
    { id: 'splitsection', name: 'Split Scroll', cat: 'Web', field: 'none', previewSize: 'large', note: 'Cards split apart and flip on scroll', text: '',
      code: function () { return fullPage(tpl('t-splitsection-css'), tpl('t-splitsection-html'), tpl('t-splitsection-js'), [
        PRECONNECT('https://fonts.googleapis.com'), PRECONNECT('https://fonts.gstatic.com', true),
        LINK_HREF('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;1,9..40,300&display=swap'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js'),
        SCRIPT_SRC('https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js')
      ]); } },
    { id: 'maskdrag', name: 'Draggable Mask', cat: 'Interactive', field: 'none', previewSize: 'large', note: 'Drag canvas windows over a video', text: '',
      code: function () { return fullPage(tpl('t-maskdrag-css'), tpl('t-maskdrag-html'), tpl('t-maskdrag-js')); } },
    { id: 'microhover', name: 'Micro Hover', cat: 'Interactive', field: 'none', previewSize: 'large', note: 'Photo burst on keyword hover', text: '',
      code: function () { return fullPage(tpl('t-microhover-css'), tpl('t-microhover-html'), tpl('t-microhover-js'), [
        PRECONNECT('https://fonts.googleapis.com'), PRECONNECT('https://fonts.gstatic.com', true),
        LINK_HREF('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500&family=DM+Serif+Display&display=swap'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js')
      ]); } },
    { id: 'hoversection', name: 'Hover Section', cat: 'Interactive', field: 'none', previewSize: 'large', note: 'Project list with floating thumbnail', text: '',
      code: function () { return fullPage(tpl('t-hoversection-css'), tpl('t-hoversection-html'), tpl('t-hoversection-js'), [
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js')
      ]); } },
    { id: 'footer1', name: 'Sticky Footer', cat: 'Footer', field: 'none', previewSize: 'large', note: 'Sticky footer with smooth scroll reveal', text: '',
      code: function () { return fullPage(tpl('t-footer1-css'), tpl('t-footer1-html'), tpl('t-footer1-js'), [
        SCRIPT_SRC('https://cdn.jsdelivr.net/gh/studio-freight/lenis@1.0.29/bundled/lenis.min.js')
      ]); } },
    { id: 'footer2', name: 'Editorial Footer', cat: 'Footer', field: 'none', previewSize: 'large', note: 'Split text animated footer with magnetic links', text: '',
      code: function () { return fullPage(tpl('t-footer2-css'), tpl('t-footer2-html'), tpl('t-footer2-js'), [
        LINK_HREF('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js')
      ]); } },
    { id: 'effect', name: 'Text Effect', note: 'Split by char, word or line', previewSize: 'compact', text: 'ziiui — creative interfaces with motion-primitives', opts: true,
      code: function (per, pre) {
        const p = PRE[pre] || PRE.fade;
        const css = fill(tpl('t-effect-css'), {
          WCSS: per === 'char' ? tpl('t-wcss') + '\n' : '',
          DISPLAY: per === 'line' ? 'block' : 'inline-block',
          MINH: per === 'line' ? ' min-height: 1.2em;' : '',
          HIDDEN: p.h, TRANS: p.t, STAG: STAG[per] || STAG.char, SHOWN: p.s
        });
        return textPage(css, splitJs(per) + '\n' + tpl('t-tail'));
      } },
    { id: 'fancy', name: 'Custom Variants', note: 'Random spring, rotation, colour', previewSize: 'compact', text: 'ziiui — creative web effects',
      code: function () { return textPage(tpl('t-fancy-css'), tpl('t-fancy-js')); } },
    { id: 'roll', name: 'Text Roll', note: 'Letters roll up in sequence', previewSize: 'compact', text: 'ziiui motion',
      code: function () { return rollPage({ dur: .5, ease: 'cubic-bezier(.4,0,.2,1)', from: '100%', to: '-100%', a: .1, b: .2 }); } },
    { id: 'roll2', name: 'Text Roll (custom)', note: 'Rolls down, custom easing', previewSize: 'compact', text: 'ziiui digital',
      code: function () { return rollPage({ dur: .3, ease: 'cubic-bezier(.175,.885,.32,1.1)', from: '-100%', to: '100%', a: .05, b: .05 }); } },
    { id: 'scramble', name: 'Text Scramble', note: 'Random glyphs resolve to text', previewSize: 'compact', text: 'ziiui motion',
      code: function () { return textPage(tpl('t-scramble-css'), graphemesJs() + '\n\n' + tpl('t-scramble-js')); } },
    { id: 'shimmer', name: 'Text Shimmer', note: 'Light sweep across text', previewSize: 'compact', text: 'ziiui — modern web',
      code: function () { return textPage(tpl('t-shimmer-css'), null); } },
    { id: 'wave', name: 'Shimmer Wave', note: '3D wave through each letter', previewSize: 'compact', text: 'ziiui creative',
      code: function () { return wavePage({ base: '#71717a', grad: '#ffffff', z: 10, s: 1.1, r: 10 }); } },
    { id: 'wave2', name: 'Shimmer Wave (colour)', note: 'Blue wave, custom depth', previewSize: 'compact', text: 'ziiui interactive web',
      code: function () { return wavePage({ base: '#0D74CE', grad: '#5EB1EF', z: 1, s: 1.1, r: 20 }); } },
    { id: 'cursor1', name: 'Cursor: Expand', note: 'Custom cursor expands over an image', previewSize: 'compact', text: 'Explore', opts: false,
      code: function () { return cursorPage(tpl('t-cursor1-css'), tpl('t-cursor1-html'), tpl('t-cursor1-js')); } },
    { id: 'cursor2', name: 'Cursor: Icon Label', note: 'Pointer icon with a trailing tag', previewSize: 'compact', text: 'ziiui creative web', opts: false,
      code: function () { return cursorPage(tpl('t-cursor2-css'), tpl('t-cursor2-html'), tpl('t-cursor2-js')); } },
    { id: 'cursor3', name: 'Cursor: Image Reveal', note: 'Photo preview follows the pointer', previewSize: 'compact', text: 'ziiui — digital motion design', opts: false,
      code: function () { return cursorPage(tpl('t-cursor3-css'), tpl('t-cursor3-html'), tpl('t-cursor3-js')); } },
    { id: 'listreveal', name: 'List Reveal', cat: 'Scroll', field: 'none', previewSize: 'large', note: 'Pinned list with image preview', text: '',
      code: function () { return fullPage(tpl('t-list-css'), tpl('t-list-html'), tpl('t-list-js'), [
        LINK_HREF('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap'),
        SCRIPT_SRC('https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js')
      ]); } },
    { id: 'scrolldown', name: 'Scroll Stand', cat: 'Scroll', field: 'none', previewSize: 'large', note: '3D cards rise on scroll', text: '',
      code: function () { return fullPage(tpl('t-scrolldown-css'), tpl('t-scrolldown-html'), tpl('t-scrolldown-js'), [
        PRECONNECT('https://fonts.googleapis.com'), PRECONNECT('https://fonts.gstatic.com', true),
        LINK_HREF('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap'),
        SCRIPT_SRC('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js'),
        SCRIPT_SRC('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js'),
        SCRIPT_SRC('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js'),
        SCRIPT_SRC('https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js')
      ]); } },
    { id: 'scrollmask', name: 'Scrolling Mask', cat: 'Scroll', field: 'none', previewSize: 'large', note: 'Video revealed through scrolling text', text: '',
      code: function () { return fullPage(tpl('t-scrollmask-css'), tpl('t-scrollmask-html'), tpl('t-scrollmask-js'), [
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js')
      ]); } },
    { id: 'clipreveal', name: 'Clip Path Reveal', cat: 'Scroll', field: 'none', previewSize: 'large', note: 'Full-screen panels reveal on scroll', text: '',
      code: function () { return fullPage(tpl('t-clipreveal-css'), tpl('t-clipreveal-html'), tpl('t-clipreveal-js'), [
        PRECONNECT('https://fonts.googleapis.com'), PRECONNECT('https://fonts.gstatic.com', true),
        LINK_HREF('https://fonts.googleapis.com/css2?family=Cormorant+Unicase:wght@300;400;500;600;700&family=Outfit:wght@200;300;400&family=DM+Mono:wght@300&display=swap'),
        SCRIPT_SRC('https://unpkg.com/lenis@1.1.13/dist/lenis.min.js'),
        SCRIPT_SRC('https://unpkg.com/gsap@3.12.5/dist/gsap.min.js'),
        SCRIPT_SRC('https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js')
      ]); } },
    { id: 'noisypixel', name: 'Noisy Pixel', cat: 'Shader', field: 'none', previewSize: 'large', note: 'WebGL pixel dissolve reveal', text: '',
      code: function () { return fullPage(tpl('t-noisy-css'), tpl('t-noisy-html'), tpl('t-noisy-js'), [
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'),
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js')
      ]); } },
    { id: 'mirror', name: 'Mirror Effect', cat: 'Shader', field: 'none', previewSize: 'large', note: 'Sobel-edge dissolve between two images', text: '',
      code: function () { return fullPage(tpl('t-mirror-css'), tpl('t-mirror-html'), tpl('t-mirror-js'), [
        SCRIPT_SRC('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      ]); } }
  ];

  const CATS = ['Web', 'Interactive', 'Scroll', 'Shader', 'Footer', 'Text', 'Cursor'];
  const FIELD = { cursor1: 'Cursor label', cursor2: 'Cursor tag', cursor3: 'Caption text' };
  EFFECTS.forEach(function (e) {
    if (!e.cat) e.cat = e.id.indexOf('cursor') === 0 ? 'Cursor' : 'Text';
    if (!e.previewSize) e.previewSize = 'compact';
  });
  const BY_ID = {};
  EFFECTS.forEach(function (e) { BY_ID[e.id] = e; });

  let cur = EFFECTS[0];
  let html = '';
  let buildTimer = null;
  let nonce = 0;
  let dirty = false;
  let copyBusy = false;
  let copyReset = null;
  let previewObjectUrl = null;
  let aiPreviewObjectUrl = null;

  const DEBUG_HOOK =
    TAG('script') +
    'window.addEventListener("error",function(e){try{parent.postMessage({__ziiui:1,message:String((e&&e.message)||e)},"*");}catch(_){}});' +
    'window.addEventListener("unhandledrejection",function(e){try{parent.postMessage({__ziiui:1,message:"Promise: "+String((e&&e.reason)||e)},"*");}catch(_){}});' +
    END('script');

  function injectDebug(code) {
    const src = String(code || '');
    const marker = LT + 'head' + GT;
    const i = src.indexOf(marker);
    if (i === -1) return DEBUG_HOOK + '\n' + src;
    const at = i + marker.length;
    return src.slice(0, at) + '\n' + DEBUG_HOOK + src.slice(at);
  }

  function setFrameHTML(frame, source, kind) {
    if (!frame) return;
    const isAI = kind === 'ai';
    const old = isAI ? aiPreviewObjectUrl : previewObjectUrl;
    if (old) { try { URL.revokeObjectURL(old); } catch (_) { } }
    let url;
    try {
      const blob = new Blob([String(source == null ? '' : source)], { type: 'text/html;charset=utf-8' });
      url = URL.createObjectURL(blob);
    } catch (err) { report(err, 'preview'); return; }
    if (isAI) aiPreviewObjectUrl = url; else previewObjectUrl = url;
    frame.src = url;
  }

  function errorDoc(title, message) {
    return buildDoc({
      title: 'ziiui — ' + title,
      css: 'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1115;color:#eceef2;font-family:system-ui,sans-serif;text-align:center;padding:2rem}h1{font-size:1.05rem;margin:0 0 .6rem;font-weight:700}code{display:block;color:#ff8a8a;font-size:.85rem;white-space:pre-wrap;word-break:break-word}',
      body: LT + 'div' + GT + LT + 'h1' + GT + esc(title) + END('h1') + LT + 'code' + GT + esc(message) + END('code') + END('div')
    });
  }

  function updatePreviewHeight(effect) {
    const frame = $('frame'); if (!frame) return;
    frame.classList.remove('preview-compact', 'preview-large');
    frame.classList.add(effect.previewSize === 'large' ? 'preview-large' : 'preview-compact');
  }

  function play(code) {
    const src = code || html;
    if (!src) return;
    nonce++;
    setFrameHTML($('frame'), injectDebug(src + '\n' + LT + '!-- ' + nonce + ' --' + GT), 'preview');
  }

  function updateHint(empty, trimmed) {
    const h = $('hint'); if (!h) return;
    const ta = $('text');
    const n = ta ? ta.value.length : 0;
    h.classList.toggle('warn', !!trimmed);
    h.textContent = trimmed
      ? 'Text was trimmed to ' + MAX.toLocaleString() + ' characters.'
      : empty ? 'Text is empty, so the placeholder is shown.'
        : n.toLocaleString() + ' / ' + MAX.toLocaleString() + ' characters';
  }

  function rebuild() {
    clearTimeout(buildTimer); buildTimer = null;
    if (!cur) return;
    try {
      const ta = $('text');
      const raw = norm(ta ? ta.value : '');
      const empty = !raw.trim();
      const generated = cur.opts ? cur.code($('per').value, $('preset').value) : cur.code();
      html = String(generated).replace('__TEXT__', function () { return esc(empty ? PLACEHOLDER : raw); });
      $('code-out').textContent = html;
      $('label').textContent = cur.name + (cur.opts ? ' · ' + $('per').value + ' · ' + $('preset').value : '');
      $('frame').title = 'Preview of ' + cur.name;
      updateHint(empty);

      originalComponentCode = html;
      const compState = getOrCreateComponentState(cur.id, cur.name, cur.cat, html);
      compState.originalCode = html;
      const savedCurrent = typeof compState.currentCode === 'string' ? compState.currentCode : '';
      if (savedCurrent && savedCurrent !== html) {
        editedComponentCode = savedCurrent;
        aiEditActive = true;
      } else {
        editedComponentCode = html;
        aiEditActive = false;
        compState.currentCode = '';
      }
      compState.lastUpdated = Date.now();
      persistAIState();
      if (aiCodeEditor) aiCodeEditor.value = editedComponentCode;
      play(aiEditActive ? editedComponentCode : html);
    } catch (err) {
      html = '';
      const out = $('code-out');
      if (out) out.textContent = 'Could not build this effect: ' + err.message;
      setFrameHTML($('frame'), injectDebug(errorDoc('Build error', err.message)), 'preview');
      report(err, 'rebuild');
    }
  }

  function scheduleBuild() { clearTimeout(buildTimer); buildTimer = setTimeout(rebuild, DEBOUNCE); }
  function flushBuild() { if (buildTimer) rebuild(); }
  function replay() { if (buildTimer) { rebuild(); return; } play(aiEditActive ? editedComponentCode : html); }

  function onInput() {
    dirty = true;
    const ta = $('text'); if (!ta) return;
    let trimmed = false;
    if (ta.value.length > MAX) {
      let v = ta.value.slice(0, MAX);
      if (/[\uD800-\uDBFF]$/.test(v)) v = v.slice(0, -1);
      ta.value = v; trimmed = true;
    }
    updateHint(!ta.value.trim(), trimmed);
    scheduleBuild();
  }

  function placeTextField(e) {
    const mode = e.field === 'none' ? 'none' : (e.cat === 'Cursor' ? 'slot' : 'controls');
    const tblock = $('tblock'), cslot = $('cslot'), controls = $('controls');
    if (mode === 'slot' && cslot) cslot.append(tblock);
    else if (mode === 'controls' && controls) controls.append(tblock);
    if (cslot) cslot.hidden = mode !== 'slot';
    const ccard = $('ccard'); if (ccard) ccard.hidden = mode !== 'controls';
    if (controls) controls.classList.toggle('no-opts', !e.opts);
    const tl = $('tlabel'); if (tl) tl.textContent = FIELD[e.id] || 'Text';
  }

  function selectEffect(e, fromUser) {
    if (aiBusy) { say('AI is working… Component selection is temporarily locked.'); return; }
    if (!e) return;
    cur = e;
    dirty = false;
    const ta = $('text');
    if (e.field !== 'none' && ta) ta.value = e.text || '';
    const opts = $('opts'); if (opts) opts.hidden = !e.opts;
    try { placeTextField(e); } catch (err) { report(err, 'placeTextField'); }
    try { updatePreviewHeight(e); } catch (err) { report(err, 'previewHeight'); }
    $('pname').textContent = e.name;
    $('pcat').textContent = e.cat;
    $('pnote').textContent = e.note;
    const nav = $('nav');
    if (nav) {
      nav.querySelectorAll('button[data-id]').forEach(function (b) {
        if (b.dataset.id === e.id) {
          b.setAttribute('aria-current', 'true');
          if (fromUser && b.scrollIntoView) { try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { } }
        } else { b.removeAttribute('aria-current'); }
      });
    }
    rebuild();
    try { aiOnComponentChange(); } catch (err) { report(err, 'aiOnComponentChange'); }
    if (fromUser) {
      say('Showing ' + e.name + (e.cat === 'Cursor' ? '. Its text field is below the preview.' : ''));
      if (window.matchMedia('(max-width: 900px)').matches) closeSidebar();
    }
  }

  function buildNav() {
    const nav = $('nav'); if (!nav) return;
    nav.innerHTML = '';
    CATS.forEach(function (c) {
      const list = EFFECTS.filter(function (e) { return e.cat === c; });
      if (!list.length) return;
      const g = document.createElement('div');
      g.className = 'grp'; g.setAttribute('role', 'group'); g.setAttribute('aria-labelledby', 'gl-' + c);
      const h = document.createElement('button');
      h.type = 'button'; h.className = 'gl'; h.id = 'gl-' + c;
      h.setAttribute('aria-expanded', 'true'); h.setAttribute('aria-controls', 'gitems-' + c);
      const chev = document.createElement('i');
      chev.className = 'ri-arrow-down-s-line gl-chev'; chev.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'gl-label'; label.textContent = c;
      const cnt = document.createElement('span');
      cnt.className = 'gl-count'; cnt.textContent = list.length; cnt.setAttribute('aria-hidden', 'true');
      h.append(chev, label, cnt);
      const items = document.createElement('div');
      items.className = 'items'; items.id = 'gitems-' + c;
      list.forEach(function (e) {
        const b = document.createElement('button');
        const n = document.createElement('span');
        b.type = 'button'; b.dataset.id = e.id;
        n.className = 'nm';
        n.textContent = e.cat === 'Cursor' ? e.name.replace(/^Cursor:\s*/, '') : e.name;
        b.append(n); b.title = e.name + ' — ' + e.note;
        b.addEventListener('click', function () { selectEffect(e, true); });
        items.append(b);
      });
      h.addEventListener('click', function () {
        const collapsed = g.classList.toggle('collapsed');
        h.setAttribute('aria-expanded', String(!collapsed));
        chev.className = (collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line') + ' gl-chev';
      });
      g.append(h, items); nav.append(g);
    });
    nav.addEventListener('keydown', function (ev) {
      const k = ev.key;
      const btns = Array.prototype.filter.call(nav.querySelectorAll('button[data-id]'), function (b) { return b.offsetParent !== null; });
      let i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      if (k === 'Home') i = 0;
      else if (k === 'End') i = btns.length - 1;
      else if (k === 'ArrowDown' || k === 'ArrowRight') i = (i + 1) % btns.length;
      else if (k === 'ArrowUp' || k === 'ArrowLeft') i = (i - 1 + btns.length) % btns.length;
      else return;
      ev.preventDefault(); btns[i].focus();
    });
  }

  function applySearch() {
    const input = $('searchInput'), sideEmpty = $('sideEmpty'), nav = $('nav');
    if (!input || !nav) return;
    const q = input.value.trim().toLowerCase();
    let anyTotal = 0;
    nav.querySelectorAll('.grp').forEach(function (grp) {
      let anyVisible = false;
      grp.querySelectorAll('button[data-id]').forEach(function (btn) {
        const effect = BY_ID[btn.dataset.id]; if (!effect) return;
        const match = !q || effect.name.toLowerCase().indexOf(q) !== -1 || effect.note.toLowerCase().indexOf(q) !== -1 || effect.cat.toLowerCase().indexOf(q) !== -1;
        btn.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      });
      grp.style.display = anyVisible ? '' : 'none';
      if (anyVisible) anyTotal++;
      if (q && anyVisible) {
        grp.classList.remove('collapsed');
        const head = grp.querySelector('.gl'); const chev = grp.querySelector('.gl-chev');
        if (head) head.setAttribute('aria-expanded', 'true');
        if (chev) chev.className = 'ri-arrow-down-s-line gl-chev';
      }
    });
    if (sideEmpty) sideEmpty.classList.toggle('show', anyTotal === 0 && !!q);
  }

  function applyThemeIcon() {
    const themeToggle = $('themeToggle'), themeIcon = $('themeIcon');
    if (!themeToggle || !themeIcon) return;
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    themeIcon.className = current === 'light' ? 'ri-moon-line' : 'ri-sun-line';
    themeToggle.setAttribute('aria-label', current === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    themeToggle.title = current === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', current === 'light' ? '#f7f8fb' : '#0c0e12');
  }

  function openSidebar() {
    const s = $('sidePanel'), o = $('sideOverlay'), m = $('menuToggle');
    if (!s || !o) return;
    s.classList.add('open'); o.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (m) m.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    const s = $('sidePanel'), o = $('sideOverlay'), m = $('menuToggle');
    if (!s || !o) return;
    s.classList.remove('open'); o.classList.remove('active');
    document.body.style.overflow = '';
    if (m) m.setAttribute('aria-expanded', 'false');
  }

  function legacyCopy(s) {
    const prev = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = s; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    let ok = false;
    try { ta.select(); ta.setSelectionRange(0, s.length); ok = document.execCommand('copy'); } catch (_) { ok = false; }
    ta.remove();
    if (prev && prev.focus) { try { prev.focus(); } catch (_) { } }
    return ok;
  }
  async function copyText(s) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(s); return true; } catch (_) { }
    }
    return legacyCopy(s);
  }
  async function onCopy() {
    if (copyBusy) return;
    flushBuild(); if (!html) return;
    copyBusy = true;
    const btn = $('copy');
    let ok = false;
    try { ok = await copyText(html); } catch (err) { report(err, 'copy'); ok = false; }
    if (btn) { btn.textContent = ok ? 'Copied!' : 'Copy failed'; btn.dataset.state = ok ? 'ok' : 'fail'; }
    say(ok ? 'Code copied to clipboard' : 'Copy failed.');
    clearTimeout(copyReset);
    copyReset = setTimeout(function () {
      if (btn) { btn.textContent = 'Copy code'; delete btn.dataset.state; }
      copyBusy = false;
    }, 1800);
  }

  /* ============================================================
     OPENROUTER CONFIG
     ============================================================ */
//   const OPENROUTER_API_KEY = '';

  const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
  const OPENROUTER_MODELS = [
    "qwen/qwen3-coder:free",
    "poolside/laguna-s-2.1:free",
    "google/gemma-4-26b-a4b-it:free",
    "deepseek/deepseek-r1:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free"
  ];

  /* ============================================================
     AI STATE — persistent, per-component, defensive
     ============================================================ */
  const AI_STATE_KEY = 'ziiui-ai-state-v2';
  const AI_ACTIVE_KEY = 'ziiui-ai-active-component';
  const AI_SETTINGS_KEY = 'ziiui-ai-settings';
  const AI_PENDING_KEY = 'ziiui-ai-pending-request';
  const AI_SCHEMA_VERSION = 2;
  const AI_MAX_CONTEXT_CHARS = 8000;
  const AI_REQUEST_TIMEOUT_MS = 90000;
  const AI_MAX_VERSIONS = 30;
  const AI_MAX_MESSAGES = 60;

  let aiState = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
  let aiSettings = { autoPreview: false };

  let originalComponentCode = '';
  let editedComponentCode = '';
  let aiEditActive = false;
  let aiBusy = false;
  let aiBusyComponentId = null;
  let activeAIRequestId = null;
  let activeAIRequestController = null;
  let aiAutoTimer = null;
  let currentComponentState = null;
  let storageWarned = false;

  const aiFab = $('aiFab'), aiPanel = $('aiPanel'), aiCloseBtn = $('aiClose'), aiMsgs = $('aiMsgs'),
    aiPrompt = $('aiPrompt'), aiSend = $('aiSend'), aiSelCard = $('aiSelCard'), aiHeadSub = $('aiHeadSub');
  const aiModal = $('aiModal'), aiModalTitle = $('aiModalTitle'), aiModalStatus = $('aiModalStatus'),
    aiCodeEditor = $('aiCodeEditor'), aiPreviewFrame = $('aiPreviewFrame'), aiAutoPreview = $('aiAutoPreview');
  const aiLockBanner = $('aiLockBanner'), aiCancelRequest = $('aiCancelRequest');
  const aiContextText = $('aiContextText'), aiClearComponent = $('aiClearComponent'), aiClearAll = $('aiClearAll');

  function uid() {
    try { if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch (_) { }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function safeSet(k, v) {
    try { localStorage.setItem(k, v); return true; }
    catch (err) { warnStorageOnce(err); return false; }
  }
  function safeRemove(k) { try { localStorage.removeItem(k); } catch (_) { } }
  function warnStorageOnce(err) {
    if (storageWarned) return;
    storageWarned = true;
    try { console.warn('[ziiui] storage error', err); } catch (_) { }
    say('Local AI history could not be saved.');
  }

  function loadAIStateFromStorage() {
    const raw = safeGet(AI_STATE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('bad shape');
      if (parsed.schemaVersion !== AI_SCHEMA_VERSION) {
        aiState = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
        return;
      }
      if (!parsed.components || typeof parsed.components !== 'object') parsed.components = {};
      Object.keys(parsed.components).forEach(function (k) {
        const c = parsed.components[k];
        if (!c || typeof c !== 'object') { delete parsed.components[k]; return; }
        if (!Array.isArray(c.chatHistory)) c.chatHistory = [];
        if (!Array.isArray(c.codeVersions)) c.codeVersions = [];
        c.chatHistory = c.chatHistory.filter(function (m) {
          return m && typeof m === 'object' && typeof m.text === 'string' &&
            (m.role === 'user' || m.role === 'assistant');
        });
        c.codeVersions = c.codeVersions.filter(function (v) {
          return v && typeof v === 'object' && typeof v.code === 'string';
        });
        if (typeof c.originalCode !== 'string') c.originalCode = '';
        if (typeof c.currentCode !== 'string') c.currentCode = '';
        if (typeof c.componentId !== 'string') c.componentId = k;
      });
      aiState = parsed;
    } catch (err) {
      try { console.warn('[ziiui] corrupted AI state, resetting', err); } catch (_) { }
      aiState = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
      safeRemove(AI_STATE_KEY);
    }
  }
  function persistAIState() {
    try {
      aiState.schemaVersion = AI_SCHEMA_VERSION;
      return safeSet(AI_STATE_KEY, JSON.stringify(aiState));
    } catch (err) { warnStorageOnce(err); return false; }
  }
  function loadAISettings() {
    const raw = safeGet(AI_SETTINGS_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') aiSettings = { autoPreview: !!s.autoPreview };
    } catch (_) { }
  }
  function persistAISettings() { safeSet(AI_SETTINGS_KEY, JSON.stringify(aiSettings)); }
  function saveActiveComponentId(id) { if (id) safeSet(AI_ACTIVE_KEY, id); }

  function getOrCreateComponentState(componentId, name, category, originalCode) {
    if (!aiState.components[componentId]) {
      aiState.components[componentId] = {
        componentId: componentId, componentName: name || componentId,
        category: category || '', originalCode: originalCode || '',
        currentCode: '', chatHistory: [], codeVersions: [],
        activeVersionId: null, lastUpdated: Date.now()
      };
    }
    const s = aiState.components[componentId];
    if (name) s.componentName = name;
    if (category) s.category = category;
    if (originalCode) s.originalCode = originalCode;
    return s;
  }
  function clearComponentHistory(componentId) {
    const s = aiState.components[componentId];
    if (!s) return;
    s.chatHistory = []; s.codeVersions = []; s.currentCode = '';
    s.activeVersionId = null; s.lastUpdated = Date.now();
    persistAIState();
  }
  function clearAllAIHistory() {
    aiState = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
    persistAIState();
    safeRemove(AI_ACTIVE_KEY);
  }

  function buildContextMessages(compState, currentUserText) {
    if (!compState || !Array.isArray(compState.chatHistory)) return [];
    const history = compState.chatHistory.slice();
    if (history.length && history[history.length - 1].role === 'user' &&
      history[history.length - 1].text === currentUserText) {
      history.pop();
    }
    const result = []; let total = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
      const text = String(m.text || '');
      if (!text) continue;
      if (total + text.length > AI_MAX_CONTEXT_CHARS && result.length >= 4) break;
      result.push({ role: m.role, content: text });
      total += text.length;
    }
    result.reverse();
    return result;
  }

  function aiAddMessage(role, text) {
    if (!aiMsgs) return null;
    const d = document.createElement('div');
    d.className = 'ai-msg ' + role; d.textContent = text;
    aiMsgs.append(d); aiMsgs.scrollTop = aiMsgs.scrollHeight;
    return d;
  }
  function aiShowLoading() {
    if (!aiMsgs) return; aiHideLoading();
    const d = document.createElement('div');
    d.className = 'ai-msg ai'; d.id = 'aiLoading';
    d.innerHTML = '<span class="ai-dots" aria-hidden="true"><i></i><i></i><i></i></span>AI is editing your component…';
    aiMsgs.append(d); aiMsgs.scrollTop = aiMsgs.scrollHeight;
  }
  function aiHideLoading() { const l = $('aiLoading'); if (l) l.remove(); }

  function renderAIChat() {
    if (!aiMsgs) return;
    aiMsgs.innerHTML = '';
    if (!cur) { aiAddMessage('ai', 'Select a component to start editing.'); return; }
    const s = aiState.components[cur.id];
    const history = (s && Array.isArray(s.chatHistory)) ? s.chatHistory : [];
    if (!history.length) {
      aiAddMessage('ai', 'Hi! Pick a component on the left, then tell me what you want to change. Your conversation will be saved automatically.');
      return;
    }
    history.forEach(function (m) { aiAddMessage(m.role === 'user' ? 'user' : 'ai', m.text); });
    aiMsgs.scrollTop = aiMsgs.scrollHeight;
  }

  function updateAIContextIndicator() {
    if (!aiContextText) return;
    if (!cur || !currentComponentState) { aiContextText.textContent = 'New AI session'; return; }
    const msgs = currentComponentState.chatHistory.length;
    const versions = currentComponentState.codeVersions.length;
    if (msgs === 0) aiContextText.textContent = 'New AI session · ' + cur.name;
    else aiContextText.textContent = cur.name + ' · ' + msgs + ' msg · ' + versions + ' version' + (versions === 1 ? '' : 's') + ' · Saved locally';
  }

  function pushChatMessage(role, text) {
    if (!currentComponentState) return null;
    const msg = { id: uid(), role: role === 'ai' ? 'assistant' : role, text: String(text || ''), timestamp: Date.now() };
    currentComponentState.chatHistory.push(msg);
    if (currentComponentState.chatHistory.length > AI_MAX_MESSAGES) {
      currentComponentState.chatHistory = currentComponentState.chatHistory.slice(-AI_MAX_MESSAGES);
    }
    currentComponentState.lastUpdated = Date.now();
    persistAIState();
    return msg;
  }

  function setNavigationLocked(locked) {
    const nav = $('nav');
    if (nav) {
      nav.classList.toggle('locked', !!locked);
      nav.querySelectorAll('button[data-id]').forEach(function (b) { b.disabled = !!locked; });
      nav.querySelectorAll('.gl').forEach(function (b) { b.disabled = !!locked; });
    }
    const searchInput = $('searchInput');
    if (searchInput) searchInput.disabled = !!locked;
    if (aiLockBanner) aiLockBanner.hidden = !locked;
  }

  function aiRenderSelected() {
    if (!aiSelCard) return;
    if (!cur) {
      if (aiHeadSub) aiHeadSub.textContent = 'No component selected';
      aiSelCard.innerHTML = '<span class="ai-sel-empty">Select a component first to start editing.</span>';
      return;
    }
    if (aiHeadSub) aiHeadSub.textContent = 'Selected: ' + cur.name;
    aiSelCard.innerHTML =
      '<div class="ai-sel-info">' +
      '<strong>' + esc(cur.name) + '</strong>' +
      '<span>Category: ' + esc(cur.cat) + '</span>' +
      '</div>' +
      '<button class="ai-btn ghost" type="button" id="aiViewCode" aria-label="View component code">' +
      '<i class="ri-code-s-slash-line" aria-hidden="true"></i> View Code' +
      '</button>';
    const v = $('aiViewCode');
    if (v) {
      v.addEventListener('click', function () {
        if (aiCodeEditor) aiCodeEditor.value = aiEditActive ? editedComponentCode : originalComponentCode;
        aiOpenModal();
      });
    }
  }

  function aiOnComponentChange() {
    if (!cur) { currentComponentState = null; renderAIChat(); updateAIContextIndicator(); return; }
    currentComponentState = getOrCreateComponentState(cur.id, cur.name, cur.cat, originalComponentCode);
    saveActiveComponentId(cur.id);
    aiRenderSelected();
    renderAIChat();
    updateAIContextIndicator();
    if (aiCodeEditor) aiCodeEditor.value = aiEditActive ? editedComponentCode : originalComponentCode;
    updateAIStatus();
  }

  function aiTogglePanel(force) {
    if (!aiPanel || !aiFab) return;
    const open = typeof force === 'boolean' ? force : aiPanel.hidden;
    aiPanel.hidden = !open;
    aiFab.classList.toggle('is-open', open);
    aiFab.setAttribute('aria-expanded', String(open));
    if (open) {
      aiOnComponentChange();
      setTimeout(function () { try { aiPrompt.focus(); } catch (_) { } }, 40);
    }
  }

  function aiNormalize(text) {
    let t = String(text == null ? '' : text).trim();
    if (!t) return '';
    const fenced = t.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)```/);
    if (fenced && fenced[1] && fenced[1].trim()) t = fenced[1].trim();
    else t = t.replace(/^```[a-zA-Z0-9]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    const docIdx = t.search(/<!DOCTYPE\s+html/i);
    if (docIdx > 0) t = t.slice(docIdx);
    return t.trim();
  }
  function aiLooksLikeCode(code) {
    if (!code || code.trim().length < 20) return false;
    const c = code.toLowerCase();
    const tags = ['html', 'body', 'div', 'section', 'canvas', 'svg', 'style'];
    for (let i = 0; i < tags.length; i++) { if (c.indexOf(LT + tags[i]) >= 0) return true; }
    if (c.indexOf(LT + 'scr' + 'ipt') >= 0) return true;
    return false;
  }
  function aiErrorMessage(err) {
    const m = (err && err.message) || '';
    if (err && err.name === 'AbortError') return 'AI request timed out. Your existing component was preserved.';
    if (m === 'NOKEY') return 'OpenRouter API key is missing. Paste your key into OPENROUTER_API_KEY.';
    if (m === 'AUTH') return 'OpenRouter rejected the API key. Check that your key is valid and has credits.';
    if (m === 'RATE') return 'OpenRouter rate limit reached. Please try again shortly.';
    if (m === 'NETWORK') return 'Could not reach OpenRouter. Check your internet connection.';
    if (m === 'EMPTY') return 'AI did not return component code.';
    if (m === 'INVALID') return 'AI returned invalid component code. Please try again.';
    if (m === 'BADJSON') return 'OpenRouter returned an unreadable response.';
    if (m === 'ALLMODELS') return 'All OpenRouter free models failed. Please try again later.';
    if (m === 'TIMEOUT') return 'AI request timed out. Your existing component was preserved.';
    if (m.indexOf('API:') === 0) return 'OpenRouter error ' + m.slice(4) + '.';
    return 'Something went wrong: ' + (m || 'unknown error');
  }

  function buildSystemPrompt() {
    const compName = cur ? cur.name : '(none)';
    const compCat = cur ? cur.cat : '(none)';
    const original = originalComponentCode || '(unavailable)';
    const current = aiEditActive ? (editedComponentCode || '(none)') : '(none — identical to the original)';
    return [
      'You are an expert frontend developer working for ZiiUI.',
      '',
      'You are editing the currently selected ZiiUI component through an iterative conversation.',
      '',
      'The current edited code is the authoritative working version.',
      "Apply the user's latest request to the current edited code.",
      'Use previous conversation messages to resolve references such as "it", "this", "that", "make it bigger", "undo that", etc.',
      'Do not revert previous changes unless the user explicitly asks.',
      'Preserve all functionality that was not requested to change.',
      'Return ONLY the complete updated runnable HTML component.',
      '',
      'Rules:',
      '1. Return the COMPLETE updated component code.',
      '2. Do not return explanations before the code.',
      '3. Preserve all functionality that the user did not ask to change.',
      '4. Do not modify unrelated parts of the component.',
      '5. Preserve existing HTML structure when possible.',
      '6. Preserve existing JavaScript behavior unless the user requests a behavior change.',
      '7. Preserve existing CSS behavior unless the user requests a style change.',
      '8. Preserve external libraries such as GSAP, Three.js, fonts.',
      '9. Make the resulting component self-contained.',
      '10. Make sure the returned code can run directly inside the preview iframe.',
      '11. Do not use backend code.',
      '12. Do not use Node.js.',
      '13. Do not use server-side APIs.',
      '14. Do not include Markdown fences.',
      '15. Return only the complete runnable HTML component.',
      '16. Do not modify the original source code.',
      '17. The edited code is a new temporary version of the selected component.',
      '18. If the request is ambiguous, make the smallest reasonable change.',
      '19. Ensure responsive behavior is preserved.',
      '20. Ensure JavaScript errors are avoided.',
      '21. Do not remove existing accessibility features unless necessary.',
      '22. Do not remove reduced-motion support.',
      '23. Do not change component IDs/classes unnecessarily.',
      '',
      'Component name: ' + compName,
      'Category: ' + compCat,
      '',
      'Original component code:',
      original,
      '',
      'Current edited component code (authoritative — modify THIS):',
      current,
      '',
      'Return ONLY the complete updated HTML.'
    ].join('\n');
  }

  async function aiCallOpenRouter(userRequest, signal) {
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'sk-or-v1-xxxxxxxx') throw new Error('NOKEY');
    const systemPrompt = buildSystemPrompt();
    const contextMessages = buildContextMessages(currentComponentState, userRequest);
    const messages = [{ role: 'system', content: systemPrompt }];
    contextMessages.forEach(function (m) { messages.push({ role: m.role, content: m.content }); });
    messages.push({ role: 'user', content: userRequest });

    let lastError = null;
    for (let i = 0; i < OPENROUTER_MODELS.length; i++) {
      if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const model = OPENROUTER_MODELS[i];
      try {
        try { console.log('[ziiui] Trying model:', model); } catch (_) { }
        const response = await fetch(OPENROUTER_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin || 'https://ziiui.local',
            'X-Title': 'ZiiUI'
          },
          body: JSON.stringify({ model: model, messages: messages, temperature: 0.7, max_tokens: 5000 }),
          signal: signal
        });
        if (response.status === 401 || response.status === 403) throw new Error('AUTH');
        if (response.status === 429) { lastError = new Error('RATE'); continue; }
        if (!response.ok) {
          let detail = '';
          try { detail = await response.text(); } catch (_) { }
          lastError = new Error('API:' + response.status + (detail ? ' - ' + detail.slice(0, 140) : ''));
          continue;
        }
        let data;
        try { data = await response.json(); } catch (_) { lastError = new Error('BADJSON'); continue; }
        const output = data && data.choices && data.choices[0] &&
          data.choices[0].message && data.choices[0].message.content;
        if (!output) { lastError = new Error('EMPTY'); continue; }
        const code = aiNormalize(output);
        if (!code) { lastError = new Error('EMPTY'); continue; }
        if (!aiLooksLikeCode(code)) { lastError = new Error('INVALID'); continue; }
        try { console.log('[ziiui] Success with model:', model); } catch (_) { }
        return code;
      } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        if (err && err.message === 'AUTH') throw err;
        lastError = err;
      }
    }
    if (lastError) {
      if (lastError.message === 'AUTH') throw lastError;
      if (lastError.name === 'AbortError') throw lastError;
      throw new Error('ALLMODELS');
    }
    throw new Error('ALLMODELS');
  }

  async function aiGenerate() {
    if (aiBusy) return;
    if (!cur) { aiAddMessage('err', 'Select a component first.'); return; }
    if (!currentComponentState) { aiAddMessage('err', 'No component selected.'); return; }
    const request = (aiPrompt.value || '').trim();
    if (!request) { aiAddMessage('err', 'Please describe what you want to change.'); return; }
    if (!originalComponentCode) { aiAddMessage('err', 'No component code available yet.'); return; }

    aiBusy = true;
    aiBusyComponentId = cur.id;
    const requestId = uid();
    activeAIRequestId = requestId;
    const requestComponentId = cur.id;

    currentComponentState.lastUpdated = Date.now();
    persistAIState();
    try {
      safeSet(AI_PENDING_KEY, JSON.stringify({ requestId: requestId, componentId: requestComponentId, timestamp: Date.now() }));
    } catch (_) { }

    aiPrompt.value = '';
    if (aiSend) aiSend.disabled = true;
    setNavigationLocked(true);
    pushChatMessage('user', request);
    aiAddMessage('user', request);
    aiShowLoading();
    say('AI is editing your component…');

    const controller = new AbortController();
    activeAIRequestController = controller;
    const timeoutId = setTimeout(function () { try { controller.abort(); } catch (_) { } }, AI_REQUEST_TIMEOUT_MS);

    try {
      const code = await aiCallOpenRouter(request, controller.signal);
      clearTimeout(timeoutId);
      if (requestId !== activeAIRequestId || requestComponentId !== cur.id) return;
      aiHideLoading();
      editedComponentCode = code;
      aiEditActive = true;
      currentComponentState.currentCode = code;
      const version = { id: uid(), code: code, prompt: request, timestamp: Date.now() };
      currentComponentState.codeVersions.push(version);
      if (currentComponentState.codeVersions.length > AI_MAX_VERSIONS) {
        currentComponentState.codeVersions = currentComponentState.codeVersions.slice(-AI_MAX_VERSIONS);
      }
      currentComponentState.activeVersionId = version.id;
      currentComponentState.lastUpdated = Date.now();
      persistAIState();
      pushChatMessage('assistant', 'Applied: ' + request);
      aiAddMessage('ai', 'Updated the component. Opening the AI editor…');
      if (aiCodeEditor) aiCodeEditor.value = code;
      updateAIContextIndicator();
      aiOpenModal(); aiRunPreview(); updateAIStatus();
      say('AI version generated — original component preserved.');
    } catch (err) {
      clearTimeout(timeoutId);
      if (requestId !== activeAIRequestId) return;
      aiHideLoading();
      const aborted = err && err.name === 'AbortError';
      const msg = aborted
        ? 'AI request timed out or was cancelled. Your existing component was preserved.'
        : aiErrorMessage(err);
      aiAddMessage('err', msg);
      say(aborted ? 'AI request cancelled.' : 'AI edit failed.');
    } finally {
      try { safeRemove(AI_PENDING_KEY); } catch (_) { }
      if (requestId === activeAIRequestId) {
        aiBusy = false; aiBusyComponentId = null; activeAIRequestId = null;
        activeAIRequestController = null;
        if (aiSend) aiSend.disabled = false;
        setNavigationLocked(false);
      }
    }
  }

  function aiCancelActiveRequest() {
    if (!activeAIRequestController) return;
    try { activeAIRequestController.abort(); } catch (_) { }
  }

  function aiOpenModal() {
    if (!aiModal) return;
    const target = aiEditActive ? editedComponentCode : originalComponentCode;
    if (aiCodeEditor && aiCodeEditor.value !== target) aiCodeEditor.value = target || '';
    if (aiModalTitle) aiModalTitle.textContent = cur ? cur.name : 'Component';
    aiModal.hidden = false;
    document.body.style.overflow = 'hidden';
    updateAIStatus(); aiRunPreview();
    setTimeout(function () { try { if ($('aiModalClose')) $('aiModalClose').focus(); } catch (_) { } }, 30);
  }
  function aiCloseModal() {
    if (!aiModal) return;
    aiModal.hidden = true;
    document.body.style.overflow = '';
  }
  function aiRunPreview() {
    if (!aiPreviewFrame) return;
    const code = aiCodeEditor ? aiCodeEditor.value : '';
    if (!code || !code.trim()) {
      setFrameHTML(aiPreviewFrame, buildDoc({
        title: 'ziiui — Preview',
        css: 'body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#0f1115;color:#8b92a0}',
        body: 'Nothing to preview'
      }), 'ai');
      return;
    }
    setFrameHTML(aiPreviewFrame, injectDebug(code), 'ai');
  }
  function updateAIStatus() {
    if (!aiModalStatus) return;
    const edited = aiEditActive && editedComponentCode && editedComponentCode !== originalComponentCode;
    aiModalStatus.textContent = edited
      ? 'AI version generated — original component preserved.'
      : 'Original component is unchanged.';
    aiModalStatus.classList.toggle('is-edited', !!edited);
  }
  function aiShowTab(which) {
    if (!aiCodeEditor) return;
    aiCodeEditor.value = which === 'original'
      ? (originalComponentCode || '')
      : (aiEditActive ? editedComponentCode : (originalComponentCode || ''));
    document.querySelectorAll('.ai-tab').forEach(function (t) {
      const on = t.dataset.tab === which;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-pressed', String(on));
    });
    updateAIStatus(); aiRunPreview();
  }
  function aiApply() {
    if (!cur || !aiCodeEditor) return;
    const val = aiCodeEditor.value;
    editedComponentCode = val;
    aiEditActive = val !== originalComponentCode;
    if (currentComponentState) {
      currentComponentState.currentCode = aiEditActive ? val : '';
      currentComponentState.lastUpdated = Date.now();
      persistAIState();
    }
    const frame = $('frame');
    if (frame) setFrameHTML(frame, injectDebug(val), 'preview');
    updateAIStatus();
    aiAddMessage('sys', 'Applied AI version to the preview.');
    say('AI version applied to the preview.');
  }
  function aiReset() {
    editedComponentCode = originalComponentCode;
    aiEditActive = false;
    if (currentComponentState) {
      currentComponentState.currentCode = '';
      currentComponentState.lastUpdated = Date.now();
      persistAIState();
    }
    if (aiCodeEditor) aiCodeEditor.value = originalComponentCode || '';
    const frame = $('frame');
    if (frame && originalComponentCode) setFrameHTML(frame, injectDebug(originalComponentCode), 'preview');
    updateAIStatus(); aiRunPreview();
    aiAddMessage('sys', 'Reset to original component.');
    say('Reset to original component.');
  }
  async function aiCopyEdited() {
    const ok = await copyText(aiCodeEditor ? aiCodeEditor.value : '');
    aiAddMessage('sys', ok ? 'Edited code copied to clipboard.' : 'Copy failed.');
    say(ok ? 'Edited code copied to clipboard' : 'Copy failed.');
  }
  function aiClearComponentHistory() {
    if (!cur) return;
    if (!window.confirm('Clear chat history and AI versions for "' + cur.name + '"? The original component will remain.')) return;
    clearComponentHistory(cur.id);
    renderAIChat(); updateAIContextIndicator();
    aiAddMessage('sys', 'Component AI history cleared.');
    say('Cleared AI history for ' + cur.name + '.');
  }
  function aiClearAllHistory() {
    if (!window.confirm('Clear ALL AI history for every component? Original components will remain intact.')) return;
    clearAllAIHistory();
    renderAIChat(); updateAIContextIndicator();
    aiAddMessage('sys', 'All AI history cleared.');
    say('Cleared all AI history.');
  }

  function wire() {
    const menuToggle = $('menuToggle'), sideClose = $('sideClose'), sideOverlay = $('sideOverlay'),
      themeToggle = $('themeToggle'), searchInput = $('searchInput');
    if (menuToggle) menuToggle.addEventListener('click', guard(openSidebar, 'openSidebar'));
    if (sideClose) sideClose.addEventListener('click', guard(closeSidebar, 'closeSidebar'));
    if (sideOverlay) sideOverlay.addEventListener('click', guard(closeSidebar, 'closeSidebar'));
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const sidePanel = $('sidePanel');
        if (sidePanel && sidePanel.classList.contains('open')) closeSidebar();
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) closeSidebar(); });
    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        try {
          const current = document.documentElement.getAttribute('data-theme') || 'dark';
          const next = current === 'light' ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', next);
          try { localStorage.setItem('ziiui-theme', next); } catch (_) { }
          applyThemeIcon();
        } catch (err) { report(err, 'theme'); }
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', guard(applySearch, 'search'));
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { searchInput.value = ''; applySearch(); searchInput.blur(); }
      });
    }
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInput && searchInput.offsetParent !== null && !searchInput.disabled) {
          searchInput.focus(); searchInput.select();
        }
      }
    });
    const per = $('per'), preset = $('preset');
    if (per) per.addEventListener('change', guard(rebuild, 'per'));
    if (preset) preset.addEventListener('change', guard(rebuild, 'preset'));
    const ta = $('text');
    if (ta) ta.addEventListener('input', guard(onInput, 'input'));
    const replayBtn = $('replay');
    if (replayBtn) replayBtn.addEventListener('click', guard(replay, 'replay'));
    const copyBtn = $('copy');
    if (copyBtn) copyBtn.addEventListener('click', guard(onCopy, 'copy'));

    if (aiFab) aiFab.addEventListener('click', function () { aiTogglePanel(); });
    if (aiCloseBtn) aiCloseBtn.addEventListener('click', function () { aiTogglePanel(false); });
    if (aiSend) aiSend.addEventListener('click', guard(aiGenerate, 'aiGenerate'));
    if (aiCancelRequest) aiCancelRequest.addEventListener('click', guard(aiCancelActiveRequest, 'aiCancel'));
    if (aiClearComponent) aiClearComponent.addEventListener('click', guard(aiClearComponentHistory, 'aiClearComponent'));
    if (aiClearAll) aiClearAll.addEventListener('click', guard(aiClearAllHistory, 'aiClearAll'));
    if (aiPrompt) {
      aiPrompt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (!aiBusy) aiGenerate();
        }
      });
    }
    if (aiCodeEditor) {
      aiCodeEditor.addEventListener('input', function () {
        if (!currentComponentState) return;
        const val = aiCodeEditor.value;
        editedComponentCode = val;
        aiEditActive = val !== originalComponentCode;
        currentComponentState.currentCode = aiEditActive ? val : '';
        currentComponentState.lastUpdated = Date.now();
        persistAIState(); updateAIStatus(); updateAIContextIndicator();
        if (aiAutoPreview && aiAutoPreview.checked) {
          clearTimeout(aiAutoTimer);
          aiAutoTimer = setTimeout(function () {
            try { aiRunPreview(); } catch (err) { report(err, 'aiRunPreview'); }
          }, 500);
        }
      });
    }
    if (aiAutoPreview) {
      aiAutoPreview.addEventListener('change', function () {
        aiSettings.autoPreview = !!aiAutoPreview.checked;
        persistAISettings();
        if (aiAutoPreview.checked) aiRunPreview();
      });
    }
    document.querySelectorAll('.ai-tab').forEach(function (t) {
      t.addEventListener('click', function () { aiShowTab(t.dataset.tab); });
    });
    const aiModalClose = $('aiModalClose'), aiModalClose2 = $('aiModalClose2');
    if (aiModalClose) aiModalClose.addEventListener('click', aiCloseModal);
    if (aiModalClose2) aiModalClose2.addEventListener('click', aiCloseModal);
    const aiRunBtn = $('aiRun'); if (aiRunBtn) aiRunBtn.addEventListener('click', guard(aiRunPreview, 'aiRun'));
    const aiApplyBtn = $('aiApply'); if (aiApplyBtn) aiApplyBtn.addEventListener('click', guard(aiApply, 'aiApply'));
    const aiResetBtn = $('aiResetBtn'); if (aiResetBtn) aiResetBtn.addEventListener('click', guard(aiReset, 'aiReset'));
    const aiCopyBtn = $('aiCopyBtn'); if (aiCopyBtn) aiCopyBtn.addEventListener('click', guard(aiCopyEdited, 'aiCopy'));
    if (aiModal) aiModal.addEventListener('click', function (e) { if (e.target === aiModal) aiCloseModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (aiModal && !aiModal.hidden) { e.preventDefault(); aiCloseModal(); return; }
      if (aiPanel && !aiPanel.hidden) { e.preventDefault(); aiTogglePanel(false); }
    });
    window.addEventListener('beforeunload', function () { try { persistAIState(); } catch (_) { } });
  }

  function boot() {
    loadAISettings();
    loadAIStateFromStorage();
    if (aiAutoPreview) aiAutoPreview.checked = !!aiSettings.autoPreview;

    try { buildNav(); } catch (err) { report(err, 'buildNav'); }
    try { wire(); } catch (err) { report(err, 'wire'); }
    try { applyThemeIcon(); } catch (err) { report(err, 'theme'); }

    const lastActiveId = safeGet(AI_ACTIVE_KEY);
    const initial = (lastActiveId && BY_ID[lastActiveId]) ? BY_ID[lastActiveId] : EFFECTS[0];
    try { selectEffect(initial, false); } catch (err) { report(err, 'boot'); }

    const pendingRaw = safeGet(AI_PENDING_KEY);
    if (pendingRaw) {
      safeRemove(AI_PENDING_KEY);
      try {
        const p = JSON.parse(pendingRaw);
        if (p && p.componentId === cur.id && currentComponentState) {
          pushChatMessage('assistant', 'Previous AI session restored. The interrupted request was not completed.');
          renderAIChat(); updateAIContextIndicator();
          say('Previous AI session restored. The interrupted request was not completed.');
        }
      } catch (_) { }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();