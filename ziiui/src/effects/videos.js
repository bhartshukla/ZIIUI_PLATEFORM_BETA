/**
 * Centralized video asset mapping for ZiiUI components.
 * ONE source of truth for all component card preview videos.
 *
 * To change a component's video, simply update its URL value below.
 * Supported keys include kebab-case slug, component name, or effect ID.
 *
 * Example:
 *   "micro-hover": "https://videos.pexels.com/video-files/...mp4"
 *   or
 *   "micro-hover": "https://www.pexels.com/video/a-close-up-shot-of-a-person-soldering-5736195/"
 */

export const COMPONENT_VIDEOS = {
  // Web
  'split-scroll': '/preview-placeholder-1.mp4',

  // Interactive
  'draggable-mask': '/preview-placeholder-1.mp4',
  'micro-hover': '/preview-placeholder-2.mp4',
  'hover-section': '/preview-placeholder-3.mp4',

  // Scroll
  'list-reveal': '/preview-placeholder-1.mp4',
  'scroll-stand': '/preview-placeholder-2.mp4',
  'scrolling-mask': '/preview-placeholder-3.mp4',
  'pin-rotate-sections': '/preview-placeholder-1.mp4',
  'images-flow': '/preview-placeholder-2.mp4',
  'clip-path-reveal': '/preview-placeholder-3.mp4',

  // Shader
  'noisy-pixel': '/preview-placeholder-1.mp4',
  'mirror-effect': '/preview-placeholder-2.mp4',

  // Footer
  'sticky-footer': '/preview-placeholder-3.mp4',
  'editorial-footer': '/preview-placeholder-1.mp4',

  // Text
  'text-effect': '/preview-placeholder-2.mp4',
  'custom-variants': '/preview-placeholder-3.mp4',
  'text-roll': '/preview-placeholder-1.mp4',
  'text-roll-custom': '/preview-placeholder-2.mp4',
  'text-scramble': '/preview-placeholder-3.mp4',
  'text-shimmer': '/preview-placeholder-1.mp4',
  'shimmer-wave': '/preview-placeholder-2.mp4',
  'shimmer-wave-colour': '/preview-placeholder-3.mp4',

  // Cursor
  'expand': '/preview-placeholder-1.mp4',
  'icon-label': '/preview-placeholder-2.mp4',
  'image-reveal': '/preview-placeholder-3.mp4',

  // Default fallback
  'default': '/preview-placeholder-2.mp4'
};

/**
 * Mapping between effect registry IDs and standard video mapping keys.
 */
const EFFECT_ID_ALIASES = {
  splitsection: 'split-scroll',
  maskdrag: 'draggable-mask',
  microhover: 'micro-hover',
  hoversection: 'hover-section',
  listreveal: 'list-reveal',
  scrolldown: 'scroll-stand',
  scrollmask: 'scrolling-mask',
  pinrotate: 'pin-rotate-sections',
  imageflow: 'images-flow',
  clipreveal: 'clip-path-reveal',
  noisypixel: 'noisy-pixel',
  mirror: 'mirror-effect',
  footer1: 'sticky-footer',
  footer2: 'editorial-footer',
  effect: 'text-effect',
  fancy: 'custom-variants',
  roll: 'text-roll',
  roll2: 'text-roll-custom',
  scramble: 'text-scramble',
  shimmer: 'text-shimmer',
  wave: 'shimmer-wave',
  wave2: 'shimmer-wave-colour',
  cursor1: 'expand',
  cursor2: 'icon-label',
  cursor3: 'image-reveal'
};

/**
 * Normalize an effect name or ID into a standardized lookup slug.
 */
function normalizeKey(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/^cursor:\s*/, '')
    .replace(/[()]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');
}

/**
 * Transforms external webpage URLs (such as Pexels video detail pages)
 * into direct playable video media URLs.
 */
export function resolveVideoSourceUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return COMPONENT_VIDEOS.default || '/preview-placeholder-2.mp4';
  }

  const trimmed = rawUrl.trim();

  // If the user supplied a Pexels webpage URL (e.g. https://www.pexels.com/video/...-5736195/)
  // extract the numeric video ID and point to the direct Pexels CDN stream
  const pexelsWebpageMatch = trimmed.match(/pexels\.com\/video\/(?:[a-zA-Z0-9_-]+-)?(\d+)\/?/i);
  if (pexelsWebpageMatch && pexelsWebpageMatch[1]) {
    const videoId = pexelsWebpageMatch[1];
    return `https://videos.pexels.com/video-files/${videoId}/${videoId}-sd_640_360_25fps.mp4`;
  }

  return trimmed;
}

/**
 * Lookup the video source URL for a given effect object, ID, or component name.
 *
 * @param {Object|string} effect - Effect registry object or string identifier
 * @returns {string} Direct video source URL
 */
export function getComponentVideoSource(effect) {
  if (!effect) return resolveVideoSourceUrl(COMPONENT_VIDEOS.default);

  const rawId = typeof effect === 'string' ? effect : (effect.id || '');
  const rawName = typeof effect === 'object' && effect.name ? effect.name : '';

  // 1. Check exact match by ID or key in COMPONENT_VIDEOS
  if (COMPONENT_VIDEOS[rawId]) {
    return resolveVideoSourceUrl(COMPONENT_VIDEOS[rawId]);
  }

  // 2. Check alias from registry ID
  const aliasKey = EFFECT_ID_ALIASES[rawId];
  if (aliasKey && COMPONENT_VIDEOS[aliasKey]) {
    return resolveVideoSourceUrl(COMPONENT_VIDEOS[aliasKey]);
  }

  // 3. Check normalized name
  const nameSlug = normalizeKey(rawName);
  if (nameSlug && COMPONENT_VIDEOS[nameSlug]) {
    return resolveVideoSourceUrl(COMPONENT_VIDEOS[nameSlug]);
  }

  // 4. Check normalized ID
  const idSlug = normalizeKey(rawId);
  if (idSlug && COMPONENT_VIDEOS[idSlug]) {
    return resolveVideoSourceUrl(COMPONENT_VIDEOS[idSlug]);
  }

  // 5. Fallback to default
  return resolveVideoSourceUrl(COMPONENT_VIDEOS.default || '/preview-placeholder-2.mp4');
}
