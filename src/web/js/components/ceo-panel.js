import { api } from '../api.js';
import { el, icon, mount } from '../dom.js';
import { initialOf } from '../format.js';
import { readEventStream } from '../sse.js';
import { createComposer } from './composer.js';
import { createDayDivider, createLiveCeoMessageRow, createTypingRow, createUserMessageRow } from './message.js';
import { createAnsweredWidget, createQuestionWidget } from './question-widget.js';
import { createStreamParser } from '../stream-parser.js';
import { buildTimeline, ONBOARDING_KICKOFF_MESSAGE } from '../timeline.js';

const SKIP_MESSAGE = "Let's skip this for now — I can come back to it later.";

export function createCeoPanel({ onConfigureEmployee }) {
  const headerAvatar = el('div', { class: 'avatar avatar-ada', style: 'width:26px;height:26px;font-size:12px;', text: 'A' });
  const headerName = el('span', { style: 'font-size:16px;font-weight:800;color:var(--text);', text: 'your AI CEO' });

  let moreMenuOpen = false;
  const moreMenu = el('div', { class: 'menu', style: 'top:calc(100% + 6px);right:0;width:200px;', hidden: true }, [
    el('div', { class: 'menu-item', onclick: () => { closeMoreMenu(); onConfigureEmployee(); } }, [
      icon('sliders', 'font-size:15px;color:var(--accent);width:18px;text-align:center;flex:0 0 auto;'),
      el('div', { class: 'menu-item-title', text: 'Configure Employee' }),
    ]),
  ]);
  const moreBackdrop = el('div', { class: 'menu-backdrop', hidden: true, onclick: closeMoreMenu });
  function toggleMoreMenu() {
    moreMenuOpen = !moreMenuOpen;
    moreMenu.hidden = !moreMenuOpen;
    moreBackdrop.hidden = !moreMenuOpen;
  }
  function closeMoreMenu() {
    moreMenuOpen = false;
    moreMenu.hidden = true;
    moreBackdrop.hidden = true;
  }

  const introAvatar = el('div', { class: 'avatar avatar-ada', style: 'position:relative;width:64px;height:64px;font-size:26px;border-radius:19px;margin-bottom:15px;', text: 'A' }, [
    el('span', { class: 'avatar-dot avatar-dot-ada', style: 'right:-4px;bottom:-4px;width:22px;height:22px;border:3px solid var(--content-bg);display:flex;align-items:center;justify-content:center;' }, [icon('sparkle', 'font-size:11px;color:#fff;')]),
  ]);
  const introName = el('h2', { style: 'margin:0;font-size:23px;font-weight:800;color:var(--text);letter-spacing:-.02em;' });
  const introDesc = el('p', { style: 'margin:6px 0 0;font-size:14.5px;color:var(--muted);line-height:1.55;max-width:560px;' });

  const timelineEl = el('div', {});
  const typingRow = createTypingRow('');
  typingRow.hidden = true;

  const chipsRow = el('div', { class: 'suggested-chips' });
  chipsRow.hidden = true;

  const composer = createComposer({
    placeholder: 'Message your AI CEO',
    showModelMenu: true,
    onSend: (text, overrides) => sendMessage(text, overrides, false),
  });

  const scroll = el('div', { class: 'section-scroll' }, [
    el('div', { class: 'section-centered', style: 'padding:30px 30px 8px;' }, [
      introAvatar,
      el('div', { style: 'display:flex;align-items:center;gap:9px;' }, [introName, el('span', { class: 'badge-ai', style: 'font-size:10px;padding:2px 6px;border-radius:6px;', text: 'AI' })]),
      introDesc,
      createDayDivider('Today'),
      timelineEl,
      typingRow,
    ]),
  ]);

  const root = el('div', { class: 'section', id: 'panel-ceo' }, [
    el('div', { class: 'section-header' }, [
      el('div', { style: 'display:flex;align-items:center;gap:9px;min-width:0;' }, [
        el('div', { style: 'position:relative;flex:0 0 auto;' }, [headerAvatar, el('span', { class: 'avatar-dot avatar-dot-ada', style: 'right:-2px;bottom:-2px;width:9px;height:9px;' })]),
        headerName,
        el('span', { class: 'badge-ai', text: 'AI' }),
        el('span', { style: 'font-size:13px;color:var(--muted);', text: 'CEO · always around' }),
      ]),
      el('div', { style: 'display:flex;align-items:center;gap:2px;' }, [
        el('button', { class: 'icon-btn icon-btn-md', type: 'button', disabled: true, title: 'Voice support — coming soon' }, [icon('headset', 'font-size:17px;')]),
        el('div', { style: 'position:relative;' }, [
          el('button', { class: 'icon-btn icon-btn-md', type: 'button', onclick: toggleMoreMenu }, [icon('dots-three', 'font-size:18px;')]),
          moreMenu,
        ]),
      ]),
    ]),
    moreBackdrop,
    scroll,
    el('div', { id: 'composer-area' }, [chipsRow, composer.el]),
  ]);

  let ceoName = 'your AI CEO';
  let companyName = 'Cofound';
  let founderName = '';
  let onboardingComplete = false;
  let liveWidgetOpen = false;
  let sending = false;

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scroll.scrollTop = scroll.scrollHeight;
    });
  }

  function renderTimelineItem(item) {
    if (item.type === 'user') return createUserMessageRow({ name: founderName || 'You', text: item.text, ts: item.ts });
    if (item.type === 'ceo') {
      const live = createLiveCeoMessageRow(ceoName);
      live.appendText(item.text);
      live.setMeta({ model: item.model, effort: item.effort, ts: item.ts });
      return live.row;
    }
    if (item.type === 'widget-answered') return createAnsweredWidget(item);
    if (item.type === 'error') return el('div', { class: 'system-note', style: 'color:var(--danger);', text: `Something went wrong: ${item.message}` });
    return null;
  }

  function renderLiveWidget(data) {
    liveWidgetOpen = true;
    const card = createQuestionWidget(data, {
      isOnboarding: !onboardingComplete,
      onAnswer: (answerText) => {
        card.replaceWith(createAnsweredWidget({ question: data.question, answerText }));
        liveWidgetOpen = false;
        composer.setLocked(false);
        sendMessage(answerText, {}, true);
      },
    });
    timelineEl.appendChild(card);
    composer.setLocked(
      onboardingComplete ? 'Answer the question above to continue.' : `Messaging unlocks once you finish quick setup with ${ceoName}.`,
      () => {
        card.replaceWith(createAnsweredWidget({ question: data.question, answerText: 'Skipped' }));
        liveWidgetOpen = false;
        composer.setLocked(false);
        sendMessage(SKIP_MESSAGE, {}, true);
      },
    );
    scrollToBottom();
  }

  async function sendMessage(text, overrides, isWidgetAnswer) {
    if (sending) return;
    sending = true;
    composer.setSending(true);
    if (!isWidgetAnswer && text !== ONBOARDING_KICKOFF_MESSAGE) {
      timelineEl.appendChild(createUserMessageRow({ name: founderName || 'You', text, ts: new Date().toISOString() }));
    }
    typingRow.hidden = false;
    chipsRow.hidden = true;
    scrollToBottom();

    let liveRow = null;
    let capturedMeta = { model: '', effort: '' };
    const parser = createStreamParser({
      onText: (chunk) => {
        if (!liveRow) {
          typingRow.hidden = true;
          liveRow = createLiveCeoMessageRow(ceoName);
          timelineEl.appendChild(liveRow.row);
        }
        liveRow.appendText(chunk);
        scrollToBottom();
      },
      onWidget: (data) => {
        typingRow.hidden = true;
        if (liveRow) liveRow.setMeta({ ...capturedMeta, ts: new Date().toISOString() });
        renderLiveWidget(data);
      },
    });

    try {
      const res = await api.chatStream({ message: text, model: overrides.model, effort: overrides.effort, isWidgetAnswer });
      await readEventStream(res, (event) => {
        if (event.type === 'meta') {
          capturedMeta = { model: event.model, effort: event.effort };
        } else if (event.type === 'text-delta') {
          parser.feed(event.text);
        } else if (event.type === 'error') {
          typingRow.hidden = true;
          timelineEl.appendChild(el('div', { class: 'system-note', style: 'color:var(--danger);', text: `Something went wrong: ${event.message}` }));
        } else if (event.type === 'done') {
          parser.flush();
          typingRow.hidden = true;
          if (liveRow) liveRow.setMeta({ ...capturedMeta, ts: new Date().toISOString() });
          if (!liveWidgetOpen && onboardingComplete) chipsRow.hidden = false;
        }
      });
    } finally {
      sending = false;
      composer.setSending(false);
      if (!liveWidgetOpen) composer.setLocked(false);
      scrollToBottom();
    }
  }

  function renderSuggestedChips() {
    const prompts = [
      'What should I focus on this week?',
      'Who should I meet first?',
      `How does ${companyName} work?`,
      'Anything I should read?',
    ];
    mount(
      chipsRow,
      prompts.map((text) =>
        el('button', { class: 'chip-btn', type: 'button', onclick: () => sendMessage(text, {}, false) }, [icon('sparkle', 'font-size:12px;color:var(--accent);'), text]),
      ),
    );
  }

  return {
    el: root,
    async load({ ceoName: name, companyName: company, founderName: founder, onboardingComplete: done, models, defaults, history }) {
      ceoName = name || 'your AI CEO';
      companyName = company || 'Cofound';
      founderName = founder || '';
      onboardingComplete = !!done;
      headerName.textContent = ceoName;
      headerAvatar.textContent = initialOf(ceoName, 'A');
      introAvatar.firstChild.textContent = initialOf(ceoName, 'A');
      introName.textContent = ceoName;
      introDesc.textContent = `Chief Executive Officer at ${companyName}. This is the very beginning of your direct message history with ${ceoName} — it's just the two of you here.`;
      composer.setModels(models, defaults);
      renderSuggestedChips();

      const timeline = buildTimeline(history);
      timelineEl.replaceChildren();
      liveWidgetOpen = false;
      for (const item of timeline) {
        if (item.type === 'widget-live') {
          renderLiveWidget(item.data);
        } else {
          const node = renderTimelineItem(item);
          if (node) timelineEl.appendChild(node);
        }
      }
      chipsRow.hidden = liveWidgetOpen || !onboardingComplete;
      if (!liveWidgetOpen) composer.setLocked(false);
      scrollToBottom();

      if (history.length === 0 && !onboardingComplete) {
        sendMessage(ONBOARDING_KICKOFF_MESSAGE, {}, false);
      }
    },
    hasSentMessage() {
      return timelineEl.children.length > 0;
    },
  };
}
