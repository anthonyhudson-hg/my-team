import { query } from '@anthropic-ai/claude-agent-sdk';
import { appendHistory } from './chat-history.js';
import { sanitizeEnv } from './env.js';
import { forLog, type Logger } from './logger.js';
import { formatProfileForSystemPrompt, getOnboardingSystemPrompt, readProfile } from './profile.js';

export type ChatEvent =
  | { type: 'meta'; sessionId: string; model: string; effort: string }
  | { type: 'text-delta'; text: string }
  | { type: 'tool-use'; name: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface ChatTurnOverrides {
  model?: string;
  effort?: string;
  /** True when this message is a question-widget answer, not free-typed text — recorded distinctly so history replay can lock the widget instead of showing a duplicate bubble. */
  isWidgetAnswer?: boolean;
}

/**
 * One ongoing SDK session per running server process. Claude's own
 * conversation context survives via `resume`; the *visible* transcript is
 * additionally persisted to chat-history.jsonl (see chat-history.ts) so a
 * page reload or a full server restart both show prior messages instead of
 * an empty thread.
 */
export class ChatSession {
  private sessionId: string | undefined;
  private turnInFlight = false;

  constructor(private logger: Logger) {}

  isBusy(): boolean {
    return this.turnInFlight;
  }

  async *sendTurn(message: string, cwd: string, overrides: ChatTurnOverrides = {}): AsyncGenerator<ChatEvent> {
    if (this.turnInFlight) {
      yield { type: 'error', message: 'A previous turn is still in progress.' };
      return;
    }
    this.turnInFlight = true;
    const ts = new Date().toISOString();
    await appendHistory(cwd, { kind: overrides.isWidgetAnswer ? 'widget-answer' : 'user', text: message, ts });
    let assistantText = '';
    let resultModel = '';
    let resultEffort = '';
    try {
      const profile = await readProfile(cwd);
      const onboarded = profile?.onboardingComplete === true;
      const systemPromptAppend = onboarded
        ? formatProfileForSystemPrompt(profile, cwd)
        : getOnboardingSystemPrompt(cwd);
      // Per-message override wins, then the CEO's configured default, then no
      // override at all (Claude Code picks its own default).
      const model = overrides.model || profile?.defaultModel || undefined;
      const effort = overrides.effort || profile?.defaultEffort || undefined;
      const options = {
        cwd,
        env: sanitizeEnv(process.env),
        permissionMode: 'auto' as const,
        includePartialMessages: true,
        ...(this.sessionId ? { resume: this.sessionId } : {}),
        systemPrompt: { type: 'preset' as const, preset: 'claude_code' as const, append: systemPromptAppend },
        ...(model ? { model } : {}),
        ...(effort ? { effort: effort as 'low' | 'medium' | 'high' | 'xhigh' | 'max' } : {}),
      };
      this.logger.log({ type: 'chat-request', message, options: forLog(options) });
      const q = query({ prompt: message, options });

      for await (const msg of q) {
        this.logger.log({ type: 'chat-sdk-message', message: msg });
        if (msg.type === 'system' && msg.subtype === 'init') {
          this.sessionId = msg.session_id;
          // msg.model reflects what the SDK actually resolved and used for
          // this turn; effort isn't echoed back on the message stream, so we
          // report what we requested (the UI only ever offers effort levels
          // the chosen model's own supportedEffortLevels confirms are valid,
          // so a silent downgrade in practice shouldn't occur).
          resultModel = msg.model;
          resultEffort = effort ?? '';
          yield { type: 'meta', sessionId: msg.session_id, model: msg.model, effort: effort ?? '' };
        } else if (msg.type === 'stream_event') {
          const event = msg.event;
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            assistantText += event.delta.text;
            yield { type: 'text-delta', text: event.delta.text };
          }
        } else if (msg.type === 'assistant') {
          // Text was already streamed via stream_event deltas above — only tool
          // calls are new information here (tool inputs don't render usefully).
          for (const block of msg.message.content) {
            if (block.type === 'tool_use') {
              await appendHistory(cwd, { kind: 'tool', name: block.name, ts: new Date().toISOString() });
              yield { type: 'tool-use', name: block.name };
            }
          }
        } else if (msg.type === 'result') {
          if (msg.subtype !== 'success') {
            await appendHistory(cwd, { kind: 'error', message: msg.subtype, ts: new Date().toISOString() });
            yield { type: 'error', message: msg.subtype };
          }
          yield { type: 'done' };
        }
      }
      if (assistantText) {
        await appendHistory(cwd, {
          kind: 'assistant',
          text: assistantText,
          model: resultModel,
          effort: resultEffort,
          ts: new Date().toISOString(),
        });
      }
    } catch (err) {
      this.logger.log({ type: 'chat-error', error: String((err as Error)?.message ?? err), stack: (err as Error)?.stack });
      await appendHistory(cwd, { kind: 'error', message: String((err as Error)?.message ?? err), ts: new Date().toISOString() });
      yield { type: 'error', message: String((err as Error)?.message ?? err) };
    } finally {
      this.turnInFlight = false;
    }
  }
}
