import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { npmInstall } from './npm-install.js';
import { OWN_PACKAGE_NAME, OWN_PACKAGE_ROOT, OWN_PACKAGE_VERSION } from './own-package.js';

function addTeamScript(repoPackageJsonPath: string): void {
  const raw = readFileSync(repoPackageJsonPath, 'utf-8');
  const pkg = JSON.parse(raw);
  pkg.scripts ??= {};

  if (pkg.scripts.team) {
    if (pkg.scripts.team !== 'my-team') {
      console.warn(`package.json already has a "team" script ("${pkg.scripts.team}") — leaving it untouched. Run "npx my-team" directly instead.`);
    }
    return;
  }

  pkg.scripts.team = 'my-team';
  writeFileSync(repoPackageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Added "npm run team" script to package.json.');
}

// Only these two files are ignored — .my-team/profile.json is deliberately
// committed (see README: it's shared, non-sensitive team config, the same
// category as CLAUDE.md). Chat history can contain arbitrary conversation
// content and server.pid is per-machine-run ephemeral state; neither
// belongs in git.
const GITIGNORE_ENTRIES = ['.my-team/chat-history.jsonl', '.my-team/server.pid'];

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
    console.error('Failed to install my-team as a devDependency.');
    process.exitCode = 1;
    return;
  }

  addTeamScript(repoPackageJsonPath);
  ensureGitignore(cwd);
  console.log('Done — run "npm run team" to launch.');
}
