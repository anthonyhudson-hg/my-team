import { el, icon } from '../dom.js';
import { formatClockTime, initialOf, modelShortLabel } from '../format.js';

function avatarNode({ initial, isAda }) {
  return el('div', { class: `avatar message-avatar${isAda ? ' avatar-ada' : ''}`, text: initial });
}

/** A plain "You" message: name + time inline, no bubble (matches #general and DM sent messages). */
export function createUserMessageRow({ name, text, ts }) {
  return el('div', { class: 'message-row hoverable' }, [
    avatarNode({ initial: initialOf(name, 'Y'), isAda: false }),
    el('div', { class: 'message-body' }, [
      el('div', { class: 'message-head' }, [
        el('span', { class: 'message-name', text: name || 'You' }),
        el('span', { class: 'message-time', text: formatClockTime(new Date(ts)) }),
      ]),
      el('div', { class: 'message-text', text }),
    ]),
  ]);
}

/** A CEO reply: bubble, AI badge, model/effort/time meta row. */
export function createCeoMessageRow({ ceoName, text, ts, model, effort }) {
  return el('div', { class: 'message-row' }, [
    el('div', { class: 'message-avatar-wrap' }, [
      avatarNode({ initial: initialOf(ceoName, 'A'), isAda: true }),
      el('span', {
        class: 'avatar-dot avatar-dot-ada',
        style: 'right:-3px;bottom:-3px;width:15px;height:15px;display:flex;align-items:center;justify-content:center;',
      }, [icon('sparkle', 'font-size:8px;color:#fff;')]),
    ]),
    el('div', { class: 'message-body message-body-ada' }, [
      el('div', { class: 'message-head message-head-ada' }, [
        el('span', { class: 'message-name', text: ceoName }),
        el('span', { class: 'badge-ai', text: 'AI' }),
      ]),
      el('div', { class: 'message-bubble', text }),
      el('div', { class: 'message-meta' }, [
        el('span', { class: 'message-meta-item' }, [icon('sparkle', 'font-size:11px;color:var(--accent);'), modelShortLabel(model)]),
        el('span', { class: 'message-meta-dot' }),
        el('span', { class: 'message-meta-item', style: 'text-transform:capitalize;' }, [icon('gauge', 'font-size:11px;'), modelShortLabel(effort)]),
        el('span', { class: 'message-meta-dot' }),
        el('span', { text: formatClockTime(new Date(ts)) }),
      ]),
    ]),
  ]);
}

/** Streaming variant of createCeoMessageRow: starts empty, text/meta filled in as deltas arrive. */
export function createLiveCeoMessageRow(ceoName) {
  const bubble = el('div', { class: 'message-bubble' });
  const meta = el('div', { class: 'message-meta', hidden: true });
  const row = el('div', { class: 'message-row' }, [
    el('div', { class: 'message-avatar-wrap' }, [
      avatarNode({ initial: initialOf(ceoName, 'A'), isAda: true }),
      el('span', {
        class: 'avatar-dot avatar-dot-ada',
        style: 'right:-3px;bottom:-3px;width:15px;height:15px;display:flex;align-items:center;justify-content:center;',
      }, [icon('sparkle', 'font-size:8px;color:#fff;')]),
    ]),
    el('div', { class: 'message-body message-body-ada' }, [
      el('div', { class: 'message-head message-head-ada' }, [
        el('span', { class: 'message-name', text: ceoName }),
        el('span', { class: 'badge-ai', text: 'AI' }),
      ]),
      bubble,
      meta,
    ]),
  ]);
  return {
    row,
    appendText(chunk) {
      bubble.textContent += chunk;
    },
    setMeta({ model, effort, ts }) {
      meta.hidden = false;
      meta.replaceChildren(
        el('span', { class: 'message-meta-item' }, [icon('sparkle', 'font-size:11px;color:var(--accent);'), modelShortLabel(model)]),
        el('span', { class: 'message-meta-dot' }),
        el('span', { class: 'message-meta-item', style: 'text-transform:capitalize;' }, [icon('gauge', 'font-size:11px;'), modelShortLabel(effort)]),
        el('span', { class: 'message-meta-dot' }),
        el('span', { text: formatClockTime(new Date(ts)) }),
      );
    },
  };
}

export function createTypingRow(ceoName) {
  return el('div', { class: 'typing-row' }, [
    avatarNode({ initial: initialOf(ceoName, 'A'), isAda: true }),
    el('div', { class: 'typing-bubble' }, [el('span'), el('span'), el('span')]),
  ]);
}

export function createDayDivider(label = 'Today') {
  return el('div', { class: 'day-divider' }, [
    el('div', { class: 'day-divider-line' }),
    el('span', { class: 'day-divider-label', text: label }),
    el('div', { class: 'day-divider-line' }),
  ]);
}
