import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAuth } from './auth-check.js';
import { ChatSession } from './chat-session.js';
import { tokensMatch } from './token.js';

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
  const { cwd, token, portRef } = options;
  const chatSession = new ChatSession();

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
      const result = await checkAuth(cwd);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      if (chatSession.isBusy()) {
        res.writeHead(409, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'busy' }));
        return;
      }
      let message: string;
      try {
        const body = await readJsonBody(req);
        message = String(body.message ?? '');
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
      for await (const event of chatSession.sendTurn(message, cwd)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.end();
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  });
}
