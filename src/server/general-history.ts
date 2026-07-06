import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getProfileDir } from './profile.js';

/**
 * #general has no multi-user backend (my-team is single-developer) and no AI
 * participant — it's a plain persisted notes channel so messages survive a
 * reload/restart instead of vanishing, same rationale as chat-history.ts.
 * Gitignored: this is local instance data, not shared team config.
 */
export interface GeneralMessage {
  name: string;
  text: string;
  ts: string;
}

export function getGeneralHistoryPath(cwd: string): string {
  return path.join(getProfileDir(cwd), 'general-history.jsonl');
}

export async function appendGeneralMessage(cwd: string, message: GeneralMessage): Promise<void> {
  const dir = getProfileDir(cwd);
  try {
    await mkdir(dir, { recursive: true });
    await appendFile(getGeneralHistoryPath(cwd), JSON.stringify(message) + '\n', 'utf-8');
  } catch {
    // Best-effort persistence, same as chat-history.ts — never block sending.
  }
}

export async function readGeneralHistory(cwd: string): Promise<GeneralMessage[]> {
  let raw: string;
  try {
    raw = await readFile(getGeneralHistoryPath(cwd), 'utf-8');
  } catch {
    return [];
  }
  const messages: GeneralMessage[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Skip a corrupted line rather than discarding the entire history.
    }
  }
  return messages;
}
