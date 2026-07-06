import { query, type AccountInfo } from '@anthropic-ai/claude-agent-sdk';
import { sanitizeEnv } from './env.js';

export type AuthCheckResult =
  | { ok: true; accountInfo: AccountInfo }
  | { ok: false; reason: 'cli-missing' }
  | { ok: false; reason: 'not-authenticated' };

/**
 * Live probe, run fresh on every /api/status call rather than caching an
 * "onboarded" flag, so it can't go stale.
 *
 * Iterating a query() call to completion sends a real, billed model turn
 * (confirmed empirically) even for an empty prompt. Aborting as soon as the
 * `system init` message arrives is enough to call accountInfo() without ever
 * dispatching a turn.
 */
export async function checkAuth(cwd: string): Promise<AuthCheckResult> {
  const controller = new AbortController();
  const q = query({
    prompt: '',
    options: {
      cwd,
      env: sanitizeEnv(process.env),
      permissionMode: 'plan',
      abortController: controller,
      maxTurns: 1,
    },
  });

  try {
    for await (const msg of q) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        const accountInfo = await q.accountInfo();
        controller.abort();
        if (!accountInfo.email && !accountInfo.apiProvider) {
          return { ok: false, reason: 'not-authenticated' };
        }
        return { ok: true, accountInfo };
      }
    }
    return { ok: false, reason: 'not-authenticated' };
  } catch (err) {
    controller.abort();
    const message = String((err as Error)?.message ?? err);
    if (/native binary not found|ENOENT|not recognized as an internal/i.test(message)) {
      return { ok: false, reason: 'cli-missing' };
    }
    return { ok: false, reason: 'not-authenticated' };
  }
}
