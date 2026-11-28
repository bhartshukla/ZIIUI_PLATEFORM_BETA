import { resolve } from 'node:path';
import { scanVideoAssets } from './video-assets.js';

const rootDirectory = process.cwd();
const audit = scanVideoAssets({
  registryPath: resolve(rootDirectory, 'src/effects/registry.js'),
  videoDirectory: resolve(rootDirectory, 'public/assets/videos')
});
const availableCount = Object.keys(audit.available).length;

console.log(
  `Components: ${audit.componentCount}; videos: ${availableCount} AVAILABLE, ${audit.pendingIds.length} PENDING`
);
console.log(
  `Unmapped files: ${audit.unmappedFiles.length}; filename mismatches: ${audit.filenameMismatches.length}; ` +
  `invalid files: ${audit.invalidFiles.length}; duplicate IDs: ${audit.duplicateIds.length}; ` +
  `duplicate mappings: ${audit.duplicateMappings.length}`
);
if (audit.pendingIds.length) {
  console.log(`Pending component IDs: ${audit.pendingIds.join(', ')}`);
}
if (audit.unmappedFiles.length) {
  console.error(`Unmapped video files: ${audit.unmappedFiles.join(', ')}`);
}
if (audit.invalidFiles.length) {
  console.error(`Invalid video filenames/extensions: ${audit.invalidFiles.join(', ')}`);
}
if (audit.filenameMismatches.length) {
  console.error(`Filename mismatches: ${audit.filenameMismatches.map(
    ({ filename, expectedFilename }) => `${filename} -> ${expectedFilename}`
  ).join(', ')}`);
}
if (audit.duplicateIds.length) {
  console.error(`Duplicate component IDs: ${audit.duplicateIds.join(', ')}`);
}
if (audit.duplicateMappings.length) {
  console.error(`Duplicate video mappings: ${audit.duplicateMappings.join(', ')}`);
}

if (
  audit.unmappedFiles.length || audit.filenameMismatches.length || audit.invalidFiles.length ||
  audit.duplicateIds.length || audit.duplicateMappings.length
) {
  process.exitCode = 1;
}
