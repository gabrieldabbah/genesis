#!/usr/bin/env node
/**
 * stop-acceptance.mjs — genesis acceptance Stop gate.
 *
 * Checks one fact: a genesis build is in flight (.scratch/acceptance.json exists) and its own acceptance
 * file says the criteria are not met. It does not judge whether the work is good; the build wrote that file.
 *
 * SELF-INERT: with no .scratch/acceptance.json it does nothing, so it never touches an ordinary session.
 * Two independent backstops stop it insisting forever: the build's own iteration ceiling, and a count of
 * the blocks this script itself has issued.
 *
 * Stop-hook contract (confirm the shape against the hooks docs for your build):
 *   - print {"decision":"block","reason":"..."} to keep the session going (Claude gets the reason), OR
 *   - print nothing / exit 0 to allow the stop.
 * Written defensively: any parse problem allows the stop (fail-open) so it can never wedge a session.
 *
 * Node rather than shell, deliberately. The shell version parsed with `jq`, which neither macOS nor Windows
 * ships — and a missing `jq` disarmed this gate silently, since the fail-open path is indistinguishable from
 * a finished build. Node runs the same on every platform Claude Code supports, including native Windows
 * where a .sh file cannot be executed at all without Git for Windows.
 */
'use strict';
import fs from 'node:fs';
import path from 'node:path';

function readStdin() {
  return new Promise((resolve) => {
    let s = '';
    process.stdin.on('data', (d) => (s += d));
    process.stdin.on('end', () => resolve(s));
    process.stdin.resume();
  });
}

const raw = await readStdin();
let data = {};
try { data = JSON.parse(raw || '{}'); } catch { /* ignore — the payload is not what we read the state from */ }

try {
  const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const accPath = path.join(projectDir, '.scratch', 'acceptance.json');

  let acc;
  try { acc = JSON.parse(fs.readFileSync(accPath, 'utf8')); } catch { process.exit(0); }
  // Not a genesis run, or a malformed/empty file → allow the stop. Never wedge on corruption.
  if (acc === null || typeof acc !== 'object' || Array.isArray(acc)) process.exit(0);

  // Non-integer counters fall back to their defaults; they must never fall through to a block.
  const int = (v, dflt) => (Number.isInteger(v) && v >= 0 ? v : dflt);
  const iteration = int(acc.iteration, 0);
  const maxIterations = int(acc.max_iterations, 50);

  // Runaway backstop: at the iteration ceiling the build escalates to the human, so allow the stop.
  if (iteration >= maxIterations) process.exit(0);

  const blocksFile = path.join(projectDir, '.scratch', '.stop-blocks');

  if (acc.criteria_met === true) {
    try { fs.unlinkSync(blocksFile); } catch { /* absent → nothing to reset */ }
    process.exit(0); // criteria observed green → allow the stop
  }

  // Self-incrementing backstop: the ceiling above relies on the build updating .iteration. Count our own
  // blocks too, so a session that never updates acceptance.json (or a stale file) can't be re-blocked forever.
  let blocks = 0;
  try { blocks = int(Number.parseInt(fs.readFileSync(blocksFile, 'utf8'), 10), 0); } catch { /* absent → 0 */ }
  if (blocks >= maxIterations) process.exit(0); // we alone have blocked this many times → a human should look

  try {
    fs.mkdirSync(path.dirname(blocksFile), { recursive: true });
    fs.writeFileSync(blocksFile, String(blocks + 1));
  } catch { process.exit(0); } // cannot record the block → do not block

  const open = Array.isArray(acc.open) ? acc.open.join('; ') : '';
  const reason =
    `A genesis build is in flight and its acceptance criteria are not yet met ` +
    `(iteration ${iteration}/${maxIterations}). Open: ${open || 'unspecified'}. Continue the build, and ` +
    `update .scratch/acceptance.json with what you observed. If the remaining work genuinely needs the ` +
    `operator, record it in docs/DEPLOYMENT.md and set criteria_met=true — that is a finished run, not a ` +
    `shortcut.`;

  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
} catch {
  process.exit(0); // fail open, always — never wedge a session
}
