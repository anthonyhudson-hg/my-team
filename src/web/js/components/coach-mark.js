import { el, icon } from '../dom.js';

export function createCoachMark({ onOpenCeo, onDismiss }) {
  const text = el('div', { class: 'coach-mark-text' });
  const root = el('div', { class: 'coach-mark' }, [
    el('div', { class: 'coach-mark-badge' }, [el('span', { class: 'coach-mark-dot' }), el('span', { class: 'coach-mark-new', text: 'NEW' })]),
    text,
    el('div', { class: 'coach-mark-actions' }, [
      el('button', { class: 'btn', type: 'button', onclick: () => { onOpenCeo(); onDismiss(); } }, ['Open chat']),
      el('button', { class: 'coach-mark-dismiss', type: 'button', onclick: onDismiss, text: 'Got it' }),
    ]),
  ]);
  root.hidden = true;

  return {
    el: root,
    show(ceoName) {
      text.textContent = `Meet ${ceoName}, your AI CEO — they'll get you set up. Say hello.`;
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
