import { el, icon } from '../dom.js';
import { deriveChecklist, greeting, initialOf } from '../format.js';

export function createHomePanel({ onOpenPalette, onGoGeneral, onGoCeo }) {
  const greetingLabel = el('div', { style: 'font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);' });
  const title = el('h1', { style: 'margin:6px 0 0;font-size:30px;font-weight:800;color:var(--text);letter-spacing:-.02em;' });
  const subtitle = el('p', { style: 'margin:9px 0 0;font-size:15px;color:var(--muted);line-height:1.55;max-width:560px;', text: "You're just getting started. Here's your space — it'll fill up as you settle in." });

  const checklistBadge = el('span', { class: 'badge-pill' });
  const checklistDesc = el('p', { style: 'margin:8px 0 14px;font-size:13.5px;color:var(--muted);line-height:1.5;' });
  const checklistFill = el('div', { class: 'progress-fill' });
  const setupCard = el('div', { class: 'card', style: 'padding:20px 22px;margin-top:26px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;' }, [
    el('div', { style: 'flex:1;min-width:220px;' }, [
      el('div', { style: 'display:flex;align-items:center;gap:9px;' }, [
        icon('rocket-launch', 'font-size:18px;color:var(--accent);'),
        el('span', { style: 'font-size:16px;font-weight:800;color:var(--text);', text: 'Finish getting started' }),
        checklistBadge,
      ]),
      checklistDesc,
      el('div', { class: 'progress-track', style: 'max-width:420px;' }, [checklistFill]),
    ]),
    el('button', { class: 'btn', type: 'button', style: 'flex:0 0 auto;', onclick: onGoCeo }, [icon('sparkle', 'font-size:15px;'), 'Continue with your AI CEO']),
  ]);

  const ceoJumpLabel = el('div', { style: 'font-size:13.5px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;' });
  const ceoJumpAvatar = el('div', { class: 'avatar avatar-ada', style: 'width:34px;height:34px;font-size:14px;', text: 'A' });

  const root = el('div', { class: 'section', id: 'panel-home' }, [
    el('div', { class: 'section-header' }, [
      el('span', { style: 'font-size:16px;font-weight:800;color:var(--text);', text: 'Home' }),
      el('button', { class: 'btn btn-secondary', type: 'button', style: 'height:32px;padding:0 11px;', onclick: onOpenPalette }, [
        icon('magnifying-glass', 'font-size:14px;'),
        el('span', { style: 'font-size:12.5px;', text: 'Search' }),
        el('span', { class: 'kbd', text: '⌘K' }),
      ]),
    ]),
    el('div', { class: 'section-scroll' }, [
      el('div', { style: 'max-width:940px;margin:0 auto;padding:36px 40px 44px;' }, [
        greetingLabel,
        title,
        subtitle,
        setupCard,
        el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;' }, [
          el('div', { class: 'card', style: 'padding:18px 20px;' }, [
            el('div', { style: 'font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px;', text: 'Jump back in' }),
            el('div', { class: 'jump-row', style: 'display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:10px;cursor:pointer;margin:0 -6px;', onclick: onGoGeneral }, [
              el('div', { style: 'width:34px;height:34px;border-radius:9px;background:var(--accent-soft);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;flex:0 0 auto;' }, [icon('hash', 'font-size:16px;color:var(--accent);')]),
              el('div', { style: 'flex:1;min-width:0;' }, [el('div', { style: 'font-size:13.5px;font-weight:700;color:var(--text);', text: 'general' }), el('div', { style: 'font-size:12px;color:var(--subtle);', text: 'Company-wide channel' })]),
              icon('caret-right', 'font-size:14px;color:var(--subtle);'),
            ]),
            el('div', { class: 'jump-row', style: 'display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:10px;cursor:pointer;margin:0 -6px;', onclick: onGoCeo }, [
              el('div', { style: 'position:relative;flex:0 0 auto;' }, [ceoJumpAvatar, el('span', { class: 'avatar-dot avatar-dot-ada', style: 'right:-3px;bottom:-3px;width:11px;height:11px;' })]),
              el('div', { style: 'flex:1;min-width:0;' }, [ceoJumpLabel, el('div', { style: 'font-size:12px;color:var(--subtle);', text: 'Your AI CEO · get set up' })]),
              icon('caret-right', 'font-size:14px;color:var(--subtle);'),
            ]),
          ]),
          el('div', { class: 'card', style: 'padding:18px 20px;display:flex;flex-direction:column;' }, [
            el('div', { style: 'font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px;', text: 'Catch up' }),
            el('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16px 0;' }, [
              el('div', { style: 'width:46px;height:46px;border-radius:14px;background:var(--content-bg-2);display:flex;align-items:center;justify-content:center;margin-bottom:11px;' }, [icon('check-circle', 'font-size:22px;color:var(--subtle);')]),
              el('div', { style: 'font-size:13.5px;font-weight:700;color:var(--text);', text: "You're all caught up" }),
              el('div', { style: 'font-size:12.5px;color:var(--subtle);margin-top:3px;line-height:1.5;', text: 'New mentions and unreads will land here.' }),
            ]),
          ]),
        ]),
        el('div', { class: 'card', style: 'padding:18px 20px;margin-top:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;' }, [
          el('div', { style: 'width:44px;height:44px;border-radius:12px;background:var(--content-bg-2);display:flex;align-items:center;justify-content:center;flex:0 0 auto;' }, [icon('users-three', 'font-size:22px;color:var(--muted);')]),
          el('div', { style: 'flex:1;min-width:200px;' }, [
            el('div', { class: 'invite-title', style: 'font-size:14px;font-weight:800;color:var(--text);' }),
            el('div', { style: 'font-size:13px;color:var(--muted);margin-top:2px;line-height:1.5;', text: 'Invite teammates to bring your workspace to life.' }),
          ]),
          el('button', { class: 'btn btn-secondary', type: 'button', style: 'flex:0 0 auto;' }, [icon('user-plus', 'font-size:15px;'), 'Invite people']),
        ]),
      ]),
    ]),
  ]);

  return {
    el: root,
    update({ companyName, founderName, ceoName, onboardingComplete, hasSentToCeo, hasGeneralMessage }) {
      const company = companyName || 'my-team';
      greetingLabel.textContent = greeting();
      title.textContent = `Welcome to ${company}, ${founderName || 'there'}.`;
      ceoJumpAvatar.textContent = initialOf(ceoName, 'A');
      ceoJumpLabel.replaceChildren(ceoName || 'your AI CEO', el('span', { class: 'badge-ai', style: 'font-size:8.5px;padding:1px 4px;', text: 'AI' }));
      root.querySelector('.invite-title').textContent = `It's just you and ${ceoName || 'your AI CEO'} so far`;

      const checklist = deriveChecklist({ onboardingComplete, hasSentToCeo, hasGeneralMessage });
      const done = checklist.filter((c) => c.done).length;
      checklistBadge.textContent = `${done}/${checklist.length}`;
      checklistDesc.textContent = `Chat with ${ceoName || 'your AI CEO'} to set up your profile, make ${company} yours, and learn the ropes — about a minute.`;
      checklistFill.style.width = `${Math.round((done / checklist.length) * 100)}%`;
      setupCard.hidden = done === checklist.length;
    },
  };
}
