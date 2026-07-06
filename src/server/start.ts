import { spawn } from 'node:child_process';
import { createServer } from './http-server.js';
import { createLogger } from './logger.js';
import { generateToken } from './token.js';

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

export async function startServer(cwd: string): Promise<void> {
  const token = generateToken();
  const portRef = { port: 0 };
  const logger = createLogger(cwd);

  await new Promise<void>((resolve) => {
    const server = createServer({ cwd, token, portRef, logger });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      portRef.port = typeof address === 'object' && address ? address.port : 0;
      const url = `http://127.0.0.1:${portRef.port}/?token=${token}`;
      console.log(`my-team is running for ${cwd}`);
      console.log(`Open: ${url}`);
      console.log(`Logging raw requests/responses to: ${logger.filePath}`);
      openBrowser(url);
      resolve();
    });
  });
}
