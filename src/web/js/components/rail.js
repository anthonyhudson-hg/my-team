import { el, icon } from '../dom.js';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', iconName: 'house' },
  { id: 'chats', label: 'Chats', iconName: 'chat-circle' },
  { id: 'activity', label: 'Activity', iconName: 'bell' },
  { id: 'files', label: 'Files', iconName: 'folder-simple' },
];

const REPO_URL = 'https://github.com/anthonyhudson-hg/my-team#readme';

export function createRail({ onNavigate }) {
  const logo = el('div', { class: 'avatar', id: 'rail-logo-mark', style: 'width:40px;height:40px;border-radius:12px;background:var(--accent);font-weight:800;font-size:16px;box-shadow:0 3px 9px rgba(0,0,0,.35);', text: 'C' });

  const itemNodes = new Map();
  const items = NAV_ITEMS.map(({ id, label, iconName }) => {
    const iconNode = icon(iconName);
    iconNode.classList.add('rail-icon');
    const node = el('button', { class: 'rail-item', type: 'button', title: label, onclick: () => onNavigate(id) }, [
      iconNode,
      el('span', { class: 'rail-label', text: label }),
    ]);
    itemNodes.set(id, node);
    return node;
  });

  const helpButton = el('button', {
    class: 'icon-btn icon-btn-lg icon-btn-on-dark',
    type: 'button',
    title: 'Help & documentation',
    style: 'flex:0 0 auto;',
    onclick: () => window.open(REPO_URL, '_blank', 'noopener'),
  }, [icon('question')]);

  const root = el('div', { id: 'rail' }, [
    el('div', { id: 'rail-logo' }, [logo]),
    el('div', { id: 'rail-divider' }),
    ...items,
    el('div', { id: 'rail-spacer' }),
    helpButton,
  ]);

  return {
    el: root,
    setActive(sectionId) {
      for (const [id, node] of itemNodes) node.classList.toggle('active', id === sectionId);
    },
    setLogoInitial(initial) {
      logo.textContent = initial;
    },
  };
}
