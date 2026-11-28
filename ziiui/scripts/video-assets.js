import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const VIDEO_EXTENSION = '.mp4';

export function scanVideoAssets({ registryPath, videoDirectory }) {
  const registrySource = readFileSync(registryPath, 'utf8');
  const ids = [...registrySource.matchAll(/\bid:\s*(['"])([^'"]+)\1/g)].map((match) => match[2]);
  const entries = [...registrySource.matchAll(
    /\bid:\s*(['"])([^'"]+)\1,\s*name:\s*(['"])([^'"]+)\3/g
  )].map((match) => ({ id: match[2], name: match[4] }));
  const idCounts = new Map();
  ids.forEach((id) => idCounts.set(id, (idCounts.get(id) || 0) + 1));
  const duplicateIds = [...idCounts].filter(([, count]) => count > 1).map(([id]) => id);
  const expectedFilenameCounts = new Map();
  ids.forEach((id) => {
    const filename = `${id}${VIDEO_EXTENSION}`;
    expectedFilenameCounts.set(filename, (expectedFilenameCounts.get(filename) || 0) + 1);
  });
  const duplicateMappings = [...expectedFilenameCounts]
    .filter(([, count]) => count > 1)
    .map(([filename]) => filename);
  const registeredIds = new Set(ids);
  const filenames = readdirSync(videoDirectory).filter((filename) => {
    if (filename === '.gitkeep') {return false;}
    return statSync(join(videoDirectory, filename)).isFile();
  });
  const available = {};
  const unmappedFiles = [];
  const invalidFiles = [];
  const filenameMismatches = [];

  filenames.forEach((filename) => {
    const extension = extname(filename);
    if (extension !== VIDEO_EXTENSION) {
      invalidFiles.push(filename);
      return;
    }

    const id = filename.slice(0, -extension.length);
    if (!registeredIds.has(id)) {
      unmappedFiles.push(filename);
      const normalizedFilename = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const matchingEffect = entries.find((entry) =>
        entry.id !== id &&
        entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === normalizedFilename
      );
      if (matchingEffect) {
        filenameMismatches.push({
          filename,
          componentId: matchingEffect.id,
          expectedFilename: `${matchingEffect.id}${VIDEO_EXTENSION}`
        });
      }
      return;
    }
    if (Object.prototype.hasOwnProperty.call(available, id)) {
      duplicateIds.push(id);
      return;
    }
    available[id] = `./assets/videos/${filename}`;
  });

  const pendingIds = [...registeredIds].filter((id) => !available[id]);
  return {
    componentCount: ids.length,
    duplicateIds: [...new Set(duplicateIds)],
    available,
    pendingIds,
    unmappedFiles,
    invalidFiles,
    filenameMismatches,
    duplicateMappings
  };
}
