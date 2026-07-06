import { api } from '../api.js';
import { createComposer } from './composer.js';
import { el, icon, mount } from '../dom.js';
import { deriveChecklist, initialOf } from '../format.js';
import { createDayDivider, createUserMessageRow } from './message.js';

/**
 * #general has no multi-user backend and no AI participant (see the
 * reconciliation notes) — messages persist locally via general-history.jsonl
 * so they at least survive a reload/restart instead of being purely
 * decorative state that resets every time.
 */
export function createGeneralPanel({ onOpenCeo, onOpenSettings }) {
  const bannerTitle = el('div', { style: 'font-size:15px;font-weight:800;color:var(--text);' });
  const bannerBody = el('div', { style: 'font-size:13px;color:var(--muted);line-height:1.5;margin:3px 0 12px;' });
  const banner = el('div', { class: 'banner' }, [
    el('div', { class: 'banner-icon' }, [icon('hand-waving', 'font-size:20px;')]),
    el('div', { style: 'flex:1;min-width:0;padding-right:14px;' }, [
      bannerTitle,
      bannerBody,
      el('div', { style: 'display:flex;gap:9px;flex-wrap:wrap;' }, [
        el('button', { class: 'btn', type: 'button', onclick: onOpenCeo }, [icon('sparkle', 'font-size:13px;'), 'Set up with your AI CEO']),
        el('button', { class: 'btn btn-secondary', type: 'button', onclick: onOpenSettings }, ['Complete profile']),
      ]),
    ]),
    el('button', { class: 'icon-btn icon-btn-md banner-dismiss', type: 'button', onclick: () => dismissBanner() }, [icon('x', 'font-size:14px;')]),
  ]);

  const checklistCard = el('div', { class: 'card', style: 'overflow:hidden;margin-top:24px;' });
  const introTitle = el('h2', { style: 'margin:0;font-size:23px;font-weight:800;color:var(--text);letter-spacing:-.02em;' });
  const introDesc = el('p', { style: 'margin:8px 0 0;font-size:14.5px;color:var(--muted);line-height:1.55;max-width:560px;' });
  const memberStack = el('div', { style: 'display:flex;' });

  const messageList = el('div', {});
  const composer = createComposer({
    placeholder: 'Message #general',
    showModelMenu: false,
    onSend: async (text) => {
      const row = createUserMessageRow({ name: currentFounderName || 'You', text, ts: new Date().toISOString() });
      messageList.appendChild(row);
      scrollToBottom();
      await api.general.send(text, currentFounderName || 'You');
    },
  });

  const scroll = el('div', { class: 'section-scroll' }, [
    el('div', { class: 'section-centered', style: 'padding:24px 30px 30px;' }, [
      banner,
      el('div', { style: 'padding:6px 0 4px;' }, [
        el('div', { style: 'width:60px;height:60px;border-radius:18px;background:var(--accent-soft);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;margin-bottom:16px;' }, [icon('hash', 'font-size:30px;color:var(--accent);')]),
        introTitle,
        introDesc,
        el('div', { style: 'display:flex;align-items:center;gap:14px;margin-top:16px;' }, [
          memberStack,
          el('span', { style: 'font-size:13px;color:var(--subtle);', text: '2 members' }),
          el('button', { class: 'btn btn-secondary', type: 'button' }, [icon('user-plus', 'font-size:14px;'), 'Add teammates']),
        ]),
      ]),
      checklistCard,
      createDayDivider('Today'),
      el('div', { class: 'system-note', text: 'You joined — welcome aboard.' }),
      messageList,
    ]),
  ]);

  const root = el('div', { class: 'section', id: 'panel-general' }, [
    el('div', { class: 'section-header' }, [
      el('div', { style: 'display:flex;align-items:center;gap:9px;min-width:0;' }, [
        icon('hash', 'font-size:18px;color:var(--text);'),
        el('span', { style: 'font-size:16px;font-weight:800;color:var(--text);letter-spacing:-.01em;', text: 'general' }),
      ]),
      el('div', { style: 'display:flex;align-items:center;gap:2px;' }, [
        el('div', { class: 'icon-btn icon-btn-md', style: 'display:flex;gap:6px;width:auto;padding:0 11px;' }, [icon('users', 'font-size:16px;'), el('span', { style: 'font-size:13px;font-weight:600;', text: '1' })]),
        el('button', { class: 'icon-btn icon-btn-md', type: 'button', disabled: true, title: 'Voice support — coming soon' }, [icon('headset', 'font-size:17px;')]),
        el('button', { class: 'icon-btn icon-btn-md', type: 'button' }, [icon('dots-three', 'font-size:18px;')]),
      ]),
    ]),
    scroll,
    el('div', { id: 'composer-area' }, [composer.el]),
  ]);

  let currentFounderName = '';
  let bannerDismissed = false;
  let prefsPatch = () => {};

  function dismissBanner() {
    bannerDismissed = true;
    banner.hidden = true;
    prefsPatch({ generalBannerDismissed: true });
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scroll.scrollTop = scroll.scrollHeight;
    });
  }

  return {
    el: root,
    async load({ companyName, founderName, ceoName, onboardingComplete, hasSentToCeo, generalBannerDismissed, generalHistory, onSavePrefs }) {
      currentFounderName = founderName;
      prefsPatch = onSavePrefs;
      bannerDismissed = generalBannerDismissed;
      banner.hidden = bannerDismissed;
      const company = companyName || 'my-team';
      bannerTitle.textContent = `Welcome to ${company}`;
      bannerBody.textContent = `You're all set up. Run through the quick checklist below to find your footing — and ${ceoName || 'your AI CEO'} is one message away whenever you're stuck.`;
      introTitle.replaceChildren('This is the start of ', el('span', { style: 'color:var(--muted);', text: '#' }), 'general');
      introDesc.textContent = `This channel is the home base for everyone at ${company} — announcements, wins, and the occasional watercooler chat. Say hello to kick things off.`;
      memberStack.replaceChildren(
        el('div', { class: 'avatar', style: 'width:30px;height:30px;font-size:12px;border:2px solid var(--content-bg);', text: initialOf(founderName, 'Y') }),
        el('div', { class: 'avatar avatar-ada', style: 'width:30px;height:30px;font-size:12px;border:2px solid var(--content-bg);margin-left:-8px;', text: initialOf(ceoName, 'A') }),
      );

      mount(
        messageList,
        generalHistory.map((m) => createUserMessageRow(m)),
      );

      const checklist = deriveChecklist({ onboardingComplete, hasSentToCeo, hasGeneralMessage: generalHistory.length > 0 });
      renderChecklist(checklist);
      scrollToBottom();
    },
    hasSentMessage() {
      return messageList.children.length > 0;
    },
  };

  function renderChecklist(checklist) {
    const done = checklist.filter((c) => c.done).length;
    checklistCard.replaceChildren(
      el('div', { style: 'padding:16px 18px 13px;border-bottom:1px solid var(--border);' }, [
        el('div', { style: 'display:flex;align-items:center;justify-content:space-between;' }, [
          el('div', { style: 'display:flex;align-items:center;gap:9px;' }, [icon('rocket-launch', 'font-size:17px;color:var(--accent);'), el('span', { style: 'font-size:15px;font-weight:800;color:var(--text);', text: 'Getting started' })]),
          el('span', { class: 'badge-pill', text: `${done}/${checklist.length}` }),
        ]),
        el('div', { class: 'progress-track', style: 'margin-top:12px;' }, [el('div', { class: 'progress-fill', style: `width:${Math.round((done / checklist.length) * 100)}%;` })]),
      ]),
      el(
        'div',
        { style: 'padding:7px;' },
        checklist.map((item) =>
          el('div', { class: 'checklist-item' }, [
            el('div', { class: `checklist-check ${item.done ? 'done' : 'pending'}` }, item.done ? [icon('check', 'font-size:12px;font-weight:700;')] : []),
            el('span', { class: `checklist-label ${item.done ? 'done' : ''}`, text: item.label }),
          ]),
        ),
      ),
    );
  }
}
