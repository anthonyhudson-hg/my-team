import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getProfileDir } from './profile.js';

/**
 * Persists the visible chat transcript (not just Claude's own session
 * context, which already survives via `resume`) so a page reload — and a
 * full server restart — both show prior conversation instead of an empty
 * thread. Deliberately separate from profile.json: this can contain
 * arbitrary conversation content, so unlike the company profile it must
 * never be committed (see init.ts's .gitignore handling).
 *
 * A perfectly interleaved replay (text/tool-use/text/tool-use exactly as it
 * streamed live) isn't attempted — tool-use entries are appended as they
 * occur and the turn's full assistant text is appended once at the end, so
 * a replayed turn shows all its tool-use markers before its text rather
 * than interleaved. Good enough for "the conversation is still here after
 * a restart"; not worth the complexity of a fully faithful replay.
 */
export type HistoryEntry =
  | { kind: 'user'; text: string; ts: string }
  | { kind: 'widget-answer'; text: string; ts: string }
  | { kind: 'assistant'; text: string; model: string; effort: string; ts: string }
  | { kind: 'tool'; name: string; ts: string }
  | { kind: 'error'; message: string; ts: string };

function getHistoryPath(cwd: string): string {
  return path.join(getProfileDir(cwd), 'chat-history.jsonl');
}

export async function appendHistory(cwd: string, entry: HistoryEntry): Promise<void> {
  const dir = getProfileDir(cwd);
  try {
    await mkdir(dir, { recursive: true });
    await appendFile(getHistoryPath(cwd), JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // History is a nice-to-have replay, not a source of truth — never let a
    // disk error here interrupt the actual conversation.
  }
}

export async function readHistory(cwd: string): Promise<HistoryEntry[]> {
  let raw: string;
  try {
    raw = await readFile(getHistoryPath(cwd), 'utf-8');
  } catch {
    return [];
  }
  const entries: HistoryEntry[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip a corrupted line (e.g. a torn write from a crash) rather than
      // discarding the entire history.
    }
  }
  return entries;
}
