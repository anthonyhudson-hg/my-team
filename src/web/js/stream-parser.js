const OPEN_FENCE = '```question-widget';
const CLOSE_FENCE = '```';

/**
 * Incrementally splits a streamed assistant response into plain text and
 * `question-widget` JSON blocks (see profile.ts's QUESTION_WIDGET_INSTRUCTIONS).
 * Text is held back by up to OPEN_FENCE.length-1 characters at all times so a
 * fence marker split across two delta chunks is never flushed as plain text
 * before it's known whether it's really a widget marker.
 */
/** Synchronous one-shot variant of createStreamParser, for replaying a complete stored message rather than a live stream. */
export function extractWidget(fullText) {
  let text = '';
  let widget = null;
  const parser = createStreamParser({
    onText: (chunk) => {
      text += chunk;
    },
    onWidget: (data) => {
      widget = data;
    },
  });
  parser.feed(fullText);
  parser.flush();
  return { text, widget };
}

export function createStreamParser({ onText, onWidget }) {
  let buffer = '';
  let mode = 'text';
  let widgetBuffer = '';

  function process() {
    if (mode === 'text') {
      const fenceIndex = buffer.indexOf(OPEN_FENCE);
      if (fenceIndex === -1) {
        const holdBack = Math.max(0, buffer.length - (OPEN_FENCE.length - 1));
        if (holdBack > 0) {
          onText(buffer.slice(0, holdBack));
          buffer = buffer.slice(holdBack);
        }
        return;
      }
      if (fenceIndex > 0) onText(buffer.slice(0, fenceIndex));
      buffer = buffer.slice(fenceIndex + OPEN_FENCE.length);
      mode = 'in-widget';
      widgetBuffer = '';
      process();
      return;
    }

    const closeIndex = buffer.indexOf(CLOSE_FENCE);
    if (closeIndex === -1) {
      widgetBuffer += buffer;
      buffer = '';
      return;
    }
    widgetBuffer += buffer.slice(0, closeIndex);
    buffer = buffer.slice(closeIndex + CLOSE_FENCE.length);
    mode = 'text';
    try {
      onWidget(JSON.parse(widgetBuffer.trim()));
    } catch {
      // Malformed widget JSON — drop silently rather than corrupting the transcript.
    }
    widgetBuffer = '';
    process();
  }

  return {
    feed(chunk) {
      buffer += chunk;
      process();
    },
    /** Call once the stream ends — flushes any held-back text tail (a real widget marker never arrives mid-stream without its close fence). */
    flush() {
      if (mode === 'text' && buffer) {
        onText(buffer);
        buffer = '';
      }
    },
  };
}
