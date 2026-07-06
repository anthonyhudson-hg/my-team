import { describe, expect, it } from 'vitest';
import { createStreamParser, extractWidget } from './stream-parser.js';

function collect() {
  const text = [];
  const widgets = [];
  const parser = createStreamParser({ onText: (t) => text.push(t), onWidget: (w) => widgets.push(w) });
  return { parser, text, widgets };
}

describe('createStreamParser', () => {
  it('passes plain text straight through with no widget', () => {
    const { parser, text, widgets } = collect();
    parser.feed('Hello there!');
    parser.flush();
    expect(text.join('')).toBe('Hello there!');
    expect(widgets).toEqual([]);
  });

  it('extracts a widget block delivered as a single chunk', () => {
    const { parser, text, widgets } = collect();
    parser.feed('Question?\n```question-widget\n{"type":"text","question":"Name?"}\n```\n');
    parser.flush();
    // The trailing "\n" after the closing fence is real stream content and is preserved.
    expect(text.join('')).toBe('Question?\n\n');
    expect(widgets).toEqual([{ type: 'text', question: 'Name?' }]);
  });

  it('reassembles a fence marker split across two delta chunks (regression: eager-flush bug)', () => {
    const { parser, text, widgets } = collect();
    // Split the opening fence itself mid-marker, as real token-level streaming would.
    parser.feed('Question?\n```question-w');
    parser.feed('idget\n{"type":"text","question":"Name?"}\n```\n');
    parser.flush();
    expect(text.join('')).toBe('Question?\n\n');
    expect(widgets).toEqual([{ type: 'text', question: 'Name?' }]);
  });

  it('never flushes a partial fence marker as visible text before flush()', () => {
    const { parser, text } = collect();
    // OPEN_FENCE is 18 chars, so only the last 17 are ever held back regardless
    // of where within them a real fence prefix would start.
    parser.feed('Hello ```question-w');
    expect(text.join('')).not.toContain('```');
    expect(text.join('')).toBe('He');
  });

  it('drops malformed widget JSON without throwing or corrupting later text', () => {
    const { parser, text, widgets } = collect();
    parser.feed('```question-widget\nnot json\n```After');
    parser.flush();
    expect(widgets).toEqual([]);
    expect(text.join('')).toBe('After');
  });

  it('handles text after a widget block in the same message', () => {
    const { parser, text, widgets } = collect();
    parser.feed('Before\n```question-widget\n{"type":"text","question":"Q"}\n```\nAfter');
    parser.flush();
    expect(text.join('')).toBe('Before\n' + '\nAfter');
    expect(widgets).toEqual([{ type: 'text', question: 'Q' }]);
  });
});

describe('extractWidget', () => {
  it('returns the surrounding text and parsed widget for a stored message', () => {
    const { text, widget } = extractWidget('Hi!\n```question-widget\n{"type":"single_select","question":"Pick","options":["A","B"]}\n```\n');
    expect(text).toBe('Hi!\n\n');
    expect(widget).toEqual({ type: 'single_select', question: 'Pick', options: ['A', 'B'] });
  });

  it('returns a null widget when the message has no widget block', () => {
    const { text, widget } = extractWidget('Just a normal reply.');
    expect(text).toBe('Just a normal reply.');
    expect(widget).toBeNull();
  });
});
