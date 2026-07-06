/** Pure classification of one unified-diff line, for rendering (see js/diff-format.test.js). */
export function diffLineClass(line) {
  if (line.startsWith('@@')) return 'diff-line-hunk';
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('Binary files')) {
    return 'diff-line-meta';
  }
  if (line.startsWith('+')) return 'diff-line-add';
  if (line.startsWith('-')) return 'diff-line-remove';
  return '';
}

/** Counts real added/removed content lines (not the +++/--- file-header lines). */
export function diffStats(text) {
  let additions = 0;
  let deletions = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) additions++;
    else if (line.startsWith('-')) deletions++;
  }
  return { additions, deletions };
}
