import { api } from '../api.js';
import { diffLineClass, diffStats } from '../diff-format.js';
import { el, icon, mount } from '../dom.js';
import { iconFor, languageFor, languageLabelFor } from '../file-icons.js';
import { buildTree, flattenTree } from '../file-tree.js';
import { fuzzyMatch } from '../format.js';
import { tokenizeLine } from '../syntax-highlight.js';

const STATUS_LETTER = { modified: 'M', added: 'A', deleted: 'D', renamed: 'R', untracked: 'U' };
const STATUS_COLOR = {
  modified: '#d99a1b',
  added: '#3fbf5f',
  deleted: 'var(--danger)',
  renamed: 'var(--accent)',
  untracked: 'var(--subtle)',
};

/** Detects the indentation actually used in a file's first indented line, so the status bar reports something real instead of a hardcoded "Spaces: 2". */
function detectIndent(text) {
  for (const line of text.split('\n')) {
    const match = /^(\t| {2,})/.exec(line);
    if (match) return match[1][0] === '\t' ? 'Tabs' : `Spaces: ${match[1].length}`;
  }
  return null;
}

/**
 * The real working tree of the repo this instance is running in. File tree,
 * git status, branch/ahead-behind, and file content/diffs all come from the
 * backend's real `git`/filesystem calls (see files.ts) — nothing here is
 * mock or placeholder data.
 */
