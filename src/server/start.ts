import { spawn } from 'node:child_process';
import { ensureGitignore } from '../init.js';
import { OWN_PACKAGE_NAME, OWN_PACKAGE_VERSION } from '../own-package.js';
import { createServer } from './http-server.js';
import { createLogger } from './logger.js';
import { removeServerPid, writeServerPid } from './server-pid.js';
import { generateToken } from './token.js';
import { checkForUpdate, type UpdateInfo } from './update-check.js';

function openBrowser(url: string): void {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], { shell: false, stdio: 'ignore', detached: true }).unref();
    } else if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch {
    // Fall through — the URL is printed to the terminal regardless.
  }
}

function installResilienceHandlers(logger: { log(entry: Record<string, unknown>): void }): void {
  // A local dev dashboard staying up through an unexpected error is more
  // useful than crashing the whole session over it — log and continue
  // rather than let Node's default "exit on uncaught exception" behavior
  // take down the UI mid-conversation.
  process.on('uncaughtException', (err) => {
    logger.log({ type: 'uncaught-exception', error: String(err?.message ?? err), stack: err?.stack });
    console.error('my-team: uncaught exception (continuing):', err);
  });
  process.on('unhandledRejection', (reason) => {
    logger.log({ type: 'unhandled-rejection', reason: String(reason) });
    console.error('my-team: unhandled rejection (continuing):', reason);
  });
}

export async function startServer(cwd: string): Promise<void> {
  const token = generateToken();
  const portRef = { port: 0 };
  const logger = createLogger(cwd);

  installResilienceHandlers(logger);
  // Idempotent — also fixes up repos that ran `init` before this existed,
  // not just fresh ones, without needing them to re-run init.
  ensureGitignore(cwd);

  // Fire-and-forget: never block startup on a network round-trip. /api/meta
  // just returns null until this resolves.
  const updateInfoRef: { current: UpdateInfo | null } = { current: null };
  checkForUpdate(OWN_PACKAGE_NAME, OWN_PACKAGE_VERSION).then((info) => {
    updateInfoRef.current = info;
  });

  await new Promise<void>((resolve) => {
    const server = createServer({ cwd, token, portRef, logger, updateInfoRef });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      portRef.port = typeof address === 'object' && address ? address.port : 0;
      const url = `http://127.0.0.1:${portRef.port}/?token=${token}`;
      console.log(`my-team is running for ${cwd}`);
      console.log(`Open: ${url}`);
      console.log(`Logging raw requests/responses to: ${logger.filePath}`);

      writeServerPid(cwd, portRef.port);
      const shutdown = () => {
        removeServerPid(cwd).finally(() => process.exit(0));
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      openBrowser(url);
      resolve();
    });
  });
}
