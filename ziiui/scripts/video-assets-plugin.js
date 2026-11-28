import { mkdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { scanVideoAssets } from './video-assets.js';

const VIRTUAL_MODULE_ID = 'virtual:ziiui-video-assets';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

export function videoAssetsPlugin(rootDirectory) {
  const registryPath = resolve(rootDirectory, 'src/effects/registry.js');
  const videoDirectory = resolve(rootDirectory, 'public/assets/videos');
  let audit;

  mkdirSync(videoDirectory, { recursive: true });

  const scan = () => {
    audit = scanVideoAssets({ registryPath, videoDirectory });
    if (audit.duplicateIds.length) {
      throw new Error(`[video-assets] Duplicate component IDs: ${audit.duplicateIds.join(', ')}`);
    }
    return audit;
  };

  const logAudit = (logger) => {
    const result = scan();
    logger.info(
      `[video-assets] ${Object.keys(result.available).length} available, ` +
      `${result.pendingIds.length} pending, ${result.unmappedFiles.length} unmapped, ` +
      `${result.invalidFiles.length} invalid`
    );
    if (result.pendingIds.length) {
      logger.info(`[video-assets] Pending IDs: ${result.pendingIds.join(', ')}`);
    }
    if (result.unmappedFiles.length) {
      logger.warn(`[video-assets] Unmapped files: ${result.unmappedFiles.join(', ')}`);
    }
    if (result.invalidFiles.length) {
      logger.warn(`[video-assets] Invalid video filenames/extensions: ${result.invalidFiles.join(', ')}`);
    }
    if (result.filenameMismatches.length) {
      logger.warn(`[video-assets] Filename mismatches: ${result.filenameMismatches.map(
        ({ filename, expectedFilename }) => `${filename} -> ${expectedFilename}`
      ).join(', ')}`);
    }
    return result;
  };

  return {
    name: 'ziiui-video-assets',
    enforce: 'pre',
    resolveId(id) {
      return id === VIRTUAL_MODULE_ID ? RESOLVED_VIRTUAL_MODULE_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {return null;}
      const current = audit || scan();
      return [
        `export const VIDEO_ASSETS = Object.freeze(${JSON.stringify(current.available)});`,
        `export const VIDEO_ASSET_AUDIT = Object.freeze(${JSON.stringify({
          componentCount: current.componentCount,
          pendingIds: current.pendingIds,
          unmappedFiles: current.unmappedFiles,
          invalidFiles: current.invalidFiles,
          filenameMismatches: current.filenameMismatches,
          duplicateMappings: current.duplicateMappings
        })});`
      ].join('\n');
    },
    buildStart() {
      logAudit(this);
    },
    configureServer(server) {
      server.watcher.add(videoDirectory);
      server.watcher.add(registryPath);
      server.watcher.on('all', (event, changedPath) => {
        const absolutePath = resolve(changedPath);
        const isRegistryChange = absolutePath === registryPath && event === 'change';
        const isVideoChange = ['add', 'unlink'].includes(event) &&
          absolutePath.startsWith(`${videoDirectory}${sep}`);
        if (!isRegistryChange && !isVideoChange) {
          return;
        }
        logAudit(server.config.logger);
        const virtualModule = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
        if (virtualModule) {
          server.moduleGraph.invalidateModule(virtualModule);
        }
        server.ws.send({ type: 'full-reload' });
      });
      logAudit(server.config.logger);
    }
  };
}
