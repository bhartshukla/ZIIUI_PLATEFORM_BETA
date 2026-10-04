/*
 * Template loader.
 *
 * Every file under ./templates/<group>/ is imported as a raw string at build
 * time and looked up by its file name, e.g. tpl('cursor1.css').
 * Placeholders use the @@NAME@@ syntax (see fill()) or __TEXT__ for user text.
 */
import { norm } from '../lib/dom.js';

const files = import.meta.glob('./templates/**/*.{css,html,js}', {
  query: '?raw',
  import: 'default',
  eager: true
});

const byName = {};
for (const [path, source] of Object.entries(files)) {
  byName[path.split('/').pop()] = source;
}

export function hasTemplate(name) {
  return Object.prototype.hasOwnProperty.call(byName, name);
}

export function tpl(name) {
  if (!hasTemplate(name)) {
    console.warn('[ziiui] missing template:', name);
    return '';
  }
  return norm(byName[name]).replace(/^\n/, '').replace(/\s+$/, '');
}

/** Replace @@KEY@@ placeholders; unknown keys are left untouched. */
export function fill(source, map) {
  return String(source || '').replace(/@@(\w+)@@/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : m
  );
}
