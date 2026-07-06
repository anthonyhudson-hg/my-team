import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Backs the Files page: the actual working tree of the repo `cofound` is
 * running in, not a stand-in/mock. When the repo is a git checkout (the
 * common case), file listing and change status come from git itself
 * (`ls-files` / `status --porcelain`) so "what's here" and "what's changed"
 * always match what `git` would tell you at the terminal. Falls back to a
 * plain recursive directory walk for a non-git directory.
 */

export type FileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'unmodified';

export interface FileEntry {
  path: string;
  status: FileStatus;
}

const EXCLUDED_NAMES = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache']);
const MAX_CONTENT_BYTES = 512 * 1024;

function git(cwd: string, args: string[]): { status: number | null; stdout: string } {
  const result = spawnSync('git', args, { cwd, encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? '' };
}

export function isGitRepo(cwd: string): boolean {
  return git(cwd, ['rev-parse', '--is-inside-work-tree']).status === 0;
}

function statusMapFromPorcelain(cwd: string): Map<string, FileStatus> {
  const map = new Map<string, FileStatus>();
  const { stdout } = git(cwd, ['status', '--porcelain=v1', '-uall']);
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    // A rename line looks like "R  old-path -> new-path" - only the new path matters here.
    const rawPath = line.slice(3);
    const filePath = rawPath.includes(' -> ') ? rawPath.split(' -> ')[1] : rawPath;
    let status: FileStatus = 'modified';
    if (code.includes('?')) status = 'untracked';
    else if (code.includes('A')) status = 'added';
    else if (code.includes('D')) status = 'deleted';
    else if (code.includes('R')) status = 'renamed';
    map.set(filePath.trim(), status);
  }
  return map;
}

function listFilesGit(cwd: string): FileEntry[] {
  const tracked = git(cwd, ['ls-files']).stdout.split('\n').filter(Boolean);
  const untracked = git(cwd, ['ls-files', '--others', '--exclude-standard']).stdout.split('\n').filter(Boolean);
  const statusMap = statusMapFromPorcelain(cwd);
  const all = new Set([...tracked, ...untracked]);
  return [...all].sort().map((p) => ({ path: p, status: statusMap.get(p) ?? 'unmodified' }));
}

function listFilesPlain(cwd: string, rel = ''): FileEntry[] {
  const dir = path.join(cwd, rel);
  const entries: FileEntry[] = [];
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return entries;
  }
  for (const name of names) {
    if (EXCLUDED_NAMES.has(name) || name.startsWith('.')) continue;
    const relPath = rel ? `${rel}/${name}` : name;
    let st;
    try {
      st = statSync(path.join(dir, name));
    } catch {
      continue;
    }
    if (st.isDirectory()) entries.push(...listFilesPlain(cwd, relPath));
    else entries.push({ path: relPath, status: 'unmodified' });
  }
  return entries;
}

export function listFiles(cwd: string): FileEntry[] {
  return isGitRepo(cwd) ? listFilesGit(cwd) : listFilesPlain(cwd);
}

export interface GitInfo {
  isGitRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
}

/**
 * Parsed from `git status -b --porcelain=v1`'s first line, e.g.
 * "## main...origin/main [ahead 2, behind 1]" or just "## main" with no
 * upstream configured. Real ahead/behind counts, not a decorative "↑2 ↓0".
 */
export function getGitInfo(cwd: string): GitInfo {
  if (!isGitRepo(cwd)) return { isGitRepo: false, branch: '', ahead: 0, behind: 0 };
  const { stdout } = git(cwd, ['status', '--porcelain=v1', '-b']);
  const firstLine = stdout.split('\n')[0] ?? '';
  const branchMatch = /^## ([^.\s]+)/.exec(firstLine);
  const branch = branchMatch ? branchMatch[1] : '';
  const aheadMatch = /ahead (\d+)/.exec(firstLine);
  const behindMatch = /behind (\d+)/.exec(firstLine);
  return {
    isGitRepo: true,
    branch: branch || '(detached)',
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0,
  };
}

/**
 * True only when relPath is a clean repo-relative path that can't escape
 * cwd. Deliberately doesn't compare against `path.normalize(relPath)` for
 * equality — on Windows that rewrites forward slashes to backslashes, so a
 * perfectly safe git-style path (`src/server/files.ts`) would never match
 * its own normalized form and every request would be rejected.
 */
export function isSafeRelativePath(relPath: string): boolean {
  if (!relPath || path.isAbsolute(relPath) || /^[a-zA-Z]:/.test(relPath)) return false;
  const segments = relPath.split(/[\\/]/);
  return !segments.includes('..') && !segments.some((s) => s === '');
}

function looksBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 8000).includes(0);
}

export interface FileDetail {
  kind: 'diff' | 'content' | 'binary' | 'missing';
  text: string;
}

/**
 * A changed file (tracked-modified, staged, or untracked) gets a real
 * `git diff` — including a synthetic "whole file as an add" diff for
 * untracked files via `--no-index` so a brand-new file still shows
 * something meaningful instead of nothing. An unchanged file, or any file
 * in a non-git directory, falls back to showing its current content.
 */
export function getFileDetail(cwd: string, relPath: string): FileDetail {
  const absPath = path.join(cwd, relPath);
  if (!isGitRepo(cwd)) return readContentDetail(absPath);

  const status = statusMapFromPorcelain(cwd).get(relPath);
  if (status === 'untracked') {
    // --no-index exits 1 when the files differ (expected/normal here, not a failure).
    const result = git(cwd, ['diff', '--no-index', '--', '/dev/null', relPath]);
    return { kind: 'diff', text: result.stdout };
  }
  if (status === 'modified' || status === 'added' || status === 'renamed' || status === 'deleted') {
    const result = git(cwd, ['diff', 'HEAD', '--', relPath]);
    return { kind: 'diff', text: result.stdout };
  }
  return readContentDetail(absPath);
}

function readContentDetail(absPath: string): FileDetail {
  let buffer: Buffer;
  try {
    buffer = readFileSync(absPath);
  } catch {
    return { kind: 'missing', text: '' };
  }
  if (looksBinary(buffer)) return { kind: 'binary', text: '' };
  const truncated = buffer.length > MAX_CONTENT_BYTES;
  const text = buffer.subarray(0, MAX_CONTENT_BYTES).toString('utf-8');
  return { kind: 'content', text: truncated ? `${text}\n\n… (truncated, file is larger than 512 KB)` : text };
}
