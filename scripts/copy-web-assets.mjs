import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const webOut = path.join(root, 'dist', 'web');

// Removed first so a file deleted from src/web (or a stale asset from an
// older layout) doesn't linger forever — cpSync only adds/overwrites.
rmSync(webOut, { recursive: true, force: true });
cpSync(path.join(root, 'src', 'web'), webOut, {
  recursive: true,
  filter: (src) => !src.endsWith('.test.js'),
});
