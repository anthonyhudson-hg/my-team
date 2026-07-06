import { query } from '@anthropic-ai/claude-agent-sdk';
import { sanitizeEnv } from './env.js';
import { formatProfileForSystemPrompt, getOnboardingSystemPrompt, readProfile } from './profile.js';

export type ChatEvent =
  | { type: 'meta'; sessionId: string }
  | { type: 'text'; text: string }
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
      const systemPromptAppend = profile ? formatProfileForSystemPrompt(profile) : getOnboardingSystemPrompt(cwd);
      const q = query({
        prompt: message,
        options: {
          cwd,
          env: sanitizeEnv(process.env),
          permissionMode: 'auto',
          ...(this.sessionId ? { resume: this.sessionId } : {}),
          systemPrompt: { type: 'preset', preset: 'claude_code', append: systemPromptAppend },
        },
      });

      for await (const msg of q) {
        if (msg.type === 'system' && msg.subtype === 'init') {
          this.sessionId = msg.session_id;
          yield { type: 'meta', sessionId: msg.session_id };
        } else if (msg.type === 'assistant') {
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              yield { type: 'text', text: block.text };
            } else if (block.type === 'tool_use') {
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
      yield { type: 'error', message: String((err as Error)?.message ?? err) };
    } finally {
      this.turnInFlight = false;
    }
  }
}
