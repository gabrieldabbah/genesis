#!/usr/bin/env node
/**
 * decide-yourself hook — "answer it yourself; only ask the human when strictly necessary."
 *
 * A PreToolUse hook, scoped in .claude/settings.json to the AskUserQuestion tool
 * (`"matcher": "AskUserQuestion"`). When the model tries to ask the human a question, this hook DENIES it and
 * feeds back a rubric telling the model to decide for itself — UNLESS the question is one only a human can
 * answer, in which case the model re-issues it with the token NEEDS-HUMAN and it goes through.
 *
 * Companion to keep-going.mjs: that one (a Stop hook) stops the model ENDING a turn early; this one stops it
 * ASKING early. They are independent — separate files, separate arm flags, separate events.
 *
 * Opt-in per project: dormant unless `.claude/decide-yourself.on` exists. Arm it:  touch .claude/decide-yourself.on
 *
 * PreToolUse blocking contract (Claude Code): print to stdout and exit 0 —
 *   {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}
 * The reason is fed back to the model as its next instruction. Fails open: any doubt → allow the tool.
 *
 * Escape: put the token NEEDS-HUMAN anywhere in the AskUserQuestion call and the question is allowed through —
 * reserved for questions a human alone can settle: a real secret/credential/access you lack, a SUBJECTIVE
 * personal preference not implied by the goal or docs, confirmation of a DESTRUCTIVE/irreversible action, or a
 * genuine scope change. "What to build first?" and "which stack/approach is best?" NEVER qualify — decide those.
 */
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const RUBRIC = [
  'STOP — do not ask this. This project runs in decide-yourself mode (.claude/decide-yourself.on): the human',
  'wants you to DECIDE, not hand the decision back. Almost every question here you can answer yourself:',
  '',
  '  • "What should I build / do first?"  → derive the order yourself from the goal, the docs, and the',
  '    dependency graph; pick the highest-value unblocked item and DO it.',
  '  • "Which stack / library / framework / approach / option is best?"  → read the docs and the goal, weigh',
  '    the trade-offs, choose the best one, briefly log why you chose it, and proceed.',
  '  • Anything derivable from the code, the documentation, the goal, or a sensible default → derive it.',
  '',
  'A question is for the human ONLY when it needs something you cannot get by thinking or reading:',
  '  – a real secret / credential / access you do not have;',
  '  – a SUBJECTIVE personal preference not implied by the goal or the docs;',
  '  – confirmation of a DESTRUCTIVE or irreversible action; or',
  '  – a genuine scope change that alters what the deliverable is.',
  'Uncertainty, wanting reassurance, or "two options both look reasonable" do NOT qualify — pick the better one.',
  '',
  'If and ONLY if it truly meets that bar: re-issue the AskUserQuestion call with the token NEEDS-HUMAN in the',
  'question text — that is the only way it reaches the human. Otherwise decide it yourself now and continue.',
].join('\n');

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
try { data = JSON.parse(raw || '{}'); } catch { /* ignore — fall through to fail-open */ }

const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Dormant unless armed for this project.
if (!fs.existsSync(path.join(projectDir, '.claude', 'decide-yourself.on'))) process.exit(0);

// Only gate the question tool (the settings matcher already scopes to it; re-check defensively).
if ((data.tool_name || '') !== 'AskUserQuestion') process.exit(0);

// Escape hatch: the model marked this a human-only question → let it through.
if (/NEEDS-HUMAN/i.test(JSON.stringify(data.tool_input || {}))) process.exit(0);

// Otherwise deny the question and tell the model to decide for itself.
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: RUBRIC,
  },
}));
process.exit(0);
