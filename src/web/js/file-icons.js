/** Extension -> {icon, color} for the Files tree/tabs (see js/file-icons.test.js). */
const ICON_MAP = {
  ts: ['file-ts', '#4c9be8'],
  tsx: ['file-tsx', '#4c9be8'],
  js: ['file-js', '#e6b64c'],
  jsx: ['file-jsx', '#e6b64c'],
  mjs: ['file-js', '#e6b64c'],
  cjs: ['file-js', '#e6b64c'],
  json: ['brackets-curly', '#e0a83e'],
  css: ['file-css', '#d06bbe'],
  html: ['file-html', '#e0a83e'],
  md: ['file-text', '#8a8f98'],
  svg: ['image', '#5bbd6d'],
  png: ['image', '#5bbd6d'],
  jpg: ['image', '#5bbd6d'],
  jpeg: ['image', '#5bbd6d'],
  gif: ['image', '#5bbd6d'],
  yml: ['file-code', '#8a8f98'],
  yaml: ['file-code', '#8a8f98'],
  lock: ['lock-simple', '#8a8f98'],
  sh: ['terminal', '#6c6c76'],
};

const LANG_LABELS = {
  ts: 'TS',
  tsx: 'TSX',
  js: 'JS',
  jsx: 'JSX',
  mjs: 'JS',
  cjs: 'JS',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  md: 'Markdown',
  svg: 'SVG',
  yml: 'YAML',
  yaml: 'YAML',
  sh: 'Shell',
};

export function extensionOf(filePath) {
  const base = filePath.split('/').pop() ?? '';
  const dotIndex = base.lastIndexOf('.');
  return dotIndex > 0 ? base.slice(dotIndex + 1).toLowerCase() : '';
}

export function iconFor(filePath) {
  const [icon, color] = ICON_MAP[extensionOf(filePath)] ?? ['file', '#8a8f98'];
  return { icon, color };
}

export function languageFor(filePath) {
  const ext = extensionOf(filePath);
  if (ext === 'json') return 'json';
  if (ext === 'css') return 'css';
  if (ext === 'md') return 'md';
  if (ext === 'html') return 'html';
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) return 'code';
  return 'plain';
}

export function languageLabelFor(filePath) {
  return LANG_LABELS[extensionOf(filePath)] || 'Text';
}
