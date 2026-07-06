import { describe, expect, it } from 'vitest';
import { buildTimeline, ONBOARDING_KICKOFF_MESSAGE } from './timeline.js';

describe('buildTimeline', () => {
  it('excludes the synthetic onboarding kickoff message from the visible transcript', () => {
    const items = buildTimeline([{ kind: 'user', text: ONBOARDING_KICKOFF_MESSAGE, ts: 't1' }]);
    expect(items).toEqual([]);
  });

  it('renders a plain user message', () => {
    const items = buildTimeline([{ kind: 'user', text: 'hi', ts: 't1' }]);
    expect(items).toEqual([{ type: 'user', text: 'hi', ts: 't1' }]);
  });

  it('pairs a widget-carrying assistant message with its later widget-answer as a locked answered card', () => {
    const entries = [
      { kind: 'assistant', text: 'Hi\n```question-widget\n{"type":"text","question":"Name?"}\n```', model: 'm', effort: '', ts: 't1' },
      { kind: 'widget-answer', text: 'Taylor', ts: 't2' },
    ];
    const items = buildTimeline(entries);
    expect(items).toEqual([
      { type: 'ceo', text: 'Hi', ts: 't1', model: 'm', effort: '' },
      { type: 'widget-answered', question: 'Name?', answerText: 'Taylor', ts: 't2' },
    ]);
  });

  it('renders a trailing unanswered widget as live, not answered', () => {
    const entries = [{ kind: 'assistant', text: '```question-widget\n{"type":"text","question":"Name?"}\n```', model: 'm', effort: '', ts: 't1' }];
    const items = buildTimeline(entries);
    expect(items).toEqual([{ type: 'widget-live', data: { type: 'text', question: 'Name?' }, ts: 't1' }]);
  });

  it('falls back to a plain user bubble for an orphaned widget-answer with no preceding widget', () => {
    const items = buildTimeline([{ kind: 'widget-answer', text: 'orphan', ts: 't1' }]);
    expect(items).toEqual([{ type: 'user', text: 'orphan', ts: 't1' }]);
  });

  it('surfaces error entries and skips tool entries entirely', () => {
    const entries = [
      { kind: 'tool', name: 'Bash', ts: 't1' },
      { kind: 'error', message: 'boom', ts: 't2' },
    ];
    const items = buildTimeline(entries);
    expect(items).toEqual([{ type: 'error', message: 'boom', ts: 't2' }]);
  });

  it('omits an assistant entry whose text is only a widget block with no lead-in text', () => {
    const entries = [{ kind: 'assistant', text: '```question-widget\n{"type":"text","question":"Q"}\n```', model: 'm', effort: '', ts: 't1' }];
    const items = buildTimeline(entries);
    expect(items.some((i) => i.type === 'ceo')).toBe(false);
  });
});
