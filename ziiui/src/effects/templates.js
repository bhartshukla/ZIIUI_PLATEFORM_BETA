/*
 * Template loader.
 *
 * Every file under ./templates/<group>/ is imported as a raw string at build
 * time and looked up by its file name, e.g. tpl('cursor1.css').
 * Placeholders use the @@NAME@@ syntax (see fill()) or __TEXT__ for user text.
 *
 * Stage 4B: a lazy (on-demand) loader is introduced alongside the existing
 * eager loader. Eager imports remain for backward compatibility until all
 * synchronous consumers are migrated.
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

/* ---------------- Lazy loader (Stage 4B) ---------------- */

const lazyFiles = import.meta.glob('./templates/**/*.{css,html,js}', {
  query: '?raw',
  import: 'default'
});

const lazyByName = {};
for (const path of Object.keys(lazyFiles)) {
  lazyByName[path.split('/').pop()] = lazyFiles[path];
}

const cache = new Map();
const inflight = new Map();

export function hasLazyTemplate(name) {
  return Object.prototype.hasOwnProperty.call(lazyByName, name);
}

export async function loadTemplate(name) {
  if (typeof name !== 'string' || !name) {
    throw new Error('[ziiui] loadTemplate requires a template name');
  }
  if (cache.has(name)) {
    return cache.get(name);
  }
  if (inflight.has(name)) {
    return inflight.get(name);
  }
  const loader = lazyByName[name];
  if (typeof loader !== 'function') {
    const err = new Error(`[ziiui] missing template: ${name}`);
    throw err;
  }
  const promise = (async () => {
    try {
      const source = await loader();
      const normalized = norm(source).replace(/^\n/, '').replace(/\s+$/, '');
      cache.set(name, normalized);
      return normalized;
    } catch (err) {
      inflight.delete(name);
      throw err;
    }
  })();
  inflight.set(name, promise);
  try {
    const result = await promise;
    inflight.delete(name);
    return result;
  } catch (err) {
    inflight.delete(name);
    throw err;
  }
}

export async function preloadTemplates(names) {
  if (!Array.isArray(names)) { return; }
  await Promise.all(names.map((n) => loadTemplate(n).catch(() => null)));
}

export function clearTemplateCache() {
  cache.clear();
  inflight.clear();
}

export function getTemplateCacheSize() {
  return cache.size;
}
