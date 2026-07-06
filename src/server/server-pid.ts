import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getProfileDir } from './profile.js';

/**
 * Lets Claude (or the user) identify the dashboard's own process before
 * doing anything that might broadly restart or kill node processes in this
 * repo (e.g. restarting a dev server) — see the system-prompt guardrail in
 * profile.ts. Written at startup, removed on graceful shutdown.
 */
export function getServerPidPath(cwd: string): string {
  return path.join(getProfileDir(cwd), 'server.pid');
}

export async function writeServerPid(cwd: string, port: number): Promise<void> {
  await mkdir(getProfileDir(cwd), { recursive: true });
  await writeFile(getServerPidPath(cwd), JSON.stringify({ pid: process.pid, port }, null, 2) + '\n', 'utf-8');
}

export async function removeServerPid(cwd: string): Promise<void> {
  await unlink(getServerPidPath(cwd)).catch(() => {});
}
