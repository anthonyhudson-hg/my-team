import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { npmInstall } from './npm-install.js';
import { OWN_PACKAGE_NAME, OWN_PACKAGE_ROOT, OWN_PACKAGE_VERSION } from './own-package.js';

function addCofoundScript(repoPackageJsonPath: string): void {
  const raw = readFileSync(repoPackageJsonPath, 'utf-8');
  const pkg = JSON.parse(raw);
  pkg.scripts ??= {};

  if (pkg.scripts.cofound) {
    if (pkg.scripts.cofound !== 'cofound') {
      console.warn(`package.json already has a "cofound" script ("${pkg.scripts.cofound}") — leaving it untouched. Run "npx cofound" directly instead.`);
    }
    return;
  }

  pkg.scripts.cofound = 'cofound';
  writeFileSync(repoPackageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Added "npm run cofound" script to package.json.');
}

// .cofound/profile.json is deliberately NOT in this list — it's committed
// (see README: it's shared, non-sensitive team config, the same category as
// CLAUDE.md). Everything below is either arbitrary conversation content,
// a personal display preference, or per-machine-run ephemeral state; none
// of it belongs in git.
const GITIGNORE_ENTRIES = [
  '.cofound/chat-history.jsonl',
  '.cofound/general-history.jsonl',
  '.cofound/ui-prefs.json',
  '.cofound/server.pid',
];

export function ensureGitignore(cwd: string): void {
  const gitignorePath = path.join(cwd, '.gitignore');
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const existingLines = new Set(existing.split('\n').map((l) => l.trim()));
  const missing = GITIGNORE_ENTRIES.filter((entry) => !existingLines.has(entry));
  if (!missing.length) return;

  const separator = existing && !existing.endsWith('\n') ? '\n' : '';
  writeFileSync(gitignorePath, existing + separator + missing.join('\n') + '\n');
  console.log(`Added ${missing.join(', ')} to .gitignore.`);
}

export async function runInit(cwd: string): Promise<void> {
  const repoPackageJsonPath = path.join(cwd, 'package.json');
  if (!existsSync(repoPackageJsonPath)) {
    console.error(`No package.json found at ${cwd}. Run "npm init" first, then re-run "npx ${OWN_PACKAGE_NAME} init".`);
    process.exitCode = 1;
    return;
  }

  const installed = npmInstall(cwd, `${OWN_PACKAGE_NAME}@${OWN_PACKAGE_VERSION}`) || npmInstall(cwd, OWN_PACKAGE_ROOT);
  if (!installed) {
    console.error('Failed to install Cofound as a devDependency.');
    process.exitCode = 1;
    return;
  }

  addCofoundScript(repoPackageJsonPath);
  ensureGitignore(cwd);
  console.log('Done — run "npm run cofound" to launch.');
}