export function createFilesPanel({ onOpenCeo }) {
  let allFiles = [];
  let gitInfo = { isGitRepo: false, branch: '', ahead: 0, behind: 0 };
  let ceoName = 'your AI CEO';
  const expandedFolders = {};
  const openTabs = [];
  let activeTab = null;
  const detailCache = new Map();
  const cursorByPath = new Map();
  let searchQuery = '';

  const searchInput = el('input', { class: 'files-search-input', style: 'flex:1;font-size:13px;color:var(--side-muted);text-align:left;background:transparent;border:none;outline:none;', placeholder: 'Go to file…' });
  const treeScroll = el('div', { class: 'files-tree-scroll' });
  const refreshButton = el('button', { class: 'icon-btn icon-btn-md icon-btn-on-dark', type: 'button', title: 'Refresh', onclick: () => load() }, [icon('arrows-clockwise', 'font-size:15px;')]);
  const branchRow = el('div', { class: 'git-branch-row' });

  const branchPill = el('div', { class: 'git-branch-pill' });
  const breadcrumbsEl = el('div', { class: 'breadcrumbs' });
  const askCeoButton = el('button', { class: 'ask-ceo-button', type: 'button', onclick: () => onOpenCeo() }, [icon('sparkle', 'font-size:14px;'), el('span', { class: 'ask-ceo-label' })]);
  const tabsRow = el('div', { class: 'files-tabs-row' });
  const editorScroll = el('div', { class: 'files-editor-scroll' });
  const statusBar = el('div', { class: 'files-status-bar' });

  function countChanges() {
    return allFiles.filter((f) => f.status !== 'unmodified').length;
  }

  function renderBranchUi() {
    if (!gitInfo.isGitRepo) {
      branchRow.hidden = true;
      branchPill.hidden = true;
      return;
    }
    branchRow.hidden = false;
    branchPill.hidden = false;
    const changeCount = countChanges();
    mount(branchRow, [
      icon('git-branch', 'font-size:15px;color:var(--side-muted);flex:0 0 auto;'),
      el('span', { class: 'git-branch-name', text: gitInfo.branch }),
      el('span', { class: 'git-ahead-behind', text: `↑${gitInfo.ahead} ↓${gitInfo.behind}` }),
    ]);
    mount(branchPill, [
      icon('git-branch', 'font-size:14px;color:var(--accent);'),
      el('span', { style: 'font-size:12.5px;font-weight:700;color:var(--text);', text: gitInfo.branch }),
      el('span', { style: 'font-size:11px;color:var(--muted);', text: changeCount ? `${changeCount} change${changeCount === 1 ? '' : 's'}` : 'no changes' }),
    ]);
  }

  function renderTree() {
    if (searchQuery.trim()) {
      const matches = allFiles.filter((f) => fuzzyMatch(searchQuery, f.path)).sort((a, b) => a.path.localeCompare(b.path));
      if (!matches.length) {
        mount(treeScroll, el('div', { class: 'files-tree-empty', text: 'No files match.' }));
        return;
      }
      mount(treeScroll, matches.map((f) => fileRow(f.path, f.path.split('/').pop(), f.status, 8)));
      return;
    }
    if (!allFiles.length) {
      mount(treeScroll, el('div', { class: 'files-tree-empty', text: 'This directory has no files.' }));
      return;
    }
    const tree = buildTree(allFiles);
    const rows = flattenTree(tree, expandedFolders);
    mount(
      treeScroll,
      rows.map((row) => {
        if (row.isFolder) return folderRow(row);
        return fileRow(row.path, row.name, row.status, 8 + row.depth * 13);
      }),
    );
  }

  function folderRow(row) {
    return el(
      'button',
      { class: 'file-tree-row', type: 'button', style: `padding-left:${8 + row.depth * 13}px;`, onclick: () => toggleFolder(row.key) },
      [
        el('span', { class: 'file-tree-caret' }, [icon(row.expanded ? 'caret-down' : 'caret-right', 'font-size:10px;')]),
        el('span', { class: 'file-tree-icon' }, [icon(row.expanded ? 'folder-open' : 'folder-simple', 'font-size:15px;color:var(--side-muted);')]),
        el('span', { class: 'file-tree-name', style: 'font-weight:700;', text: row.name }),
      ],
    );
  }

  function fileRow(filePath, name, status, indentPx) {
    const isActive = filePath === activeTab;
    const { icon: iconName, color } = iconFor(filePath);
    const row = el(
      'button',
      { class: `file-tree-row${isActive ? ' active' : ''}`, type: 'button', style: `padding-left:${indentPx}px;`, onclick: () => openFile(filePath) },
      [
        el('span', { class: 'file-tree-caret' }),
        el('span', { class: 'file-tree-icon' }, [icon(iconName, `font-size:15px;color:${isActive ? 'var(--side-text)' : color};`)]),
        el('span', { class: 'file-tree-name', style: `font-weight:${isActive ? 700 : 500};`, title: filePath, text: name }),
      ],
    );
    if (status && status !== 'unmodified' && !isActive) {
      row.appendChild(el('span', { class: 'file-tree-status', style: `color:${STATUS_COLOR[status]};`, text: STATUS_LETTER[status] }));
    }
    return row;
  }

  function toggleFolder(key) {
    expandedFolders[key] = !expandedFolders[key];
    renderTree();
  }

  function renderTabs() {
    mount(
      tabsRow,
      openTabs.map((filePath) => {
        const isActive = filePath === activeTab;
        const status = allFiles.find((f) => f.path === filePath)?.status;
        const showDot = status === 'modified' && !isActive;
        const { icon: iconName, color } = iconFor(filePath);
        return el('button', { class: `file-tab${isActive ? ' active' : ''}`, type: 'button', style: `background:${isActive ? 'var(--content-bg)' : 'transparent'};`, onclick: () => openFile(filePath) }, [
          icon(iconName, `font-size:14px;color:${isActive ? color : 'var(--muted)'};`),
          el('span', { class: 'file-tab-name', style: `color:${isActive ? 'var(--text)' : 'var(--muted)'};font-weight:${isActive ? 600 : 500};`, title: filePath, text: filePath.split('/').pop() }),
          showDot
            ? el('span', { class: 'file-tab-close', style: 'cursor:default;' }, [el('span', { class: 'file-tab-dot' })])
            : el('button', { class: 'file-tab-close', type: 'button', onclick: (e) => closeTab(filePath, e) }, [icon('x', 'font-size:12px;')]),
        ]);
      }),
    );
  }

  function closeTab(filePath, event) {
    event.stopPropagation();
    const idx = openTabs.indexOf(filePath);
    if (idx === -1) return;
    openTabs.splice(idx, 1);
    if (activeTab === filePath) activeTab = openTabs[openTabs.length - 1] ?? null;
    renderTabs();
    renderTree();
    renderEditor();
  }

  async function openFile(filePath) {
    activeTab = filePath;
    if (!openTabs.includes(filePath)) openTabs.push(filePath);
    renderTabs();
    renderTree();
    if (!detailCache.has(filePath)) {
      mount(editorScroll, el('div', { class: 'files-editor-empty', text: 'Loading…' }));
      const { ok, body } = await api.files.detail(filePath);
      detailCache.set(filePath, ok ? body : { kind: 'missing', text: '' });
    }
    if (!cursorByPath.has(filePath)) cursorByPath.set(filePath, 1);
    renderEditor();
  }

  function renderEditor() {
    updateHeader();
    if (!activeTab) {
      mount(editorScroll, el('div', { class: 'files-editor-empty' }, [icon('code', 'font-size:36px;'), el('span', { style: 'font-size:14px;color:var(--muted);', text: 'No file open — pick one from the tree.' })]));
      statusBar.hidden = true;
      return;
    }
    const detail = detailCache.get(activeTab);
    if (!detail) return;
    if (detail.kind === 'binary') {
      mount(editorScroll, el('div', { class: 'files-editor-empty' }, [icon('file', 'font-size:32px;'), 'Binary file — preview not available.']));
      statusBar.hidden = true;
      return;
    }
    if (detail.kind === 'missing') {
      mount(editorScroll, el('div', { class: 'files-editor-empty' }, [icon('file-x', 'font-size:32px;'), 'File not found on disk.']));
      statusBar.hidden = true;
      return;
    }
    if (detail.kind === 'diff') {
      if (!detail.text.trim()) {
        mount(editorScroll, el('div', { class: 'files-editor-empty' }, [icon('check-circle', 'font-size:32px;'), 'No changes.']));
        statusBar.hidden = true;
        return;
      }
      mount(
        editorScroll,
        el(
          'div',
          { class: 'diff-view' },
          detail.text.split('\n').map((line) => el('div', { class: `diff-line ${diffLineClass(line)}`, text: line || ' ' })),
        ),
      );
      renderDiffStatusBar(detail.text);
      return;
    }
    renderCodeView(activeTab, detail.text);
    renderContentStatusBar(detail.text, activeTab);
  }

  function renderCodeView(filePath, text) {
    const lang = languageFor(filePath);
    const cursor = cursorByPath.get(filePath) ?? 1;
    const lines = text.replace(/\n+$/, '').split('\n');
    mount(
      editorScroll,
      el(
        'div',
        { class: 'code-view' },
        lines.map((line, idx) => {
          const lineNumber = idx + 1;
          const atCursor = lineNumber === cursor;
          return el('div', { class: `code-line${atCursor ? ' at-cursor' : ''}`, onclick: () => selectLine(filePath, lineNumber) }, [
            el('span', { class: 'code-line-number', text: String(lineNumber) }),
            el(
              'span',
              { class: 'code-line-content' },
              tokenizeLine(line, lang).map((tok) => el('span', { style: `color:${tok.c};`, text: tok.t })),
            ),
          ]);
        }),
      ),
    );
  }

  function selectLine(filePath, lineNumber) {
    cursorByPath.set(filePath, lineNumber);
    renderEditor();
  }

  function branchLabel() {
    return gitInfo.isGitRepo ? el('span', { class: 'files-status-bar-branch' }, [icon('git-branch', 'font-size:13px;'), gitInfo.branch]) : null;
  }

  /** Content mode: indent-detection and line count are computed from the real file text, so they're accurate here. */
  function renderContentStatusBar(text, filePath) {
    statusBar.hidden = false;
    const lineCount = text.split('\n').length;
    const cursor = cursorByPath.get(filePath) ?? 1;
    const indent = detectIndent(text);
    mount(
      statusBar,
      [
        branchLabel(),
        el('span', { text: `${lineCount} line${lineCount === 1 ? '' : 's'}` }),
        el('span', { class: 'files-status-bar-spacer' }),
        el('span', { text: `Ln ${cursor}` }),
        indent ? el('span', { text: indent }) : null,
        el('span', { text: 'UTF-8' }),
        el('span', { text: languageLabelFor(filePath) }),
      ].filter(Boolean),
    );
  }

  /**
   * Diff mode: a raw line count or indent guess computed from unified-diff
   * text (which has +/-/space prefix characters mixed in) would be
   * meaningless at best and misleading at worst, so this shows only what's
   * genuinely accurate for a diff — the real +/- counts.
   */
  function renderDiffStatusBar(diffText) {
    statusBar.hidden = false;
    const { additions, deletions } = diffStats(diffText);
    mount(
      statusBar,
      [
        branchLabel(),
        el('span', { style: 'color:var(--success);', text: `+${additions}` }),
        el('span', { style: 'color:var(--danger);', text: `-${deletions}` }),
        el('span', { class: 'files-status-bar-spacer' }),
        el('span', { text: 'Diff' }),
      ].filter(Boolean),
    );
  }

  function updateHeader() {
    if (!activeTab) {
      mount(breadcrumbsEl, []);
      askCeoButton.hidden = true;
      return;
    }
    askCeoButton.hidden = false;
    askCeoButton.querySelector('.ask-ceo-label').textContent = `Ask ${ceoName}`;
    const segments = activeTab.split('/');
    const crumbNodes = [];
    segments.forEach((name, idx) => {
      if (idx > 0) crumbNodes.push(icon('caret-right', 'font-size:9px;color:var(--subtle);'));
      const isLast = idx === segments.length - 1;
      crumbNodes.push(el('span', { class: 'breadcrumb-seg', style: `color:${isLast ? 'var(--text)' : 'var(--muted)'};font-weight:${isLast ? 700 : 500};`, text: name }));
    });
    mount(breadcrumbsEl, crumbNodes);
  }

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderTree();
  });

  const root = el('div', { class: 'section', id: 'panel-files' }, [
    el('div', { class: 'section-scroll' }, [
      el('div', { class: 'files-tree-sidebar' }, [
        el('div', { class: 'files-tree-header' }, [
          el('div', { style: 'display:flex;align-items:center;gap:7px;min-width:0;' }, [
            icon('git-branch', 'font-size:15px;color:var(--side-muted);'),
            el('span', { class: 'files-workspace-name', style: 'font-weight:800;font-size:15.5px;color:var(--side-text);letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', text: 'Project' }),
          ]),
          refreshButton,
        ]),
        el('div', { class: 'files-search-row' }, [
          el('div', { class: 'search-trigger', style: 'cursor:text;' }, [icon('magnifying-glass', 'font-size:14px;color:var(--side-muted);'), searchInput]),
        ]),
        treeScroll,
        el('div', { class: 'files-tree-footer' }, [branchRow]),
      ]),
      el('div', { class: 'files-editor-area' }, [
        el('div', { class: 'files-editor-header' }, [
          el('div', { style: 'display:flex;align-items:center;gap:12px;min-width:0;' }, [branchPill, el('span', { style: 'width:1px;height:18px;background:var(--border-2);flex:0 0 auto;' }), breadcrumbsEl]),
          el('div', { style: 'display:flex;align-items:center;gap:4px;flex:0 0 auto;' }, [
            askCeoButton,
            el('button', { class: 'icon-btn icon-btn-md', type: 'button' }, [icon('magnifying-glass', 'font-size:16px;')]),
            el('button', { class: 'icon-btn icon-btn-md', type: 'button' }, [icon('columns', 'font-size:17px;')]),
            el('button', { class: 'icon-btn icon-btn-md', type: 'button' }, [icon('dots-three-vertical', 'font-size:18px;')]),
          ]),
        ]),
        tabsRow,
        editorScroll,
        statusBar,
      ]),
    ]),
  ]);

  mount(editorScroll, el('div', { class: 'files-editor-empty' }, [icon('code', 'font-size:36px;'), el('span', { style: 'font-size:14px;color:var(--muted);', text: 'No file open — pick one from the tree.' })]));
  statusBar.hidden = true;
  askCeoButton.hidden = true;

  async function load() {
    const { ok, body } = await api.files.list();
    allFiles = ok ? body.files ?? [] : [];
    gitInfo = ok ? body.git ?? gitInfo : gitInfo;
    detailCache.clear();
    renderBranchUi();
    renderTree();
    if (activeTab) openFile(activeTab);
  }

  return {
    el: root,
    load,
    setProfile({ ceoName: name, companyName }) {
      ceoName = name || 'your AI CEO';
      root.querySelector('.files-workspace-name').textContent = companyName || 'my-team';
      updateHeader();
    },
  };
}
