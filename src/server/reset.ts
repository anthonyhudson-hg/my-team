import { unlink } from 'node:fs/promises';
import { getHistoryPath } from './chat-history.js';
import { getGeneralHistoryPath } from './general-history.js';
import { getProfilePath } from './profile.js';

/**
 * "Factory reset" for a single repo's instance: deletes the committed profile
 * and the gitignored chat/general history, but leaves server.pid alone (it
 * belongs to this still-running process and is rewritten/removed on its own
 * lifecycle), leaves ui-prefs.json untouched (a personal display setting like
 * dark mode, not onboarding/instance content), and leaves ~/.cofound/logs
 * untouched (global debug logs, not per-repo instance state). Missing files
 * are not an error — resetting an already-fresh repo is a no-op.
 */
export async function resetInstance(cwd: string): Promise<void> {
  await Promise.all([
    unlink(getProfilePath(cwd)).catch(() => {}),
    unlink(getHistoryPath(cwd)).catch(() => {}),
    unlink(getGeneralHistoryPath(cwd)).catch(() => {}),
  ]);
}
