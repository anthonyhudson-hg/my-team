import { describe, expect, it } from 'vitest';
import { diffLineClass, diffStats } from './diff-format.js';

describe('diffLineClass', () => {
  it('classifies added and removed lines', () => {
    expect(diffLineClass('+const x = 1;')).toBe('diff-line-add');
    expect(diffLineClass('-const x = 1;')).toBe('diff-line-remove');
  });

  it('classifies hunk headers distinctly from content lines', () => {
    expect(diffLineClass('@@ -1,3 +1,4 @@')).toBe('diff-line-hunk');
  });

  it('treats file-header lines (+++/---/diff --git/index) as meta, not content', () => {
    expect(diffLineClass('+++ b/src/foo.ts')).toBe('diff-line-meta');
    expect(diffLineClass('--- a/src/foo.ts')).toBe('diff-line-meta');
    expect(diffLineClass('diff --git a/src/foo.ts b/src/foo.ts')).toBe('diff-line-meta');
    expect(diffLineClass('index 1234567..89abcdef 100644')).toBe('diff-line-meta');
  });

  it('classifies a binary-file notice as meta', () => {
    expect(diffLineClass('Binary files a/img.png and b/img.png differ')).toBe('diff-line-meta');
  });

  it('leaves context lines unclassified', () => {
    expect(diffLineClass(' unchanged line')).toBe('');
  });
});

describe('diffStats', () => {
  it('counts +/- content lines but excludes the +++/--- file headers', () => {
    const diff = ['diff --git a/f b/f', 'index 111..222 100644', '--- a/f', '+++ b/f', '@@ -1,2 +1,2 @@', '-old line', '+new line', '+another new line'].join('\n');
    expect(diffStats(diff)).toEqual({ additions: 2, deletions: 1 });
  });

  it('returns zero/zero for an empty diff', () => {
    expect(diffStats('')).toEqual({ additions: 0, deletions: 0 });
  });
});
