import { describe, expect, it } from 'vitest';
import { isSafeRelativePath } from './files.js';

describe('isSafeRelativePath', () => {
  it('accepts an ordinary nested git-style path (regression: Windows path.normalize rewrites / to \\, which broke this)', () => {
    expect(isSafeRelativePath('src/server/http-server.ts')).toBe(true);
    expect(isSafeRelativePath('README.md')).toBe(true);
  });

  it('rejects traversal segments', () => {
    expect(isSafeRelativePath('../secrets.txt')).toBe(false);
    expect(isSafeRelativePath('src/../../secrets.txt')).toBe(false);
  });

  it('rejects absolute paths (POSIX and Windows-drive-letter)', () => {
    expect(isSafeRelativePath('/etc/passwd')).toBe(false);
    expect(isSafeRelativePath('C:\\Windows\\System32')).toBe(false);
  });

  it('rejects empty segments (leading/trailing/doubled slashes)', () => {
    expect(isSafeRelativePath('')).toBe(false);
    expect(isSafeRelativePath('src//server')).toBe(false);
    expect(isSafeRelativePath('/src')).toBe(false);
  });
});
