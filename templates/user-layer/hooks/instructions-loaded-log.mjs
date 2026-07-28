#!/usr/bin/env node
/**
 * InstructionsLoaded hook — records which instruction files a session actually loaded.
 *
 * Purely observational: appends one JSON line per session to ~/.claude/instructions-loaded.jsonl
 * and emits nothing, so it can never block or slow a turn perceptibly.
 *
 * Why it exists: whether a change to a CLAUDE.md, a rule, or a skill actually reached a session is
 * otherwise unobservable — you can only infer it from behaviour, which is exactly the inference that
 * is unreliable. This makes it a fact you can read.
 *
 * Inspect:
 *   tail -3 ~/.claude/instructions-loaded.jsonl | jq .
 *   jq -r 'select(.cwd | test("<repo-name>")) | .files[]?' ~/.claude/instructions-loaded.jsonl | sort -u
 *
 * Fails open on every error. The payload shape is not depended on: whatever arrives is recorded
 * as-is, with a shallow summary alongside it.
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

try {
  const raw = await readStdin();
  let data = {};
  try { data = JSON.parse(raw || '{}'); } catch { /* record it raw below */ }

  // Pull anything that looks like a file path out of the payload, without assuming its shape.
  const files = new Set();
  const walk = (v, depth) => {
    if (depth > 6 || v == null) return;
    if (typeof v === 'string') {
      if (/\.(md|mdc)$/i.test(v) || /CLAUDE\.md|AGENTS\.md|\.claude\/rules/i.test(v)) files.add(v);
      return;
    }
    if (Array.isArray(v)) { for (const x of v) walk(x, depth + 1); return; }
    if (typeof v === 'object') { for (const k of Object.keys(v)) walk(v[k], depth + 1); }
  };
  walk(data, 0);

  const line = JSON.stringify({
    at: new Date().toISOString(),
    cwd: data.cwd || process.env.CLAUDE_PROJECT_DIR || null,
    session: data.session_id || null,
    files: [...files],
    raw: data,
  });

  const log = path.join(os.homedir(), '.claude', 'instructions-loaded.jsonl');
  // Keep the log from growing without bound: rotate past ~2 MB.
  try {
    if (fs.statSync(log).size > 2_000_000) fs.renameSync(log, log + '.1');
  } catch { /* absent → nothing to rotate */ }
  fs.appendFileSync(log, line + '\n');
} catch {
  /* fail open, always — this hook must never affect a turn */
}
process.exit(0);
