import { el, icon } from '../dom.js';

/** Activity and Files have no backend — the source design itself ships them as permanently-empty placeholders, so this is a 1:1 match, not a simplification. */
export function createActivityPanel() {
  return el('div', { class: 'section', id: 'panel-activity' }, [
    el('div', { class: 'section-header' }, [el('span', { style: 'font-size:16px;font-weight:800;color:var(--text);', text: 'Activity' })]),
    el('div', { class: 'empty-page' }, [
      el('div', { class: 'empty-icon' }, [icon('bell', 'font-size:30px;')]),
      el('div', { class: 'empty-title', text: 'No activity yet' }),
      el('div', { class: 'empty-desc', text: "When someone @mentions you or reacts to your messages, it'll show up right here." }),
    ]),
  ]);
}

export function createFilesPanel() {
  return el('div', { class: 'section', id: 'panel-files' }, [
    el('div', { class: 'section-header' }, [el('span', { style: 'font-size:16px;font-weight:800;color:var(--text);', text: 'Files' })]),
    el('div', { class: 'empty-page' }, [
      el('div', { class: 'empty-icon' }, [icon('folder-simple', 'font-size:30px;')]),
      el('div', { class: 'empty-title', text: 'No files yet' }),
      el('div', { class: 'empty-desc', text: 'Files and docs shared in your workspace will collect here so they’re easy to find.' }),
      el('div', { class: 'dropzone' }, [icon('upload-simple', 'font-size:22px;'), el('span', { style: 'font-size:13px;font-weight:600;color:var(--muted);', text: 'Drag files here to share them' })]),
    ]),
  ]);
}
