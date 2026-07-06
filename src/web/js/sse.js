/**
 * Manual SSE reader over a fetch Response — not the native EventSource,
 * since that only supports GET with no request body and our chat turn needs
 * a JSON POST body (message, model/effort overrides, widget-answer flag).
 */
export async function readEventStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const raw of events) {
      const line = raw.trim();
      if (!line.startsWith('data: ')) continue;
      try {
        onEvent(JSON.parse(line.slice('data: '.length)));
      } catch {
        // Skip a malformed event rather than aborting the whole stream.
      }
    }
  }
}
