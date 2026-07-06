/**
 * Turns the flat {path, status}[] list from GET /api/files into a real
 * nested tree (folders built from the actual path segments, not a mock
 * fixture) and flattens it back down to visible rows respecting which
 * folders are expanded — mirrors how a real file explorer walks its tree.
 */
export function buildTree(files) {
  const root = { name: '', children: new Map() };
  for (const file of files) {
    const segments = file.path.split('/');
    let node = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const name = segments[i];
      if (!node.children.has(name)) {
        node.children.set(name, { name, children: new Map() });
      }
      node = node.children.get(name);
    }
    const fileName = segments[segments.length - 1];
    node.children.set(fileName, { name: fileName, path: file.path, status: file.status });
  }
  return root;
}

function sortedChildren(node) {
  return [...node.children.values()].sort((a, b) => {
    const aIsFolder = a.children !== undefined;
    const bIsFolder = b.children !== undefined;
    if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** folderKey(parentPath, name) -> stable key used for the expanded-state map. */
function folderKey(parentPath, name) {
  return parentPath ? `${parentPath}/${name}` : name;
}

/** Flat, depth-annotated rows for the visible tree — only descends into folders present (as true) in expandedState. */
export function flattenTree(root, expandedState, parentPath = '', depth = 0) {
  const rows = [];
  for (const node of sortedChildren(root)) {
    if (node.children !== undefined) {
      const key = folderKey(parentPath, node.name);
      const expanded = !!expandedState[key];
      rows.push({ isFolder: true, key, name: node.name, depth, expanded });
      if (expanded) rows.push(...flattenTree(node, expandedState, key, depth + 1));
    } else {
      rows.push({ isFolder: false, name: node.name, path: node.path, status: node.status, depth });
    }
  }
  return rows;
}
