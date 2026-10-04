/* Helpers for rendering generated HTML inside sandboxed preview iframes. */
import { esc } from './dom.js';
import { buildDoc } from '../effects/builders.js';

/** Posts runtime errors from the iframe back to the host page. */
const DEBUG_HOOK =
  '<script>' +
  'window.addEventListener("error",function(e){try{parent.postMessage({__ziiui:1,message:String((e&&e.message)||e)},"*");}catch(_){}});' +
  'window.addEventListener("unhandledrejection",function(e){try{parent.postMessage({__ziiui:1,message:"Promise: "+String((e&&e.reason)||e)},"*");}catch(_){}});' +
  '</script>';

/** Insert the error-reporting hook right after <head> (or prepend it). */
export function injectDebug(code) {
  const src = String(code || '');
  const marker = '<head>';
  const i = src.indexOf(marker);
  if (i === -1) return DEBUG_HOOK + '\n' + src;
  const at = i + marker.length;
  return src.slice(0, at) + '\n' + DEBUG_HOOK + src.slice(at);
}

const urls = new WeakMap();

/** Load HTML into an iframe through a Blob URL (revoking the previous one). */
export function setFrameHTML(frame, source) {
  if (!frame) return;
  const old = urls.get(frame);
  if (old) URL.revokeObjectURL(old);
  const blob = new Blob([String(source == null ? '' : source)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  urls.set(frame, url);
  frame.src = url;
}

export function errorDoc(title, message) {
  return buildDoc({
    title: 'ziiui — ' + title,
    css: 'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1115;color:#eceef2;font-family:system-ui,sans-serif;text-align:center;padding:2rem}h1{font-size:1.05rem;margin:0 0 .6rem;font-weight:700}code{display:block;color:#ff8a8a;font-size:.85rem;white-space:pre-wrap;word-break:break-word}',
    body: '<div><h1>' + esc(title) + '</h1><code>' + esc(message) + '</code></div>'
  });
}

export function emptyPreviewDoc() {
  return buildDoc({
    title: 'ziiui — Preview',
    css: 'body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#0f1115;color:#8b92a0}',
    body: 'Nothing to preview'
  });
}
