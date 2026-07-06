import { el, icon } from '../dom.js';

const OTHER_LABEL = 'Other…';

/**
 * Live, answerable widget for a `question-widget` block the CEO emitted
 * (see profile.ts's QUESTION_WIDGET_INSTRUCTIONS). Our onboarding is an
 * open-ended AI conversation, not a fixed-length wizard, so unlike the
 * source design there is no known step count — the card intentionally has
 * no numbered progress segments, only a "waiting for you" state.
 */
export function createQuestionWidget(data, { onAnswer, isOnboarding }) {
  const card = el('div', { class: 'widget-card' });
  let submitted = false;

  const submit = (answerText) => {
    if (submitted || !answerText.trim()) return;
    submitted = true;
    onAnswer(answerText.trim());
  };

  card.append(
    el('div', { class: 'widget-header' }, [
      el('div', { class: 'widget-header-left' }, [
        el('span', { class: 'widget-icon' }, [icon('sparkle')]),
        el('div', {}, [el('div', { class: 'widget-kicker', text: isOnboarding ? 'QUICK SETUP' : 'QUESTION' })]),
      ]),
      el('div', { class: 'widget-waiting' }, [
        el('span', { class: 'widget-waiting-dot' }),
        el('span', { class: 'widget-waiting-label', text: 'Waiting for you' }),
      ]),
    ]),
    el('div', { class: 'widget-question', text: data.question }),
  );

  const body = el('div', { class: 'widget-body' });
  card.appendChild(body);

  if (data.type === 'text') {
    body.appendChild(el('div', { class: 'widget-instr', text: 'Type your answer' }));
    const input = el('input', { class: 'widget-text-input', type: 'text', placeholder: 'Type your answer…' });
    const button = el('button', { class: 'widget-continue', type: 'button', disabled: true }, ['Continue', icon('arrow-right')]);
    const refresh = () => {
      button.disabled = !input.value.trim();
    };
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit(input.value);
      }
    });
    button.addEventListener('click', () => submit(input.value));
    body.appendChild(el('div', { class: 'widget-text-row' }, [input, button]));
    setTimeout(() => input.focus(), 20);
  } else if (data.type === 'single_select') {
    body.appendChild(el('div', { class: 'widget-instr', text: 'Pick the closest fit' }));
    const options = el('div', { class: 'widget-options' });
    for (const label of [...data.options, OTHER_LABEL]) {
      options.appendChild(
        el('button', {
          class: 'widget-option-btn',
          type: 'button',
          onclick: () => (label === OTHER_LABEL ? showOtherInput(body, submit) : submit(label)),
        }, [label]),
      );
    }
    body.appendChild(options);
  } else if (data.type === 'multi_select') {
    body.appendChild(el('div', { class: 'widget-instr', text: 'Select all that apply' }));
    const selected = new Set();
    const rows = el('div', { class: 'widget-check-row' });
    const allLabels = [...data.options, OTHER_LABEL];
    let otherInput = null;
    for (const label of allLabels) {
      const row = el('div', { class: 'widget-check-option' }, [
        el('div', { class: 'widget-checkbox' }, [icon('check')]),
        el('span', { style: 'flex:1;font-size:13.5px;font-weight:600;color:var(--text);', text: label }),
      ]);
      row.addEventListener('click', () => {
        if (label === OTHER_LABEL && !otherInput) {
          otherInput = el('input', { class: 'widget-text-input', type: 'text', placeholder: 'Type your own…', style: 'margin-top:8px;' });
          row.appendChild(otherInput);
          otherInput.addEventListener('click', (e) => e.stopPropagation());
          setTimeout(() => otherInput.focus(), 20);
        }
        const isSelected = selected.has(label);
        if (isSelected) selected.delete(label);
        else selected.add(label);
        row.classList.toggle('selected', !isSelected);
        row.querySelector('.widget-checkbox').classList.toggle('checked', !isSelected);
      });
      rows.appendChild(row);
    }
    const continueBtn = el('button', { class: 'widget-continue', type: 'button', style: 'margin-top:13px;width:100%;justify-content:center;' }, ['Continue']);
    continueBtn.addEventListener('click', () => {
      const labels = [...selected].map((label) => (label === OTHER_LABEL ? (otherInput?.value.trim() || '') : label)).filter(Boolean);
      submit(labels.join(', '));
    });
    body.appendChild(rows);
    body.appendChild(continueBtn);
  }

  return card;
}

function showOtherInput(body, submit) {
  if (body.querySelector('.widget-other-row')) return;
  const input = el('input', { class: 'widget-text-input', type: 'text', placeholder: 'Type your own…' });
  const button = el('button', { class: 'widget-continue', type: 'button' }, ['Continue', icon('arrow-right')]);
  button.addEventListener('click', () => submit(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit(input.value);
    }
  });
  body.appendChild(el('div', { class: 'widget-text-row widget-other-row', style: 'margin-top:10px;' }, [input, button]));
  setTimeout(() => input.focus(), 20);
}

/** Locked, history-replay rendering of an already-answered widget. */
export function createAnsweredWidget({ question, answerText }) {
  const chips = answerText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return el('div', { class: 'widget-answered' }, [
    el('div', { class: 'widget-answered-card' }, [
      el('span', { class: 'widget-answered-check' }, [icon('check')]),
      el('div', { style: 'flex:1;min-width:0;' }, [
        el('div', { class: 'widget-answered-question', text: question }),
        el('div', { class: 'widget-answered-chips' }, chips.map((chip) => el('span', { class: 'widget-answered-chip', text: chip }))),
      ]),
    ]),
  ]);
}
