import { describe, expect, it } from 'vitest';
import { buildTree, flattenTree } from './file-tree.js';

const FILES = [
  { path: 'README.md', status: 'unmodified' },
  { path: 'src/index.ts', status: 'modified' },
  { path: 'src/server/http.ts', status: 'unmodified' },
  { path: 'src/server/files.ts', status: 'untracked' },
];

describe('buildTree', () => {
  it('nests files under their real directory path, not a flat list', () => {
    const tree = buildTree(FILES);
    expect(tree.children.has('README.md')).toBe(true);
    expect(tree.children.has('src')).toBe(true);
    const src = tree.children.get('src');
    expect(src.children.has('index.ts')).toBe(true);
    expect(src.children.has('server')).toBe(true);
    expect(src.children.get('server').children.has('http.ts')).toBe(true);
  });

  it('keeps the file status attached to its leaf node', () => {
    const tree = buildTree(FILES);
    const readme = tree.children.get('README.md');
    expect(readme.status).toBe('unmodified');
    expect(readme.path).toBe('README.md');
  });
});

describe('flattenTree', () => {
  it('lists top-level entries with folders before files, alphabetically within each group', () => {
    const tree = buildTree(FILES);
    const rows = flattenTree(tree, {});
    expect(rows.map((r) => r.name)).toEqual(['src', 'README.md']);
    expect(rows[0].isFolder).toBe(true);
    expect(rows[0].expanded).toBe(false);
  });

  it('only descends into a folder that is marked expanded', () => {
    const tree = buildTree(FILES);
    const collapsed = flattenTree(tree, {});
    expect(collapsed).toHaveLength(2); // src (collapsed) + README.md

    const expanded = flattenTree(tree, { src: true });
    const names = expanded.map((r) => r.name);
    expect(names).toContain('index.ts');
    expect(names).toContain('server');
    // server itself is still collapsed, so its children aren't in the flat list
    expect(names).not.toContain('http.ts');
  });

  it('descends recursively through nested expanded folders', () => {
    const tree = buildTree(FILES);
    const rows = flattenTree(tree, { src: true, 'src/server': true });
    const httpRow = rows.find((r) => r.path === 'src/server/http.ts');
    expect(httpRow).toBeDefined();
    expect(httpRow.depth).toBe(2);
    expect(httpRow.status).toBe('unmodified');
  });

  it('gives each folder a stable key derived from its real path', () => {
    const tree = buildTree(FILES);
    const rows = flattenTree(tree, { src: true });
    const serverRow = rows.find((r) => r.isFolder && r.name === 'server');
    expect(serverRow.key).toBe('src/server');
  });
});
