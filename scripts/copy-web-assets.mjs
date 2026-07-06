import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const webOut = path.join(root, 'dist', 'web');

// Removed first so a file deleted from src/web (or a stale asset from an
// older layout) doesn't linger forever — cpSync only adds/overwrites.
rmSync(webOut, { recursive: true, force: true });
// The .test.js filter keeps unit-test files out of the published package.
// The node_modules filter guards against a stray cache directory (e.g. from
// accidentally running a tool with src/web as its cwd) getting shipped -
// src/web should never legitimately contain one, since this whole tree is
// plain static assets with no dependencies of its own.
cpSync(path.join(root, 'src', 'web'), webOut, {
  recursive: true,
  filter: (src) => !src.endsWith('.test.js') && !src.split(path.sep).includes('node_modules'),
});
