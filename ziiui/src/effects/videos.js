/**
 * Centralized video asset mapping for ZiiUI components.
 * ONE source of truth for all component card preview videos.
 *
 * To change a component's video, update its filename or URL below.
 * You can use:
 *   - Local filename inside /public/videos/ (e.g. "Split Scroll.mp4")
 *   - Absolute path (e.g. "/my-videos/Split Scroll.mp4")
 *   - Full CDN or external video URL (e.g. "https://example.com/video.mp4")
 *
 * If a component has no video defined or the file is missing,
 * it returns null and no fake/default video is shown.
 */

/**
 * Base directory for local component preview videos (inside public/ folder).
 * Defaults to '/videos/'. Update this single setting if your assets move.
 */
export const VIDEO_BASE_PATH = '/videos/';

/**
 * Component-specific video filename mapping.
 * Uses exact component names as specified.
 */
export const COMPONENT_VIDEOS = {
  // Web
  'Split Scroll': 'Split Scroll.mp4',

  // Interactive
  'Draggable Mask': 'Draggable Mask.mp4',
  'Micro Hover': 'Micro Hover.mp4',
  'Hover Section': 'Hover Section.mp4',

  // Scroll
  'List Reveal': 'List Reveal.mp4',
  'Scroll Stand': 'Scroll Stand.mp4',
  'Scrolling Mask': 'Scrolling Mask.mp4',
  'Pin Rotate Sections': 'Pin Rotate Sections.mp4',
  'Images Flow': 'Images Flow.mp4',
  'Clip Path Reveal': 'Clip Path Reveal.mp4',

  // Shader
  'Noisy Pixel': 'Noisy Pixel.mp4',
  'Mirror Effect': 'Mirror Effect.mp4',

  // Footer
  'Sticky Footer': 'Sticky Footer.mp4',
  'Editorial Footer': 'Editorial Footer.mp4',

  // Text
  'Text Effect': 'Text Effect.mp4',
  'Custom Variants': 'Custom Variants.mp4',
  'Text Roll': 'Text Roll.mp4',
  'Text Roll (custom)': 'Text Roll (custom).mp4',
  'Text Scramble': 'Text Scramble.mp4',
  'Text Shimmer': 'Text Shimmer.mp4',
  'Shimmer Wave': 'Shimmer Wave.mp4',
  'Shimmer Wave (colour)': 'Shimmer Wave (colour).mp4',

  // Cursor
  'Expand': 'Expand.mp4',
  'Icon Label': 'Icon Label.mp4',
  'Image Reveal': 'Image Reveal.mp4'
};

/**
 * Alias map linking effect IDs to their canonical component names.
 */
const EFFECT_ID_TO_NAME = {
  splitsection: 'Split Scroll',
  maskdrag: 'Draggable Mask',
  microhover: 'Micro Hover',
  hoversection: 'Hover Section',
  listreveal: 'List Reveal',
  scrolldown: 'Scroll Stand',
  scrollmask: 'Scrolling Mask',
  pinrotate: 'Pin Rotate Sections',
  imageflow: 'Images Flow',
  clipreveal: 'Clip Path Reveal',
  noisypixel: 'Noisy Pixel',
  mirror: 'Mirror Effect',
  footer1: 'Sticky Footer',
  footer2: 'Editorial Footer',
  effect: 'Text Effect',
  fancy: 'Custom Variants',
  roll: 'Text Roll',
  roll2: 'Text Roll (custom)',
  scramble: 'Text Scramble',
  shimmer: 'Text Shimmer',
  wave: 'Shimmer Wave',
  wave2: 'Shimmer Wave (colour)',
  cursor1: 'Expand',
  cursor2: 'Icon Label',
  cursor3: 'Image Reveal'
};

/**
 * Resolve a filename or URL into a final playable source path.
 * Returns null if empty.
 */
export function resolveVideoSourceUrl(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  // External video detail URLs (e.g. Pexels page) -> direct stream
  const pexelsMatch = trimmed.match(/pexels\.com\/video\/(?:[a-zA-Z0-9_-]+-)?(\d+)\/?/i);
  if (pexelsMatch && pexelsMatch[1]) {
    const videoId = pexelsMatch[1];
    return `https://videos.pexels.com/video-files/${videoId}/${videoId}-sd_640_360_25fps.mp4`;
  }

  // Absolute URL or root-relative path
  if (/^(?:https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }

  // Relative filename placed in the centralized video directory
  const base = VIDEO_BASE_PATH.endsWith('/') ? VIDEO_BASE_PATH : `${VIDEO_BASE_PATH}/`;
  return `${base}${encodeURI(trimmed)}`;
}

/**
 * Look up the video source URL for a given effect object, ID, or component name.
 * Returns null if no video is mapped (never returns a fake/default video).
 *
 * @param {Object|string} effect - Effect registry item or identifier
 * @returns {string|null} Direct video URL, or null if none
 */
export function getComponentVideoSource(effect) {
  if (!effect) return null;

  const str = typeof effect === 'string' ? effect : '';
  const rawId = typeof effect === 'string' ? effect : (effect.id || '');
  const rawName = typeof effect === 'object' && effect.name ? effect.name : str;

  // 1. Exact match on rawName (e.g. "Split Scroll", "Text Roll (custom)")
  if (rawName && COMPONENT_VIDEOS[rawName]) {
    return resolveVideoSourceUrl(COMPONENT_VIDEOS[rawName]);
  }

  // 2. Strip "Cursor: " prefix if present (e.g. "Cursor: Expand" -> "Expand")
  const strippedName = rawName.replace(/^Cursor:\s*/i, '').trim();
  if (strippedName && COMPONENT_VIDEOS[strippedName]) {
    return resolveVideoSourceUrl(COMPONENT_VIDEOS[strippedName]);
  }

  // 3. ID lookup via canonical alias
  const canonicalName = EFFECT_ID_TO_NAME[rawId];
  if (canonicalName && COMPONENT_VIDEOS[canonicalName]) {
    return resolveVideoSourceUrl(COMPONENT_VIDEOS[canonicalName]);
  }

  // 4. Exact match on rawId in COMPONENT_VIDEOS
  if (rawId && COMPONENT_VIDEOS[rawId]) {
    return resolveVideoSourceUrl(COMPONENT_VIDEOS[rawId]);
  }

  // No video exists for this component — do not return any default video
  return null;
}
