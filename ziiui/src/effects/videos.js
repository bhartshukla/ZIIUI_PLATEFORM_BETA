import { EFFECTS } from './registry.js';
import { VIDEO_ASSETS, VIDEO_ASSET_AUDIT } from 'virtual:ziiui-video-assets';

/**
 * The registry defines the expected path for every effect. Vite provides the
 * discovered files so pending assets never become broken media URLs.
 */
export const VIDEO_REGISTRY = Object.freeze(Object.fromEntries(
  EFFECTS.map(({ id }) => [id, `./assets/videos/${id}.mp4`])
));
export const VIDEO_DIRECTORY = './assets/videos/';
export const VIDEO_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  PENDING: 'PENDING',
  ERROR: 'ERROR',
  UNMAPPED: 'UNMAPPED'
});

const failedIds = new Set();

/**
 * Return the playable URL only when the corresponding file exists.
 *
 * @param {string} componentId - Effect ID from the registry
 * @returns {string|null} Public asset URL, or null while the asset is pending
 */
export function getComponentVideo(componentId) {
  if (typeof componentId !== 'string' || !VIDEO_REGISTRY[componentId] || failedIds.has(componentId)) {
    return null;
  }
  return VIDEO_ASSETS[componentId] || null;
}

export function getComponentVideoStatus(componentId) {
  if (!VIDEO_REGISTRY[componentId]) {return VIDEO_STATUS.UNMAPPED;}
  if (failedIds.has(componentId)) {return VIDEO_STATUS.ERROR;}
  return VIDEO_ASSETS[componentId] ? VIDEO_STATUS.AVAILABLE : VIDEO_STATUS.PENDING;
}

export function markComponentVideoError(componentId) {
  if (VIDEO_REGISTRY[componentId]) {failedIds.add(componentId);}
}

export function getVideoAssetAudit() {
  const statuses = Object.fromEntries(Object.keys(VIDEO_REGISTRY).map((id) => [id, getComponentVideoStatus(id)]));
  return {
    statuses,
    pendingIds: Object.keys(statuses).filter((id) => statuses[id] === VIDEO_STATUS.PENDING),
    unmappedFiles: [...VIDEO_ASSET_AUDIT.unmappedFiles],
    invalidFiles: [...VIDEO_ASSET_AUDIT.invalidFiles],
    filenameMismatches: [...VIDEO_ASSET_AUDIT.filenameMismatches],
    duplicateMappings: [...VIDEO_ASSET_AUDIT.duplicateMappings]
  };
}

export function getComponentVideoSource(effect) {
  if (typeof effect === 'string') {
    const id = VIDEO_REGISTRY[effect]
      ? effect
      : EFFECTS.find(({ name }) => name === effect)?.id;
    return id ? getComponentVideo(id) : null;
  }
  return effect && typeof effect.id === 'string' ? getComponentVideo(effect.id) : null;
}
