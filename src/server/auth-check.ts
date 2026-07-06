import { query, type AccountInfo } from '@anthropic-ai/claude-agent-sdk';
import { sanitizeEnv } from './env.js';
import { forLog, type Logger } from './logger.js';

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
export async function checkAuth(cwd: string, logger: Logger): Promise<AuthCheckResult> {
  const controller = new AbortController();
  const options = {
    cwd,
    env: sanitizeEnv(process.env),
    permissionMode: 'plan' as const,
    abortController: controller,
    maxTurns: 1,
  };
  logger.log({ type: 'auth-check-request', options: forLog(options) });
  const q = query({ prompt: '', options });

  try {
    for await (const msg of q) {
      logger.log({ type: 'auth-check-sdk-message', message: msg });
      if (msg.type === 'system' && msg.subtype === 'init') {
        const accountInfo = await q.accountInfo();
        logger.log({ type: 'auth-check-account-info', accountInfo });
        controller.abort();
        if (!accountInfo.email && !accountInfo.apiProvider) {
          const result: AuthCheckResult = { ok: false, reason: 'not-authenticated' };
          logger.log({ type: 'auth-check-result', result });
          return result;
        }
        const result: AuthCheckResult = { ok: true, accountInfo };
        logger.log({ type: 'auth-check-result', result });
        return result;
      }
    }
    const result: AuthCheckResult = { ok: false, reason: 'not-authenticated' };
    logger.log({ type: 'auth-check-result', result });
    return result;
  } catch (err) {
    controller.abort();
    const message = String((err as Error)?.message ?? err);
    logger.log({ type: 'auth-check-error', error: message, stack: (err as Error)?.stack });
    if (/native binary not found|ENOENT|not recognized as an internal/i.test(message)) {
      return { ok: false, reason: 'cli-missing' };
    }
    return { ok: false, reason: 'not-authenticated' };
  }
}
