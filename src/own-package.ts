import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/own-package.js -> package root is one level up.
export const OWN_PACKAGE_ROOT = path.join(__dirname, '..');
export const OWN_PACKAGE_JSON = JSON.parse(readFileSync(path.join(OWN_PACKAGE_ROOT, 'package.json'), 'utf-8'));
export const OWN_PACKAGE_NAME: string = OWN_PACKAGE_JSON.name;
export const OWN_PACKAGE_VERSION: string = OWN_PACKAGE_JSON.version;
