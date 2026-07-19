#!/usr/bin/env node
/**
 * Stop hook — "keep going until there is genuinely nothing left I can do — unless the human drew a boundary."
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
 * v3 (scope-aware) rubric: by DEFAULT the session runs the plan/TODO to completion — that is the point of the
 * hook. The one boundary that beats the TODO is an EXPLICIT scope limit in the human's latest prompt ("only …",
 * "just …", "nothing else") or a pure question: then delivering exactly that, verified, is the exit. To make
 * that test concrete the hook extracts the human's latest real message from the transcript and echoes it
 * verbatim at the top of the rubric (fail-soft: no injection if it can't be read).
 *
 * Genesis integration (no-ops elsewhere): allows the stop when a usage-guard pause is underway
 * (.scratch/resume.json) or a /genesis build is running (.scratch/acceptance.json — its acceptance gate owns
 * stopping there).
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

function rubric(request) {
  const head = request
    ? ["The human's LATEST request (verbatim, possibly truncated):", `«${request}»`, '']
    : [];
  return head.concat([
    'Re-anchor before deciding — answer from the transcript, not memory:',
    '  REQUEST — what did the human ask in their LATEST prompt, in their words?',
    '  Did it EXPLICITLY limit scope ("only …", "just …", "nothing else", or a pure question)?',
    '',
    '• LIMITED (explicit limit / pure question) — the human drew the boundary; respect it.',
    '  Exit test: is the request itself — all of it — done and verified (output observed, not hoped)?',
    '    – DONE → stop now. Do NOT pick up TODO or adjacent work — the human said not to. If you',
    '      noticed something worth doing, suggest it in one line; the human decides.',
    '    – NOT DONE → finish the request. Stay inside its boundary.',
    '',
    '• EVERYTHING ELSE — the default: this session runs the work to completion.',
    '  Exit test: is EVERY remaining plan/TODO item gated by something ONLY the human can do',
    '  (manual test, visual/UX inspection, real credentials/secrets, live deploy)?',
    '    – YES → stop.',
    '    – NO  → pick the next unblocked item and actually do it (build, verify, commit).',
    '  Never stop to ask which option/stack/approach is best — the human would only say "pick the',
    '  better one". Decide, log why, continue.',
    '',
    'Also valid in either mode: a true roadblock you cannot pass (say what you tried), or the next',
    'step needs something only the human has (a secret, an account, a manual check).',
    '',
    "To stop: one line stating which exit applies + the evidence (e.g. \"LIMITED request 'docs only'",
    'done — README + docs/ updated"), then end your message with exactly HOOK_STOP_OK',
  ]).join('\n');
}

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

// v3: the human's latest REAL message, echoed into the rubric so the scope test is concrete.
// Skips tool_result-only events, meta/command wrappers, interruption stubs, and our own block
// echo ("Stop hook feedback: …" — though if the human typed after the echoed rubric, that tail
// IS the latest request). Fail-soft: returns null and the rubric falls back to "re-read it".
function latestHumanText(transcriptPath, maxLen = 600) {
  const truncate = (t) => (t.length > maxLen ? t.slice(0, maxLen) + ' …[truncated]' : t);
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      let ev;
      try { ev = JSON.parse(lines[i]); } catch { continue; }
      if (ev.type !== 'user' || ev.isMeta || !ev.message) continue;
      const c = ev.message.content;
      let t = '';
      if (typeof c === 'string') t = c;
      else if (Array.isArray(c)) t = c.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      t = (t || '').trim();
      if (!t) continue;                             // tool_result-only event
      if (/^</.test(t)) continue;                   // <command-name>/<local-command…>/<system-reminder> wrappers
      if (/^\[Request interrupted/.test(t)) continue;
      if (/^Stop hook feedback:/.test(t)) {
        const after = t.split(/HOOK_STOP_OK/).pop().trim();   // human text typed after our echoed rubric
        if (after) return truncate(after);
        continue;
      }
      return truncate(t);
    }
  } catch { /* fail-soft: no injection */ }
  return null;
}

const raw = await readStdin();
let data = {};
try { data = JSON.parse(raw || '{}'); } catch { /* ignore */ }

const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Dormant unless armed for this project.
if (!fs.existsSync(path.join(projectDir, '.claude', 'keep-going.on'))) process.exit(0);

// Defer to genesis's own Stop mechanisms — never fight them (no-ops outside a genesis project).
//   usage-guard pause in progress → allow the clean halt (the external resumer relaunches later).
if (fs.existsSync(path.join(projectDir, '.scratch', 'resume.json'))) process.exit(0);
//   /genesis build in progress → the acceptance Stop gate governs stopping, not us.
if (fs.existsSync(path.join(projectDir, '.scratch', 'acceptance.json'))) process.exit(0);

// Marker-file escape hatch (see header): fresh marker = one deliberate stop, then consumed.
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

// Otherwise block the stop and re-inject the rubric (with the latest request echoed) so work continues.
const request = data.transcript_path ? latestHumanText(data.transcript_path) : null;
process.stdout.write(JSON.stringify({ decision: 'block', reason: rubric(request) }));
process.exit(0);
