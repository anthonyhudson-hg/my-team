import { extractWidget } from './stream-parser.js';

/** Sent automatically to kick off onboarding on a brand-new instance — not something the founder actually typed, so it's excluded from the visible transcript. */
export const ONBOARDING_KICKOFF_MESSAGE = 'Please begin the onboarding conversation.';

/**
 * Turns the raw persisted chat-history entries (chat-history.ts's
 * HistoryEntry union) into a flat list of render items for the CEO DM.
 * A widget embedded in an assistant message either gets paired with the
 * widget-answer entry that follows it (rendered locked, with chips) or, if
 * none follows, is the trailing live widget the composer is still gated on —
 * this is what lets a widget survive a server restart as genuinely
 * answerable rather than a dead, frozen card.
 */
export function buildTimeline(entries) {
  const items = [];
  let pendingWidget = null;

  for (const entry of entries) {
    if (entry.kind === 'user') {
      if (entry.text === ONBOARDING_KICKOFF_MESSAGE) continue;
      items.push({ type: 'user', text: entry.text, ts: entry.ts });
    } else if (entry.kind === 'widget-answer') {
      if (pendingWidget) {
        items.push({ type: 'widget-answered', question: pendingWidget.data.question, answerText: entry.text, ts: entry.ts });
        pendingWidget = null;
      } else {
        items.push({ type: 'user', text: entry.text, ts: entry.ts });
      }
    } else if (entry.kind === 'assistant') {
      const { text, widget } = extractWidget(entry.text);
      if (text.trim()) items.push({ type: 'ceo', text: text.trim(), ts: entry.ts, model: entry.model, effort: entry.effort });
      if (widget) pendingWidget = { data: widget, ts: entry.ts };
    } else if (entry.kind === 'error') {
      items.push({ type: 'error', message: entry.message, ts: entry.ts });
    }
    // 'tool' entries aren't rendered as their own bubble — a tool call has no
    // useful visual besides the text/widget the turn produces around it.
  }

  if (pendingWidget) items.push({ type: 'widget-live', data: pendingWidget.data, ts: pendingWidget.ts });
  return items;
}
