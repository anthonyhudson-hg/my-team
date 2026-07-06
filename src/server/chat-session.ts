import { query } from '@anthropic-ai/claude-agent-sdk';
import { sanitizeEnv } from './env.js';
import { forLog, type Logger } from './logger.js';
import { formatProfileForSystemPrompt, getOnboardingSystemPrompt, readProfile } from './profile.js';

export type ChatEvent =
  | { type: 'meta'; sessionId: string }
  | { type: 'text-delta'; text: string }
  | { type: 'tool-use'; name: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * One ongoing SDK session per running server process. Conversation history
 * lives only in the CLI's own session store (resumed via session_id) — no
 * disk persistence of our own, lost on server restart (acceptable for v1).
 */
export class ChatSession {
  private sessionId: string | undefined;
  private turnInFlight = false;

  constructor(private logger: Logger) {}

  isBusy(): boolean {
    return this.turnInFlight;
  }

  async *sendTurn(message: string, cwd: string): AsyncGenerator<ChatEvent> {
    if (this.turnInFlight) {
      yield { type: 'error', message: 'A previous turn is still in progress.' };
      return;
    }
    this.turnInFlight = true;
    try {
      const profile = await readProfile(cwd);
      const onboarded = profile?.onboardingComplete === true;
      const systemPromptAppend = onboarded
        ? formatProfileForSystemPrompt(profile)
        : getOnboardingSystemPrompt(cwd);
      const options = {
        cwd,
        env: sanitizeEnv(process.env),
        permissionMode: 'auto' as const,
        includePartialMessages: true,
        ...(this.sessionId ? { resume: this.sessionId } : {}),
        systemPrompt: { type: 'preset' as const, preset: 'claude_code' as const, append: systemPromptAppend },
      };
      this.logger.log({ type: 'chat-request', message, options: forLog(options) });
      const q = query({ prompt: message, options });

      for await (const msg of q) {
        this.logger.log({ type: 'chat-sdk-message', message: msg });
        if (msg.type === 'system' && msg.subtype === 'init') {
          this.sessionId = msg.session_id;
          yield { type: 'meta', sessionId: msg.session_id };
        } else if (msg.type === 'stream_event') {
          const event = msg.event;
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield { type: 'text-delta', text: event.delta.text };
          }
        } else if (msg.type === 'assistant') {
          // Text was already streamed via stream_event deltas above — only tool
          // calls are new information here (tool inputs don't render usefully).
          for (const block of msg.message.content) {
            if (block.type === 'tool_use') {
              yield { type: 'tool-use', name: block.name };
            }
          }
        } else if (msg.type === 'result') {
          if (msg.subtype !== 'success') {
            yield { type: 'error', message: msg.subtype };
          }
          yield { type: 'done' };
        }
      }
    } catch (err) {
      this.logger.log({ type: 'chat-error', error: String((err as Error)?.message ?? err), stack: (err as Error)?.stack });
      yield { type: 'error', message: String((err as Error)?.message ?? err) };
    } finally {
      this.turnInFlight = false;
    }
  }
}
