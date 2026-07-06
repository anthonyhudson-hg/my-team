import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
cpSync(path.join(root, 'src', 'web'), path.join(root, 'dist', 'web'), { recursive: true });
