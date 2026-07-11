#!/usr/bin/env node
/**
 * Stop hook — "keep going until there is genuinely nothing left I can do."
 *
 * Registered under .claude/settings.json → hooks.Stop. On every attempt to end a turn the harness runs this
 * script; if it prints {"decision":"block","reason":"…"} the turn does NOT end and `reason` is fed back to the
 * model as its next instruction. So this makes stopping *impossible* unless the exit test below passes —
 * removing the model's stop-reflex from the equation.
 *
 * Genesis scaffolds this file into every new project and ARMS it (writes .claude/keep-going.on), so ordinary
 * sessions in a genesis project are persistent by default. Disarm any time by deleting .claude/keep-going.on.
 *
 * It composes with genesis's other two Stop mechanisms instead of fighting them — it ALLOWS the stop when:
 *   • .scratch/resume.json exists  → a usage-guard pause is underway; let the clean halt happen.
 *   • .scratch/acceptance.json exists → a /genesis build is running; the acceptance gate owns stopping there.
 *
 * Escape hatch: the model may end a message with the sentinel HOOK_STOP_OK — and only then is it allowed to
 * stop. The rubric below tells it exactly when that is permitted.
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

const raw = await readStdin();
let data = {};
try { data = JSON.parse(raw || '{}'); } catch { /* ignore */ }

const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Dormant unless armed for this project.
if (!fs.existsSync(path.join(projectDir, '.claude', 'keep-going.on'))) process.exit(0);

// Defer to genesis's own Stop mechanisms — never fight them.
//   usage-guard pause in progress → allow the clean halt (the external resumer relaunches later).
if (fs.existsSync(path.join(projectDir, '.scratch', 'resume.json'))) process.exit(0);
//   /genesis build in progress → the acceptance Stop gate governs stopping, not us.
if (fs.existsSync(path.join(projectDir, '.scratch', 'acceptance.json'))) process.exit(0);

const text = data.transcript_path ? lastAssistantText(data.transcript_path) : null;

// Fail open: if the transcript can't be read, allow the stop — never trap a session with no way out.
if (text === null) process.exit(0);

// Explicit, deliberate completion signal → allow the stop.
if (/HOOK_STOP_OK/.test(text)) process.exit(0);

// Otherwise block the stop and re-inject the rubric so work continues.
process.stdout.write(JSON.stringify({ decision: 'block', reason: RUBRIC }));
process.exit(0);
