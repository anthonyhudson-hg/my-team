import { el, icon } from '../dom.js';
import { modelShortLabel } from '../format.js';

const DECORATIVE_TOOLBAR_ICONS = ['plus-circle', 'text-aa', 'smiley', 'paperclip', 'at'];

/**
 * `showModelMenu` gates the model/effort selectors — only the CEO DM has a
 * real model to pick, since #general has no AI participant at all.
 */
export function createComposer({ placeholder, showModelMenu, onSend }) {
  let models = [];
  let selectedModel = '';
  let selectedEffort = '';
  let openMenu = null;

  const textarea = el('textarea', {
    class: 'composer-textarea',
    rows: 1,
    placeholder,
    onkeydown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        trySend();
      }
    },
    oninput: refreshSendState,
  });

  const sendButton = el('button', { class: 'composer-send', type: 'button', disabled: true, onclick: trySend }, [icon('paper-plane-right', 'font-size:16px;')]);

  function trySend() {
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = '';
    refreshSendState();
    onSend(text, { model: selectedModel, effort: selectedEffort });
  }

  function refreshSendState() {
    sendButton.disabled = !textarea.value.trim();
  }

  const modelMenu = el('div', { class: 'menu', style: 'bottom:calc(100% + 8px);left:0;width:236px;', hidden: true });
  const modelTrigger = el('button', { class: 'menu-trigger', type: 'button', onclick: () => toggleMenu('model') }, [
    icon('sparkle', 'font-size:12px;color:var(--accent);'),
    el('span', { class: 'model-trigger-label', text: 'Default' }),
    icon('caret-down', 'font-size:9px;color:var(--muted);'),
  ]);
  const effortMenu = el('div', { class: 'menu', style: 'bottom:calc(100% + 8px);left:0;width:236px;', hidden: true });
  const effortTrigger = el('button', { class: 'menu-trigger', type: 'button', onclick: () => toggleMenu('effort') }, [
    icon('gauge', 'font-size:13px;color:var(--muted);'),
    el('span', { class: 'effort-trigger-label', style: 'text-transform:capitalize;', text: 'Default' }),
    icon('caret-down', 'font-size:9px;color:var(--muted);'),
  ]);

  const backdrop = el('div', { class: 'menu-backdrop', hidden: true, onclick: closeMenus });

  function toggleMenu(which) {
    openMenu = openMenu === which ? null : which;
    renderMenus();
  }

  function closeMenus() {
    openMenu = null;
    renderMenus();
  }

  function renderMenus() {
    backdrop.hidden = !openMenu;
    modelMenu.hidden = openMenu !== 'model';
    effortMenu.hidden = openMenu !== 'effort';
    if (openMenu === 'model') renderModelMenuItems();
    if (openMenu === 'effort') renderEffortMenuItems();
  }

  function renderModelMenuItems() {
    modelMenu.replaceChildren(el('div', { class: 'menu-heading', text: 'MODEL FOR THIS MESSAGE' }));
    for (const m of models) {
      const active = selectedModel === m.value;
      modelMenu.appendChild(
        el('div', { class: 'menu-item', onclick: () => pickModel(m) }, [
          icon('sparkle', 'font-size:15px;color:var(--accent);width:18px;text-align:center;flex:0 0 auto;'),
          el('div', { style: 'flex:1;min-width:0;' }, [
            el('div', { class: 'menu-item-title', text: m.displayName }),
            el('div', { class: 'menu-item-desc', text: m.description }),
          ]),
          active ? icon('check', 'font-size:14px;color:var(--accent);flex:0 0 auto;') : null,
        ]),
      );
    }
  }

  function renderEffortMenuItems() {
    const model = models.find((m) => m.value === selectedModel);
    const levels = model?.supportedEffortLevels ?? [];
    effortMenu.replaceChildren(el('div', { class: 'menu-heading', text: 'EFFORT FOR THIS MESSAGE' }));
    for (const level of levels) {
      const active = selectedEffort === level;
      effortMenu.appendChild(
        el('div', { class: 'menu-item', onclick: () => pickEffort(level) }, [
          icon('gauge', 'font-size:15px;color:var(--muted);width:18px;text-align:center;flex:0 0 auto;'),
          el('div', { style: 'flex:1;min-width:0;text-transform:capitalize;' }, [el('div', { class: 'menu-item-title', text: level })]),
          active ? icon('check', 'font-size:14px;color:var(--accent);flex:0 0 auto;') : null,
        ]),
      );
    }
  }

  function pickModel(m) {
    selectedModel = m.value;
    const levels = m.supportedEffortLevels ?? [];
    if (!levels.includes(selectedEffort)) selectedEffort = '';
    closeMenus();
    refreshTriggers();
  }

  function pickEffort(level) {
    selectedEffort = level;
    closeMenus();
    refreshTriggers();
  }

  function refreshTriggers() {
    const model = models.find((m) => m.value === selectedModel);
    modelTrigger.querySelector('.model-trigger-label').textContent = modelShortLabel(model?.displayName);
    effortTrigger.querySelector('.effort-trigger-label').textContent = modelShortLabel(selectedEffort);
    effortTrigger.hidden = !(model?.supportedEffortLevels?.length);
  }

  const toolbarLeft = el('div', { class: 'composer-toolbar-left' });
  if (showModelMenu) {
    toolbarLeft.append(
      el('div', { style: 'position:relative;' }, [modelTrigger, modelMenu]),
      el('div', { style: 'position:relative;' }, [effortTrigger, effortMenu]),
      el('div', { class: 'composer-divider' }),
    );
  }
  for (const name of DECORATIVE_TOOLBAR_ICONS) {
    // Matches the source design 1:1; not wired to anything yet (see the
    // reconciliation report — text formatting, emoji, attachments, @mentions).
    toolbarLeft.appendChild(el('button', { class: 'icon-btn icon-btn-sm', type: 'button' }, [icon(name, 'font-size:17px;')]));
  }

  const box = el('div', { class: 'composer-box' }, [
    textarea,
    el('div', { class: 'composer-toolbar' }, [
      toolbarLeft,
      el('div', { class: 'composer-toolbar-right' }, [el('span', { class: 'composer-hint', text: 'Enter to send' }), sendButton]),
    ]),
  ]);

  const skipButton = el('button', { class: 'btn-ghost', type: 'button', style: 'font-size:12.5px;flex:0 0 auto;', text: 'Skip for now' });
  const lockedNotice = el('div', { class: 'composer-locked', hidden: true }, [
    el('span', { class: 'composer-locked-text' }, [icon('lock-simple', 'font-size:15px;color:var(--accent);'), el('span', { class: 'locked-text-label' })]),
    skipButton,
  ]);

  const root = el('div', {}, [backdrop, box, lockedNotice]);

  return {
    el: root,
    textarea,
    setModels(list, defaults) {
      models = list;
      selectedModel = defaults?.model || '';
      selectedEffort = defaults?.effort || '';
      refreshTriggers();
    },
    setLocked(message, onSkip) {
      box.hidden = !!message;
      lockedNotice.hidden = !message;
      if (message) lockedNotice.querySelector('.locked-text-label').textContent = message;
      skipButton.hidden = !onSkip;
      skipButton.onclick = onSkip || null;
    },
    /** Disables sending while a turn is in flight, without showing the full "locked" notice (that's reserved for widget-gating/onboarding). */
    setSending(isSending) {
      textarea.disabled = isSending;
      sendButton.disabled = isSending || !textarea.value.trim();
    },
    focus() {
      textarea.focus();
    },
    reset() {
      textarea.value = '';
      refreshSendState();
    },
  };
}
