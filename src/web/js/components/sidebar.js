import { el, icon } from '../dom.js';
import { initialOf } from '../format.js';

export function createSidebar({ onNavigate, onOpenPalette, onOpenSettings }) {
  const workspaceName = el('span', { style: 'font-weight:800;font-size:15.5px;color:var(--side-text);letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', text: 'Cofound' });

  const generalItem = el('button', { class: 'nav-item', type: 'button', onclick: () => onNavigate('general') }, [
    el('span', { class: 'nav-item-icon', style: 'font-size:16px;' }, [icon('hash')]),
    el('span', { class: 'nav-item-label', text: 'general' }),
  ]);

  const ceoAvatar = el('div', { class: 'avatar avatar-ada', style: 'width:28px;height:28px;font-size:12px;', text: 'A' });
  const ceoNameLabel = el('span', { class: 'nav-item-label', text: 'your AI CEO' });
  const ceoItem = el('button', { class: 'nav-item', type: 'button', style: 'align-items:center;padding:7px 11px;', onclick: () => onNavigate('ceo') }, [
    el('div', { style: 'position:relative;flex:0 0 auto;' }, [
      ceoAvatar,
      el('span', { class: 'avatar-dot avatar-dot-ada', style: 'right:-3px;bottom:-3px;width:10px;height:10px;' }),
    ]),
    el('div', { style: 'flex:1;min-width:0;' }, [
      el('div', { style: 'display:flex;align-items:center;gap:6px;' }, [ceoNameLabel, el('span', { class: 'badge-ai', text: 'AI' })]),
      el('div', { class: 'nav-item-sub', text: 'Chief Executive Officer' }),
    ]),
  ]);

  const nudgeButton = el('button', { class: 'btn', type: 'button', style: 'font-size:11.5px;padding:5px 11px;', onclick: () => onNavigate('ceo') }, ['Set up with your AI CEO']);
  const nudgeCard = el('div', { style: 'display:flex;gap:10px;align-items:flex-start;background:var(--side-hover);border-radius:10px;padding:11px 12px;margin-bottom:9px;' }, [
    el('span', { style: 'color:var(--ada-dot);flex:0 0 auto;margin-top:1px;' }, [icon('user-circle-plus', 'font-size:18px;')]),
    el('div', { style: 'flex:1;min-width:0;' }, [
      el('div', { style: 'font-size:12.5px;font-weight:700;color:var(--side-text);', text: 'Finish your profile' }),
      el('div', { style: 'font-size:11.5px;color:var(--side-muted);line-height:1.35;margin:2px 0 8px;', text: 'Tell your AI CEO a bit about yourself and your company.' }),
      nudgeButton,
    ]),
  ]);
  nudgeCard.hidden = true;

  const userAvatar = el('div', { class: 'avatar', style: 'width:32px;height:32px;border-radius:9px;font-size:14px;', text: 'Y' });
  const userName = el('div', { style: 'font-size:13px;font-weight:700;color:var(--side-text);', text: 'You' });
  const settingsButton = el('button', { class: 'icon-btn icon-btn-md icon-btn-on-dark', type: 'button', title: 'Settings', onclick: onOpenSettings }, [icon('gear-six', 'font-size:17px;')]);

  const searchTrigger = el('button', { class: 'search-trigger', type: 'button', onclick: onOpenPalette }, [
    icon('magnifying-glass', 'font-size:14px;color:var(--side-muted);'),
    el('span', { style: 'flex:1;font-size:13px;color:var(--side-muted);text-align:left;', text: 'Jump to or search…' }),
    el('span', { class: 'kbd', text: '⌘K' }),
  ]);

  const root = el('div', { id: 'sidebar' }, [
    el('div', { id: 'sidebar-header' }, [
      el('div', { style: 'display:flex;align-items:center;gap:6px;cursor:default;min-width:0;padding:5px 6px;border-radius:7px;' }, [workspaceName]),
      el('button', { class: 'icon-btn icon-btn-md icon-btn-on-dark', type: 'button', title: 'New message', disabled: true }, [icon('note-pencil', 'font-size:17px;')]),
    ]),
    el('div', { id: 'sidebar-search-wrap' }, [searchTrigger]),
    el('div', { id: 'sidebar-list' }, [
      el('div', { class: 'sidebar-section-label-row' }, [
        el('div', { style: 'display:flex;align-items:center;gap:5px;color:var(--side-muted);' }, [icon('caret-down', 'font-size:10px;'), el('span', { style: 'font-size:12px;font-weight:700;letter-spacing:.01em;', text: 'Channels' })]),
        el('span', { style: 'color:var(--side-subtle);' }, [icon('plus', 'font-size:13px;')]),
      ]),
      generalItem,
      el('div', { class: 'nav-item', style: 'color:var(--side-muted);cursor:default;' }, [
        el('span', { class: 'nav-item-icon', style: 'font-size:16px;color:var(--side-muted);' }, [icon('plus')]),
        el('span', { style: 'flex:1;font-size:13.5px;font-weight:500;', text: 'Add channels' }),
      ]),
      el('div', { class: 'sidebar-section-label-row' }, [
        el('div', { style: 'display:flex;align-items:center;gap:5px;color:var(--side-muted);' }, [icon('caret-down', 'font-size:10px;'), el('span', { style: 'font-size:12px;font-weight:700;letter-spacing:.01em;', text: 'Staff' })]),
        el('span', { style: 'color:var(--side-subtle);' }, [icon('plus', 'font-size:13px;')]),
      ]),
      ceoItem,
    ]),
    el('div', { id: 'sidebar-footer' }, [
      nudgeCard,
      el('div', { style: 'display:flex;align-items:center;gap:9px;padding:5px 4px;' }, [
        el('div', { style: 'position:relative;flex:0 0 auto;' }, [userAvatar, el('span', { class: 'avatar-dot avatar-dot-online', style: 'right:-3px;bottom:-3px;width:11px;height:11px;' })]),
        el('div', { style: 'flex:1;min-width:0;' }, [userName, el('div', { style: 'font-size:11px;color:var(--side-muted);', text: 'Active' })]),
        settingsButton,
      ]),
    ]),
  ]);

  return {
    el: root,
    setActiveView(view) {
      generalItem.classList.toggle('active', view === 'general');
      ceoItem.classList.toggle('active', view === 'ceo');
    },
    update({ companyName, ceoName, founderName, onboardingComplete }) {
      workspaceName.textContent = companyName || 'Cofound';
      const resolvedCeoName = ceoName || 'your AI CEO';
      ceoNameLabel.textContent = resolvedCeoName;
      ceoAvatar.textContent = initialOf(resolvedCeoName, 'A');
      const resolvedYouName = founderName || 'You';
      userName.textContent = resolvedYouName;
      userAvatar.textContent = initialOf(founderName, 'Y');
      nudgeCard.hidden = !!onboardingComplete;
    },
  };
}
