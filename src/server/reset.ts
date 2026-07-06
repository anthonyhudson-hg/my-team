import { unlink } from 'node:fs/promises';
import { getHistoryPath } from './chat-history.js';
import { getProfilePath } from './profile.js';

/**
 * "Factory reset" for a single repo's instance: deletes the committed profile
 * and the gitignored chat history, but leaves server.pid alone (it belongs to
 * this still-running process and is rewritten/removed on its own lifecycle)
 * and leaves ~/.my-team/logs untouched (those are global debug logs, not
 * per-repo instance state). Missing files are not an error — resetting an
 * already-fresh repo is a no-op.
 */
export async function resetInstance(cwd: string): Promise<void> {
  await Promise.all([
    unlink(getProfilePath(cwd)).catch(() => {}),
    unlink(getHistoryPath(cwd)).catch(() => {}),
  ]);
}
