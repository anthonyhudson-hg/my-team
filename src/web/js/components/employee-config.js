import { el, icon } from '../dom.js';

/**
 * Reached only via the CEO DM's "..." menu → Configure Employee (no rail
 * entry, same pattern as Settings). Stub for now — no configuration options
 * exist yet; this just establishes the page and the navigation path to it.
 */
export function createEmployeeConfigPanel({ onDone }) {
  const title = el('span', { style: 'font-size:16px;font-weight:800;color:var(--text);' });
  const heading = el('div', { class: 'empty-title' });

  const root = el('div', { class: 'section', id: 'panel-employee-config' }, [
    el('div', { class: 'section-header' }, [
      el('div', { style: 'display:flex;align-items:center;gap:10px;' }, [icon('sliders', 'font-size:18px;color:var(--text);'), title]),
      el('button', { class: 'btn', type: 'button', onclick: onDone }, ['Done']),
    ]),
    el('div', { class: 'empty-page' }, [
      el('div', { class: 'empty-icon' }, [icon('sliders', 'font-size:30px;')]),
      heading,
      el('div', { class: 'empty-desc', text: 'Configuration options for your AI employees are coming soon.' }),
    ]),
  ]);

  return {
    el: root,
    update({ ceoName }) {
      const name = ceoName || 'your AI CEO';
      title.textContent = `Configure ${name}`;
      heading.textContent = `No configuration options for ${name} yet`;
    },
  };
}
