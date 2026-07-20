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
 * v3 (scope-aware): the rubric now re-anchors every decision on the human's LATEST prompt — echoed verbatim
 * into the deny reason (fail-soft) — and adds the default for "should I ALSO do X?": if the human explicitly
 * limited scope, the answer is NO (finish the request, suggest X in one line); otherwise, if X serves the
 * goal/TODO, just do it.
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

function rubric(request) {
  const head = request
    ? ["The human's LATEST request (verbatim, possibly truncated):", `«${request}»`, '']
    : [];
  return head.concat([
    'STOP — do not ask this yet. This project runs in decide-yourself mode (.claude/decide-yourself.on):',
    'the human wants you to DECIDE, not hand the decision back. Re-anchor on their LATEST prompt —',
    'every decision serves THAT request, not the global backlog. Decide it yourself when it is:',
    '',
    '  • "What should I build / do first?" → derive the order from the request, docs, and dependency',
    '    graph; pick the highest-value unblocked item and DO it.',
    '  • "Which stack / library / approach / option?" → weigh trade-offs against the goal, choose,',
    '    log one line on why, proceed.',
    '  • "Should I ALSO do X?" → don\'t ask. If the human EXPLICITLY limited scope ("only", "just",',
    '    "nothing else"): the answer is NO — finish the request, then suggest X in one line. Otherwise:',
    '    if X serves the goal / is on the TODO, just DO it — that\'s the default mode. Only a genuine',
    '    change of deliverable is NEEDS-HUMAN.',
    '  • Anything derivable from the code, docs, goal, or a sensible default → derive it.',
    '',
    'Ask the human ONLY when the question needs something you cannot get by reading or thinking:',
    '  – a real secret / credential / access you lack;',
    '  – a SUBJECTIVE preference not implied by the goal or docs;',
    '  – confirmation of a DESTRUCTIVE / irreversible action;',
    '  – a genuine scope change — the deliverable itself would change, or the request as written',
    '    cannot proceed without the human choosing.',
    'Uncertainty or "both options look fine" never qualifies — pick the better one.',
    '',
    'If and ONLY if it meets that bar: re-issue the AskUserQuestion with the token NEEDS-HUMAN in the',
    'question text — that is the only way it reaches the human. Otherwise decide it now and continue.',
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

// The human's latest REAL message (same fail-soft extraction as keep-going.mjs).
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
      if (!t) continue;
      if (/^</.test(t)) continue;
      if (/^\[Request interrupted/.test(t)) continue;
      if (/^Stop hook feedback:/.test(t)) {
        const after = t.split(/HOOK_STOP_OK/).pop().trim();
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
try { data = JSON.parse(raw || '{}'); } catch { /* ignore — fall through to fail-open */ }

const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Dormant unless armed for this project.
if (!fs.existsSync(path.join(projectDir, '.claude', 'decide-yourself.on'))) process.exit(0);

// Only gate the question tool (the settings matcher already scopes to it; re-check defensively).
if ((data.tool_name || '') !== 'AskUserQuestion') process.exit(0);

// Escape hatch: the model marked this a human-only question → let it through.
if (/NEEDS-HUMAN/i.test(JSON.stringify(data.tool_input || {}))) process.exit(0);

// Otherwise deny the question and tell the model to decide for itself (latest request echoed).
const request = data.transcript_path ? latestHumanText(data.transcript_path) : null;
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: rubric(request),
  },
}));
process.exit(0);
