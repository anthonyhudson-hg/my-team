import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OWN_PACKAGE_NAME } from '../own-package.js';
import { npmInstall } from '../npm-install.js';
import { checkAuth } from './auth-check.js';
import { readHistory } from './chat-history.js';
import { ChatSession } from './chat-session.js';
import type { Logger } from './logger.js';
import { readProfile, validateProfileInput, writeProfile } from './profile.js';
import { resetInstance } from './reset.js';
import { tokensMatch } from './token.js';
import type { UpdateInfo } from './update-check.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, '..', 'web');

const STATIC_FILES: Record<string, { file: string; contentType: string }> = {
  '/': { file: 'index.html', contentType: 'text/html; charset=utf-8' },
  '/app.js': { file: 'app.js', contentType: 'text/javascript; charset=utf-8' },
  '/style.css': { file: 'style.css', contentType: 'text/css; charset=utf-8' },
};

export interface CreateServerOptions {
  cwd: string;
  token: string;
  /** Mutable box so the real port (known only after listen() resolves) can be read at request time. */
  portRef: { port: number };
  logger: Logger;
  /** Mutable box: null until the background registry check resolves. */
  updateInfoRef: { current: UpdateInfo | null };
}

function isAllowedHost(hostHeader: string | undefined, port: number): boolean {
  if (!hostHeader) return false;
  return hostHeader === `127.0.0.1:${port}` || hostHeader === `localhost:${port}`;
}

function getToken(req: http.IncomingMessage, url: URL): string | undefined {
  return (req.headers['x-my-team-token'] as string | undefined) ?? url.searchParams.get('token') ?? undefined;
}

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? JSON.parse(raw) : {};
}

export function createServer(options: CreateServerOptions): http.Server {
  const { cwd, token, portRef, logger, updateInfoRef } = options;
  const chatSession = new ChatSession(logger);

  return http.createServer(async (req, res) => {
    if (!isAllowedHost(req.headers.host, portRef.port)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Bad Host header');
      return;
    }

    const url = new URL(req.url ?? '/', `http://127.0.0.1:${portRef.port}`);

    const staticEntry = req.method === 'GET' ? STATIC_FILES[url.pathname] : undefined;
    if (staticEntry) {
      try {
        const body = await readFile(path.join(WEB_DIR, staticEntry.file));
        res.writeHead(200, { 'Content-Type': staticEntry.contentType }).end(body);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      }
      return;
    }

    if (!url.pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }

    if (!tokensMatch(token, getToken(req, url))) {
      res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const result = await checkAuth(cwd, logger);
      const body = result.ok ? { ...result, profile: await readProfile(cwd) } : result;
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/meta') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({ logFilePath: logger.filePath, updateInfo: updateInfoRef.current }),
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/update') {
      const info = updateInfoRef.current;
      if (!info?.updateAvailable || !info.latestVersion) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'no update available' }));
        return;
      }
      const ok = npmInstall(cwd, `${OWN_PACKAGE_NAME}@${info.latestVersion}`);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/chat/history') {
      const history = await readHistory(cwd);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ history }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/profile') {
      const profile = await readProfile(cwd);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ profile }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/profile') {
      let body: any;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'invalid body' }));
        return;
      }
      const validated = validateProfileInput(body);
      if ('error' in validated) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify(validated));
        return;
      }
      await writeProfile(cwd, validated);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/reset') {
      if (chatSession.isBusy()) {
        res.writeHead(409, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'busy' }));
        return;
      }
      await resetInstance(cwd);
      chatSession.reset();
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      if (chatSession.isBusy()) {
        res.writeHead(409, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'busy' }));
        return;
      }
      let message: string;
      let model: string | undefined;
      let effort: string | undefined;
      let isWidgetAnswer: boolean;
      try {
        const body = await readJsonBody(req);
        message = String(body.message ?? '');
        model = typeof body.model === 'string' && body.model ? body.model : undefined;
        effort = typeof body.effort === 'string' && body.effort ? body.effort : undefined;
        isWidgetAnswer = body.isWidgetAnswer === true;
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'invalid body' }));
        return;
      }
      if (!message.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'empty message' }));
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      for await (const event of chatSession.sendTurn(message, cwd, { model, effort, isWidgetAnswer })) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.end();
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  });
}
