#!/usr/bin/env node
/**
 * UserPromptSubmit hook — scheduled re-grounding of the operator's law.
 *
 * WHY: instructions at the very start of a long context lose behavioral pull as hundreds of
 * thousands of tool-output tokens accumulate on top of them — the text is still "in context,"
 * but recency wins attention. (Operator-observed across sessions, ~200k felt cliff.) The fix is
 * to re-inject the standing instructions NEAR THE TAIL, where attention actually looks, every
 * INTERVAL tokens of context growth.
 *
 * HOW (each fact verified against code.claude.com/docs/en/hooks + a real transcript, 2026-07-28):
 *  - stdin JSON carries `transcript_path`, `session_id`, `cwd`; there is NO token-usage field,
 *    so context size is derived from the transcript itself: the LAST assistant entry's
 *    usage.input_tokens + cache_read_input_tokens + cache_creation_input_tokens.
 *  - Output is `hookSpecificOutput.additionalContext` (exit 0), which the harness injects
 *    alongside the submitted prompt.
 *  - UserPromptSubmit budget is 30s — so only the transcript TAIL is read (last 256 KB), never
 *    the whole file.
 *
 * WHAT IT INJECTS: ~/.claude/CLAUDE.md and <cwd>/CLAUDE.md, verbatim, under a header saying what
 * this is. Injections repeat every INTERVAL tokens (marker file per session tracks the last one).
 *
 * SAFETY: fails open on every error — a broken hook must never block a prompt. Markers older
 * than 7 days are pruned. Tune the cadence with CLAUDE_REGROUND_INTERVAL (tokens, default 150000).
 */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function readStdin() {
  return new Promise((resolve) => {
    let s = '';
    process.stdin.on('data', (d) => (s += d));
    process.stdin.on('end', () => resolve(s));
    process.stdin.resume();
  });
}

const INTERVAL = Math.max(50_000, Number(process.env.CLAUDE_REGROUND_INTERVAL) || 150_000);
const TAIL_BYTES = 256 * 1024;

try {
  const data = JSON.parse((await readStdin()) || '{}');
  const transcript = data.transcript_path;
  const sessionId = String(data.session_id || 'unknown').replace(/[^a-zA-Z0-9-]/g, '');
  if (!transcript || !fs.existsSync(transcript)) process.exit(0);

  // Context size = the last assistant message's full input-side usage, read from the tail only.
  const fd = fs.openSync(transcript, 'r');
  const size = fs.fstatSync(fd).size;
  const start = Math.max(0, size - TAIL_BYTES);
  const buf = Buffer.alloc(size - start);
  fs.readSync(fd, buf, 0, buf.length, start);
  fs.closeSync(fd);
  const tail = buf.toString('utf8');

  let ctx = 0;
  const usageRe = /"usage":\{"input_tokens":(\d+),"cache_creation_input_tokens":(\d+),"cache_read_input_tokens":(\d+)/g;
  for (let m; (m = usageRe.exec(tail)); ) ctx = Number(m[1]) + Number(m[2]) + Number(m[3]);
  if (ctx < INTERVAL) process.exit(0);

  // One marker per session: the context size at the last injection. Prune stale markers.
  const dir = path.join(os.homedir(), '.claude', '.reground');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    try { if (Date.now() - fs.statSync(path.join(dir, f)).mtimeMs > 7 * 86_400_000) fs.unlinkSync(path.join(dir, f)); } catch { /* ignore */ }
  }
  const marker = path.join(dir, sessionId);
  let last = 0;
  try { last = Number(fs.readFileSync(marker, 'utf8')) || 0; } catch { /* first time */ }
  if (ctx - last < INTERVAL) process.exit(0);

  const pieces = [];
  const globalMd = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  const repoMd = data.cwd ? path.join(data.cwd, 'CLAUDE.md') : null;
  for (const [label, p] of [['system-wide ~/.claude/CLAUDE.md', globalMd], ['repository CLAUDE.md', repoMd]]) {
    try { if (p && fs.existsSync(p)) pieces.push(`--- ${label} (verbatim) ---\n\n${fs.readFileSync(p, 'utf8')}`); } catch { /* skip */ }
  }
  if (pieces.length === 0) process.exit(0);

  fs.writeFileSync(marker, String(ctx));
  const header =
    `SCHEDULED RE-GROUNDING (context ≈ ${Math.round(ctx / 1000)}k tokens). The operator's standing ` +
    `instructions follow, re-injected verbatim because instruction weight decays with distance from ` +
    `the context tail. This is the same law loaded at session start — not new input, not a user ` +
    `message. Re-read it now and obey it as if just read, especially: the seam (no claim without ` +
    `origin, no write without postcondition, no method by imitation), the gate, and the TODO rules.`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `${header}\n\n${pieces.join('\n\n')}`,
    },
  }));
  process.exit(0);
} catch {
  process.exit(0); // fail open, always — never block a prompt
}
