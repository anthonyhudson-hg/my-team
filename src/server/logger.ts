import { appendFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

/**
 * Every request sent to the Claude Agent SDK and every raw message it
 * streams back (init, deltas, tool calls, results, errors) gets logged
 * verbatim as one JSON-lines file per server run.
 *
 * Rotation is per-run rather than byte-size-based: each `npm run team`
 * invocation gets its own file, and old runs beyond RETENTION_COUNT are
 * pruned at startup. This sidesteps the concurrent-append/rotate-mid-write
 * hazards of size-based rotation, and maps naturally onto how you'd actually
 * want to debug this tool ("show me the log from my last session").
 *
 * Logs live outside the repo entirely (under the user's home directory),
 * not in .my-team/ alongside profile.json — they're ephemeral machine/debug
 * state, not shared project config, and may contain full file contents or
 * other repo material flowing through tool calls, so they should never risk
 * ending up committed.
 */

const RETENTION_COUNT = 20;

export interface Logger {
  log(entry: Record<string, unknown>): void;
  filePath: string;
}

/**
 * Every SDK request carries the full (sanitized) process environment as
 * `options.env` — dozens of unrelated OS/session variables that are noise,
 * not signal, for debugging model behavior. Logging that in full would
 * bloat every single entry with ~2KB of irrelevant PATH/OneDrive/etc.
 * clutter. Replace it with a count before logging; everything else in the
 * request (cwd, systemPrompt, permissionMode, resume) is logged verbatim.
 */
export function forLog<T extends { env?: Record<string, unknown> }>(options: T): T {
  if (!options.env) return options;
  return { ...options, env: `[${Object.keys(options.env).length} vars, omitted from log]` as unknown as T['env'] };
}

function repoKey(cwd: string): string {
  const hash = createHash('sha256').update(cwd).digest('hex').slice(0, 8);
  const base = path.basename(cwd).replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${base}-${hash}`;
}

export function createLogger(cwd: string): Logger {
  const dir = path.join(os.homedir(), '.my-team', 'logs');
  mkdirSync(dir, { recursive: true });

  const key = repoKey(cwd);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${key}-${timestamp}.jsonl`);

  try {
    const existing = readdirSync(dir)
      .filter((f) => f.startsWith(`${key}-`) && f.endsWith('.jsonl'))
      .map((f) => ({ f, mtime: statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const { f } of existing.slice(RETENTION_COUNT - 1)) {
      unlinkSync(path.join(dir, f));
    }
  } catch {
    // Pruning is best-effort; never block startup on it.
  }

  function log(entry: Record<string, unknown>): void {
    try {
      appendFileSync(filePath, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', 'utf-8');
    } catch {
      // Logging must never crash the thing it's trying to help debug.
    }
  }

  return { log, filePath };
}
