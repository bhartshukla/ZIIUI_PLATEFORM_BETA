/*
 * The effects catalogue. Each entry describes one component in the library:
 *   id, name, cat (category), note (one-liner), previewSize ('compact' | 'large'),
 *   text (default editable text), opts (shows split/preset controls),
 *   field ('none' hides the text box), code() -> complete standalone HTML.
 */
import { tpl } from './templates.js';
import {
  templatePage, textPage, cursorPage, rollPage, wavePage, scramblePage,
  splitEffectPage, scriptSrc as js, linkHref as css, fontPreconnect
} from './builders.js';

const GSAP = (v) => `https://cdnjs.cloudflare.com/ajax/libs/gsap/${v}/gsap.min.js`;
const SCROLLTRIGGER = (v) => `https://cdnjs.cloudflare.com/ajax/libs/gsap/${v}/ScrollTrigger.min.js`;
const THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

/** Shorthand for the many "full page" effects. */
const full = (template, head) => () => templatePage(template, head);

export const EFFECTS = [
  /* ----- Web ----- */
  { id: 'splitsection', name: 'Split Scroll', cat: 'Web', field: 'none', previewSize: 'large',
    note: 'Cards split apart and flip on scroll', text: '',
    code: full('splitsection', [
      ...fontPreconnect(),
      css('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;1,9..40,300&display=swap'),
      js(GSAP('3.12.5')), js(SCROLLTRIGGER('3.12.5')),
      js('https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js')
    ]) },

  /* ----- Interactive ----- */
  { id: 'maskdrag', name: 'Draggable Mask', cat: 'Interactive', field: 'none', previewSize: 'large',
    note: 'Drag canvas windows over a video', text: '',
    code: full('maskdrag') },
  { id: 'microhover', name: 'Micro Hover', cat: 'Interactive', field: 'none', previewSize: 'large',
    note: 'Photo burst on keyword hover', text: '',
    code: full('microhover', [
      ...fontPreconnect(),
      css('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500&family=DM+Serif+Display&display=swap'),
      js(GSAP('3.12.5'))
    ]) },
  { id: 'hoversection', name: 'Hover Section', cat: 'Interactive', field: 'none', previewSize: 'large',
    note: 'Project list with floating thumbnail', text: '',
    code: full('hoversection', [js(GSAP('3.13.0'))]) },

  /* ----- Footer ----- */
  { id: 'footer1', name: 'Sticky Footer', cat: 'Footer', field: 'none', previewSize: 'large',
    note: 'Sticky footer with smooth scroll reveal', text: '',
    code: full('footer1', [js('https://cdn.jsdelivr.net/gh/studio-freight/lenis@1.0.29/bundled/lenis.min.js')]) },
  { id: 'footer2', name: 'Editorial Footer', cat: 'Footer', field: 'none', previewSize: 'large',
    note: 'Split text animated footer with magnetic links', text: '',
    code: full('footer2', [
      css('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'),
      js(GSAP('3.12.5')), js(SCROLLTRIGGER('3.12.5'))
    ]) },

  /* ----- Text ----- */
  { id: 'effect', name: 'Text Effect', cat: 'Text', note: 'Split by char, word or line', previewSize: 'compact',
    text: 'ziiui — creative interfaces with motion-primitives', opts: true,
    code: (per, preset) => splitEffectPage(per, preset) },
  { id: 'fancy', name: 'Custom Variants', cat: 'Text', note: 'Random spring, rotation, colour', previewSize: 'compact',
    text: 'ziiui — creative web effects',
    code: () => textPage(tpl('fancy.css'), tpl('fancy.js')) },
  { id: 'roll', name: 'Text Roll', cat: 'Text', note: 'Letters roll up in sequence', previewSize: 'compact',
    text: 'ziiui motion',
    code: () => rollPage({ dur: 0.5, ease: 'cubic-bezier(.4,0,.2,1)', from: '100%', to: '-100%', a: 0.1, b: 0.2 }) },
  { id: 'roll2', name: 'Text Roll (custom)', cat: 'Text', note: 'Rolls down, custom easing', previewSize: 'compact',
    text: 'ziiui digital',
    code: () => rollPage({ dur: 0.3, ease: 'cubic-bezier(.175,.885,.32,1.1)', from: '-100%', to: '100%', a: 0.05, b: 0.05 }) },
  { id: 'scramble', name: 'Text Scramble', cat: 'Text', note: 'Random glyphs resolve to text', previewSize: 'compact',
    text: 'ziiui motion', code: () => scramblePage() },
  { id: 'shimmer', name: 'Text Shimmer', cat: 'Text', note: 'Light sweep across text', previewSize: 'compact',
    text: 'ziiui — modern web', code: () => textPage(tpl('shimmer.css'), null) },
  { id: 'wave', name: 'Shimmer Wave', cat: 'Text', note: '3D wave through each letter', previewSize: 'compact',
    text: 'ziiui creative', code: () => wavePage({ base: '#71717a', grad: '#ffffff', z: 10, s: 1.1, r: 10 }) },
  { id: 'wave2', name: 'Shimmer Wave (colour)', cat: 'Text', note: 'Monochrome wave, custom depth', previewSize: 'compact',
    text: 'ziiui interactive web', code: () => wavePage({ base: '#71717a', grad: '#ffffff', z: 1, s: 1.1, r: 20 }) },

  /* ----- Cursor ----- */
  { id: 'cursor1', name: 'Cursor: Expand', cat: 'Cursor', note: 'Custom cursor expands over an image', previewSize: 'compact',
    text: 'Explore', opts: false,
    code: () => cursorPage(tpl('cursor1.css'), tpl('cursor1.html'), tpl('cursor1.js')) },
  { id: 'cursor2', name: 'Cursor: Icon Label', cat: 'Cursor', note: 'Pointer icon with a trailing tag', previewSize: 'compact',
    text: 'ziiui creative web', opts: false,
    code: () => cursorPage(tpl('cursor2.css'), tpl('cursor2.html'), tpl('cursor2.js')) },
  { id: 'cursor3', name: 'Cursor: Image Reveal', cat: 'Cursor', note: 'Photo preview follows the pointer', previewSize: 'compact',
    text: 'ziiui — digital motion design', opts: false,
    code: () => cursorPage(tpl('cursor3.css'), tpl('cursor3.html'), tpl('cursor3.js')) },

  /* ----- Scroll ----- */
  { id: 'listreveal', name: 'List Reveal', cat: 'Scroll', field: 'none', previewSize: 'large',
    note: 'Pinned list with image preview', text: '',
    code: full('list', [
      css('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap'),
      js('https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js'),
      js(GSAP('3.12.5')), js(SCROLLTRIGGER('3.12.5'))
    ]) },
  { id: 'scrolldown', name: 'Scroll Stand', cat: 'Scroll', field: 'none', previewSize: 'large',
    note: '3D cards rise on scroll', text: '',
    code: full('scrolldown', [
      ...fontPreconnect(),
      css('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap'),
      js('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js'),
      js('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js'),
      js('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js'),
      js('https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js')
    ]) },
  { id: 'scrollmask', name: 'Scrolling Mask', cat: 'Scroll', field: 'none', previewSize: 'large',
    note: 'Video revealed through scrolling text', text: '',
    code: full('scrollmask', [js(GSAP('3.12.2')), js(SCROLLTRIGGER('3.12.2'))]) },
  { id: 'pinrotate', name: 'Pin Rotate Sections', cat: 'Scroll', field: 'none', previewSize: 'large',
    note: 'Pinned cards rotate into view', text: '',
    code: full('pinrotate', [
      ...fontPreconnect(),
      css('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&display=swap'),
      js(GSAP('3.13.0')), js(SCROLLTRIGGER('3.13.0')),
      js('https://unpkg.com/lenis@1.3.15/dist/lenis.min.js')
    ]) },
  { id: 'imageflow', name: 'Images Flow', cat: 'Scroll', field: 'none', previewSize: 'large',
    note: '3D image flythrough on scroll', text: '',
    code: full('imageflow', [
      ...fontPreconnect(),
      css('https://fonts.googleapis.com/css2?family=Raleway:wght@200;300;400;600&display=swap'),
      css('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap'),
      js(GSAP('3.13.0')), js(SCROLLTRIGGER('3.13.0')),
      js('https://unpkg.com/lenis@1.3.15/dist/lenis.min.js')
    ]) },
  { id: 'clipreveal', name: 'Clip Path Reveal', cat: 'Scroll', field: 'none', previewSize: 'large',
    note: 'Full-screen panels reveal on scroll', text: '',
    code: full('clipreveal', [
      ...fontPreconnect(),
      css('https://fonts.googleapis.com/css2?family=Cormorant+Unicase:wght@300;400;500;600;700&family=Outfit:wght@200;300;400&family=DM+Mono:wght@300&display=swap'),
      js('https://unpkg.com/lenis@1.1.13/dist/lenis.min.js'),
      js('https://unpkg.com/gsap@3.12.5/dist/gsap.min.js'),
      js('https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js')
    ]) },

  /* ----- Shader ----- */
  { id: 'noisypixel', name: 'Noisy Pixel', cat: 'Shader', field: 'none', previewSize: 'large',
    note: 'WebGL pixel dissolve reveal', text: '',
    code: full('noisy', [js(THREE), js(GSAP('3.12.5')), js(SCROLLTRIGGER('3.12.5'))]) },
  { id: 'mirror', name: 'Mirror Effect', cat: 'Shader', field: 'none', previewSize: 'large',
    note: 'Sobel-edge dissolve between two images', text: '',
    code: full('mirror', [js(THREE)]) }
];

/** Sidebar group order. */
export const CATEGORIES = ['Web', 'Interactive', 'Scroll', 'Shader', 'Footer', 'Text', 'Cursor'];

/** Custom label for the editable text field of specific effects. */
export const FIELD_LABELS = { cursor1: 'Cursor label', cursor2: 'Cursor tag', cursor3: 'Caption text' };

export const BY_ID = Object.fromEntries(EFFECTS.map((e) => [e.id, e]));
