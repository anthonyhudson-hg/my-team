import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/init.js -> package root is one level up.
const OWN_PACKAGE_ROOT = path.join(__dirname, '..');
const OWN_PACKAGE_JSON = JSON.parse(readFileSync(path.join(OWN_PACKAGE_ROOT, 'package.json'), 'utf-8'));

function npmInstall(cwd: string, spec: string): boolean {
  // On Windows, npm is a .cmd batch file that spawnSync can't execute
  // directly (EINVAL). Routing through cmd.exe /c as the actual child
  // (rather than shell: true) avoids that without the argument-escaping
  // risk Node warns about (DEP0190) for shell: true + an args array.
  const result =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm', 'install', '--save-dev', spec], { cwd, stdio: 'inherit' })
      : spawnSync('npm', ['install', '--save-dev', spec], { cwd, stdio: 'inherit' });
  return result.status === 0;
}

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

export async function runInit(cwd: string): Promise<void> {
  const repoPackageJsonPath = path.join(cwd, 'package.json');
  const name = OWN_PACKAGE_JSON.name;
  if (!existsSync(repoPackageJsonPath)) {
    console.error(`No package.json found at ${cwd}. Run "npm init" first, then re-run "npx ${name} init".`);
    process.exitCode = 1;
    return;
  }

  const version = OWN_PACKAGE_JSON.version;
  const installed = npmInstall(cwd, `${name}@${version}`) || npmInstall(cwd, OWN_PACKAGE_ROOT);
  if (!installed) {
    console.error('Failed to install my-team as a devDependency.');
    process.exitCode = 1;
    return;
  }

  addTeamScript(repoPackageJsonPath);
  console.log('Done — run "npm run team" to launch.');
}
