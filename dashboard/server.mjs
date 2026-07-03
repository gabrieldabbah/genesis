#!/usr/bin/env node
// Genesis Dashboard server — dependency-free (Node built-ins only). Localhost only.
// Bridges a local PWA to a genesis run via two files in the project's .scratch/:
//   dashboard-state.json  (genesis -> dashboard, rendered live)
//   dashboard-inbox.jsonl (dashboard -> genesis, one intent per line)
// Connect-buttons write keys straight into .env (git-ignored, never logged).

import http from 'node:http';
import { readFile, appendFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, watch, createReadStream } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const ROOT = process.cwd();
const PUBLIC = fileURLToPath(new URL('./public/', import.meta.url));
const SCRATCH = join(ROOT, '.scratch');
const STATE = join(SCRATCH, 'dashboard-state.json');
const INBOX = join(SCRATCH, 'dashboard-inbox.jsonl');
const ENVFILE = join(ROOT, '.env');
const PORT = Number(process.env.GENESIS_DASHBOARD_PORT) || 4319;
const TOKEN = process.env.GENESIS_DASHBOARD_TOKEN || randomBytes(9).toString('hex');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

const KEY_RE = /^[A-Z][A-Z0-9_]*$/;             // env var names only
const emptyState = () => ({ project: null, phases: [], todo: [], integrations: [],
  activity: 'Dashboard connected. Waiting for genesis to start writing state…',
  paused: false, usage: { known: false }, acceptance: {}, needsHuman: null });

function authed(req, url) {
  const t = url.searchParams.get('token') || req.headers['x-genesis-token'];
  return t === TOKEN;
}
function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
async function readState() {
  try { return JSON.parse(await readFile(STATE, 'utf8')); } catch { return emptyState(); }
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = ''; req.on('data', (c) => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}
async function upsertEnv(key, value) {
  let lines = [];
  if (existsSync(ENVFILE)) lines = (await readFile(ENVFILE, 'utf8')).split('\n');
  const idx = lines.findIndex((l) => l.startsWith(key + '='));
  const line = `${key}=${value}`;
  if (idx >= 0) lines[idx] = line; else lines.push(line);
  await writeFile(ENVFILE, lines.join('\n').replace(/\n+$/, '') + '\n', { mode: 0o600 });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  // ---- API (token-gated) ----
  if (p.startsWith('/api/')) {
    if (!authed(req, url)) return send(res, 401, { error: 'bad token' });

    if (p === '/api/state' && req.method === 'GET') return send(res, 200, await readState());

    if (p === '/api/events' && req.method === 'GET') {            // SSE: push state on change
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache',
        connection: 'keep-alive' });
      const push = async () => res.write(`data: ${JSON.stringify(await readState())}\n\n`);
      await push();
      const watcher = existsSync(SCRATCH) ? watch(SCRATCH, (_e, f) => { if (f && String(f).includes('dashboard-state')) push(); }) : null;
      const ka = setInterval(() => res.write(': keep-alive\n\n'), 25000);
      req.on('close', () => { clearInterval(ka); watcher && watcher.close(); });
      return;
    }

    if (p === '/api/intent' && req.method === 'POST') {           // dashboard -> genesis
      const body = await readBody(req);
      if (!body.type) return send(res, 400, { error: 'intent needs a type' });
      await mkdir(SCRATCH, { recursive: true });
      await appendFile(INBOX, JSON.stringify({ ...body, at: new Date().toISOString() }) + '\n');
      return send(res, 200, { ok: true });
    }

    if (p === '/api/env' && req.method === 'POST') {              // connect a service: write a key locally
      const { key, value } = await readBody(req);
      if (!KEY_RE.test(key || '')) return send(res, 400, { error: 'invalid key name' });
      if (typeof value !== 'string' || !value) return send(res, 400, { error: 'empty value' });
      if (/[\r\n]/.test(value)) return send(res, 400, { error: 'value must be a single line' });
      await upsertEnv(key, value);                                // never logged, mode 0600
      return send(res, 200, { ok: true, key, value: '****' });    // masked
    }
    return send(res, 404, { error: 'no such endpoint' });
  }

  // ---- static PWA ----
  let rel = normalize(p === '/' ? '/index.html' : p).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC) || !existsSync(file)) return send(res, 404, 'not found', 'text/plain');
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  const u = `http://127.0.0.1:${PORT}/?token=${TOKEN}`;
  console.log(`\n  Genesis dashboard → ${u}\n  (localhost only; token-gated; Ctrl+C to stop)\n`);
});
