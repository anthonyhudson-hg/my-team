import { spawnSync } from 'node:child_process';

/**
 * On Windows, npm is a .cmd batch file that spawnSync can't execute
 * directly (EINVAL). Routing through cmd.exe /c as the actual child
 * (rather than shell: true) avoids that without the argument-escaping
 * risk Node warns about (DEP0190) for shell: true + an args array.
 */
export function npmInstall(cwd: string, spec: string): boolean {
  const result =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm', 'install', '--save-dev', spec], { cwd, stdio: 'inherit' })
      : spawnSync('npm', ['install', '--save-dev', spec], { cwd, stdio: 'inherit' });
  return result.status === 0;
}
