#!/usr/bin/env node
/**
 * Stop hook — "keep going until there is genuinely nothing left I can do."
 *
 * Registered under .claude/settings.json → hooks.Stop. On every attempt to end a turn the harness runs this
 * script; if it prints {"decision":"block","reason":"…"} the turn does NOT end and `reason` is fed back to the
 * model as its next instruction. So this makes stopping *impossible* unless the exit test below passes —
 * removing the model's stop-reflex from the equation.
 *
 * Opt-in per project: dormant unless `.claude/keep-going.on` exists in the project (so installing the hook does
 * not force autonomy on every session — you flip it on when you want the autonomous run). Portable: drop this
 * file + the settings.json Stop entry into any project, then `touch .claude/keep-going.on` to arm it.
 *
 * Escape hatch: the model may end a message with the sentinel HOOK_STOP_OK — and only then is it allowed to
 * stop. The rubric below tells it exactly when that is permitted.
 *
 * 2026-07-12 hardening: the transcript flushes the final text block AFTER the Stop hook can run, so a
 * legitimately-emitted sentinel was sometimes invisible and the block looped forever. Two fixes:
 * (1) the sentinel scan covers the recent transcript tail, not just the single last assistant event
 *     (content blocks are stored as separate events); and
 * (2) a deterministic marker-file hatch immune to the flush race: before a deliberate stop the model
 *     runs `touch .claude/hook-stop-ok` — a fresh (<3 min) marker allows exactly ONE stop and is consumed.
 */
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const RUBRIC = [
  'DO NOT STOP yet unless the exit test passes. Re-evaluate honestly, right now:',
  '',
  'Is EVERY remaining item in the plan / TODO gated by something ONLY THE HUMAN can do — a manual test, a',
  'visual/UX inspection, real credentials or secrets, or a live deploy?',
  '  • If YES  → you may stop.',
  '  • If NO   → you MUST continue: pick the next unblocked item and actually do it (build, verify, commit).',
  '',
  'If you are unsure which option / stack / library / approach is best: DO NOT ask the human — they will only',
  'tell you to pick the better one. Brainstorm, choose the best option, log the decision, and continue.',
  '',
  'The ONLY valid reasons to stop are:',
  '  (a) every remaining task genuinely needs the human (manual test, visual review, secrets, real deploy), OR',
  '  (b) you hit a true roadblock where it is impossible for you to proceed, OR',
  '  (c) the human asked only a question or a single scoped task and it is fully done.',
  '',
  'When — and only when — one of those holds: briefly say why, then end your message with exactly HOOK_STOP_OK',
].join('\n');

function readStdin() {
  return new Promise((resolve) => {
    let s = '';
    process.stdin.on('data', (d) => (s += d));
    process.stdin.on('end', () => resolve(s));
    process.stdin.resume();
  });
}

function lastAssistantText(transcriptPath) {
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      let ev;
      try { ev = JSON.parse(lines[i]); } catch { continue; }
      if (ev.type === 'assistant' && ev.message && Array.isArray(ev.message.content)) {
        return ev.message.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      }
    }
  } catch { /* fall through to fail-open */ }
  return null;
}

// 2026-07-12 fix: the transcript stores each content block (thinking/text/tool_use) as a SEPARATE
// assistant event, and the final text block may not be flushed (or may not be last) when the Stop
// hook runs — so testing ONLY the single last assistant event missed a legitimately-emitted
// sentinel and looped the block forever. Scan the recent tail instead: any assistant text among
// the last N events counts. N is small enough that a sentinel from an older turn (separated by
// real work = many events) can never linger into a later stop.
function tailHasSentinel(transcriptPath, n = 12) {
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - n); i--) {
      let ev;
      try { ev = JSON.parse(lines[i]); } catch { continue; }
      if (ev.type === 'assistant' && ev.message && Array.isArray(ev.message.content)) {
        const t = ev.message.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
        if (/HOOK_STOP_OK/.test(t)) return true;
      }
    }
  } catch { /* fail-open below */ }
  return false;
}

const raw = await readStdin();
let data = {};
try { data = JSON.parse(raw || '{}'); } catch { /* ignore */ }

const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Dormant unless armed for this project.
if (!fs.existsSync(path.join(projectDir, '.claude', 'keep-going.on'))) process.exit(0);

// Marker-file escape hatch (see header §2): fresh marker = one deliberate stop, then consumed.
const marker = path.join(projectDir, '.claude', 'hook-stop-ok');
try {
  const st = fs.statSync(marker);
  const fresh = Date.now() - st.mtimeMs < 180_000;
  fs.unlinkSync(marker); // consume either way — a stale marker must never linger
  if (fresh) process.exit(0);
} catch { /* absent → fall through */ }

const text = data.transcript_path ? lastAssistantText(data.transcript_path) : null;

// Fail open: if the transcript can't be read, allow the stop — never trap a session with no way out.
if (text === null) process.exit(0);

// Explicit, deliberate completion signal → allow the stop.
if (/HOOK_STOP_OK/.test(text)) process.exit(0);
if (data.transcript_path && tailHasSentinel(data.transcript_path)) process.exit(0);

// Otherwise block the stop and re-inject the rubric so work continues.
process.stdout.write(JSON.stringify({ decision: 'block', reason: RUBRIC }));
process.exit(0);
