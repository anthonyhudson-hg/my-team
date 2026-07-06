import { el, icon } from '../dom.js';

/** Activity has no backend yet (no @mention/reaction system) — matches the source design's own permanently-empty placeholder. */
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
