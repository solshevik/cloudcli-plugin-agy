import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const hasDist = fs.existsSync('dist/index.js') && fs.existsSync('dist/server.js');

try {
  const result = spawnSync('npx', ['--no-install', 'tsc'], { stdio: 'inherit' });
  if (result.status === 0) {
    process.exit(0);
  }
} catch {
  // tsc not available
}

// Fallback: If prebuilt dist files exist, succeed gracefully
if (hasDist) {
  console.log('[cloudcli-plugin-agy] Using pre-built dist output.');
  process.exit(0);
}

// Otherwise try global or local tsc
try {
  const result = spawnSync('tsc', [], { stdio: 'inherit' });
  if (result.status === 0) {
    process.exit(0);
  }
} catch {
  // failed
}

console.error('[cloudcli-plugin-agy] Build failed: neither tsc nor prebuilt dist/ was found.');
process.exit(1);
