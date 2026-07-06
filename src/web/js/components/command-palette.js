import { el, icon, mount } from '../dom.js';
import { fuzzyMatch } from '../format.js';

export function createCommandPalette({ getItems }) {
  const input = el('input', { class: 'palette-input', type: 'text', placeholder: 'Search channels, people, and actions…' });
  const results = el('div', { class: 'palette-results' });

  const panel = el('div', { class: 'palette', onclick: (e) => e.stopPropagation() }, [
    el('div', { class: 'palette-input-row' }, [icon('magnifying-glass', 'font-size:18px;color:var(--muted);'), input, el('span', { class: 'kbd', text: 'Esc' })]),
    results,
  ]);

  const backdrop = el('div', { class: 'palette-backdrop', hidden: true, onclick: close }, [panel]);

  function render() {
    const matches = getItems().filter((item) => fuzzyMatch(input.value, item.label));
    if (!matches.length) {
      mount(results, el('div', { class: 'palette-empty', text: 'No matches found' }));
      return;
    }
    mount(
      results,
      matches.map((item) =>
        el('button', { class: 'palette-item', type: 'button', onclick: () => select(item) }, [
          icon(item.icon, 'font-size:17px;color:var(--muted);width:20px;text-align:center;'),
          el('span', { class: 'palette-item-label', text: item.label }),
          el('span', { class: 'palette-item-hint', text: 'Jump to' }),
        ]),
      ),
    );
  }

  function select(item) {
    close();
    item.onSelect();
  }

  function open() {
    backdrop.hidden = false;
    input.value = '';
    render();
    setTimeout(() => input.focus(), 20);
  }

  function close() {
    backdrop.hidden = true;
  }

  input.addEventListener('input', render);
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      backdrop.hidden ? open() : close();
    } else if (e.key === 'Escape' && !backdrop.hidden) {
      close();
    }
  });

  return { el: backdrop, open, close };
}
