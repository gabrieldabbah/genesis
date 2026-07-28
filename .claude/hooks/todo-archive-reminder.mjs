#!/usr/bin/env node
/**
 * Stop hook — a completed TODO section is moved, not ticked.
 *
 * The failure it prevents: a live TODO file that accumulates finished work until nothing distinguishes it
 * from open work, so every item has to be re-read and re-verified by hand to find out what is left. A
 * completed section belongs in the dated archive; the live file holds what remains.
 *
 * This hook checks a fact — a section that is entirely complete and still in the live file — and blocks the
 * stop once with a note saying which. It does not override a decision: if the flagged section actually has
 * work pending, marking that work open is the correct response and the flag goes away.
 *
 * How it detects (state-based, no git needed — robust in repos that commit rarely): it flags the
 * OUTERMOST heading SECTION that is entirely complete but still sitting in the live TODO — i.e. a
 * `##`/`###`/deeper section whose span holds ≥1 `- [x]` and ZERO open markers (`- [ ]`/`- [~]`/`- [?]`).
 * Section granularity is deliberate: repos accumulate `[x]` items DURING active work (a section in
 * progress holds both done and pending items), so flagging individual `[x]` bullets is hopelessly
 * noisy — only a whole unit that is 100% done and unmoved is a real miss. A section with even one open
 * item (or a `[?]` "shipped-but-unverified" parent, which reads as open) is left alone, and so are its
 * `[x]` children. Reporting the OUTERMOST such section avoids double-flagging a done sub-section inside
 * a done parent. Moving the section (deleting it) makes the flag vanish.
 *
 * It also flags a second failure the section check is designed to be blind to: a ticked item that is a
 * settled QUESTION rather than a done work-step. A `[x]` whose text opens with an ask-verb
 * (confirm/check/verify/validate/decide) or carries a settled stamp (CONFIRMED/VERIFIED/SETTLED/ANSWERED)
 * was "find out X", and once X is known it is a fact — facts live in the docs or the archive, not the live
 * TODO. These hide inside sections that still hold open work, which the section check skips wholesale, so
 * they are detected per line. Ordinary prose ("adds a Verified badge") does not match; the markers are
 * deliberate.
 *
 * Portable + auto-detecting: finds the TODO file (TODO.md or docs/TODO.md) and its archive
 * (TODO-COMPLETED.md / TODO-DONE.md / docs/TODO-done.md / …) by trying the known names. No-ops in any
 * repo that lacks both, so it is safe to drop into any project. Registered under
 * .claude/settings(.local).json → hooks.Stop.
 *
 * Safety: FAILS OPEN on every error (never traps a session with no way out). Loop-safe two ways —
 * it stays silent when the harness re-invokes it (`stop_hook_active`), and it blocks at most once per
 * distinct violation signature via a short-lived marker file. So a genuine miss blocks until you move
 * it; a false positive on a substep blocks once, then lets you stop again. Off-switch: `touch
 * .claude/todo-archive.off` disarms it without editing settings.
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
try { data = JSON.parse(raw || '{}'); } catch { /* ignore */ }

try {
  const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Never loop: if the harness is already continuing because of a stop hook, stay silent.
  if (data.stop_hook_active) process.exit(0);

  // Easy off-switch: `touch .claude/todo-archive.off` disarms this hook without editing settings.
  if (fs.existsSync(path.join(projectDir, '.claude', 'todo-archive.off'))) process.exit(0);

  const firstExisting = (cands) =>
    cands.map((c) => path.join(projectDir, c)).find((p) => {
      try { return fs.statSync(p).isFile(); } catch { return false; }
    });

  const todo = firstExisting(['TODO.md', 'docs/TODO.md']);
  // Order matters on case-insensitive filesystems (macOS): a stat() for TODO-DONE.md matches a file named
  // TODO-done.md, so list spellings in the order a repository is most likely to actually use them — the
  // reminder should name the file with the casing that repository chose.
  const archive = firstExisting([
    'TODO-COMPLETED.md', 'TODO-done.md', 'TODO-DONE.md', 'TODO-COMPLETE.md',
    'docs/TODO-done.md', 'docs/TODO-COMPLETED.md', 'docs/TODO-DONE.md', 'docs/TODO-COMPLETE.md',
  ]);
  if (!todo || !archive) process.exit(0); // not a TODO-tracked repo → nothing to guard

  const rel = (p) => path.relative(projectDir, p);

  const lines = fs.readFileSync(todo, 'utf8').split('\n');
  const headerRe = /^(#{2,6})\s+(.*)$/;              // ## .. ###### heading
  const openRe = /^\s*[-*] \[[ ~?]\]/;               // an OPEN checkbox at any indent
  const doneRe = /^\s*[-*] \[[xX]\]/;                // a DONE checkbox at any indent
  const clean = (s) => s.replace(/[*_`#]/g, '').trim();

  // Collect heading sections (## and deeper), each spanning to the next heading of the same-or-higher
  // level, and tally the open/done checkboxes inside each span.
  const heads = [];
  for (let i = 0; i < lines.length; i++) {
    const h = headerRe.exec(lines[i]);
    if (h) heads.push({ level: h[1].length, start: i, title: clean(h[2]), end: lines.length });
  }
  for (let s = 0; s < heads.length; s++) {
    for (let t = s + 1; t < heads.length; t++) {
      if (heads[t].level <= heads[s].level) { heads[s].end = heads[t].start; break; }
    }
    let hasOpen = false, hasDone = false;
    for (let j = heads[s].start + 1; j < heads[s].end; j++) {
      if (openRe.test(lines[j])) { hasOpen = true; break; }   // one open marker disqualifies the unit
      if (doneRe.test(lines[j])) hasDone = true;
    }
    heads[s].done = hasDone && !hasOpen;
  }

  // Persistent REFERENCE/guidance sections legitimately keep `[x]` content and are never "moved out"
  // (a protocol, a legend, an option-set, a checklist template). Skip them — they aren't archivable work.
  const referenceHeading = /\b(protocol|playbook|guideline|guidelines|reference|conventions?|legend|template|option sets?|principles?|read (?:first|me)|how[ -]?to|glossary|index|table of contents)\b/i;

  // Report the OUTERMOST fully-done section (skip a done sub-section nested in a done parent).
  const offenders = [];
  let coveredUntil = -1;
  for (const h of heads) {
    if (!h.done) continue;
    if (h.start < coveredUntil) continue;            // already inside a reported done parent
    coveredUntil = h.end;
    if (referenceHeading.test(h.title)) continue;    // reference/guidance section — not archivable work
    let t = h.title; if (t.length > 70) t = t.slice(0, 70) + '…';
    offenders.push(t || '(untitled section)');
  }

  // A checked item whose text is a settled QUESTION is a fact wearing a checkbox — and it hides in the
  // section check's designed blind spot (a section with open items is skipped wholesale). A done WORK-STEP
  // inside an in-progress section legitimately stays; an ANSWERED QUESTION never does: its whole content
  // was "find out X", and once X is known it is a fact, and facts live in the docs, not the TODO.
  // (2026-07-28: a `[x] confirm <env flag> on the host — CONFIRMED` line sat inside an open section and no
  // check could see it.) Detected: a [x] line that opens with an ask-verb, or carries an all-caps settled
  // stamp — deliberate markers, so ordinary prose ("adds a Verified badge") stays clear of it.
  const doneItemRe = /^\s*[-*] \[[xX]\]\s*(.*)$/;
  const askVerbRe = /^(?:confirm|check|verify|revalidate|validate|decide)\b/i;
  const stampRe = /\b(?:CONFIRMED|VERIFIED|SETTLED|ANSWERED)\b/;
  for (let i = 0; i < lines.length; i++) {
    const m = doneItemRe.exec(lines[i]);
    if (!m) continue;
    const plain = m[1].replace(/[^\p{L}\p{N}\s=._-]/gu, '').trim(); // strip markdown/emoji, keep words
    if (askVerbRe.test(plain) || stampRe.test(m[1])) {
      let t = plain || m[1]; if (t.length > 60) t = t.slice(0, 60) + '…';
      offenders.push(`settled fact still ticked at line ${i + 1}: "${t}" — move it to the docs/archive`);
    }
  }

  if (offenders.length === 0) process.exit(0);

  // Loop-safety backstop: block at most once per distinct set of offenders.
  const sig = offenders.slice(0, 20).join('|');
  const marker = path.join(projectDir, '.claude', '.todo-archive-nudged');
  try {
    const prev = fs.readFileSync(marker, 'utf8');
    const fresh = Date.now() - fs.statSync(marker).mtimeMs < 600_000;
    if (prev === sig && fresh) { fs.unlinkSync(marker); process.exit(0); } // already nudged this exact set
  } catch { /* absent → fall through */ }
  try { fs.mkdirSync(path.dirname(marker), { recursive: true }); fs.writeFileSync(marker, sig); } catch { /* ignore */ }

  const list = offenders.slice(0, 5).map((t) => `  • ${t}`).join('\n');
  const more = offenders.length > 5 ? `\n  …and ${offenders.length - 5} more` : '';
  const reason = [
    `${offenders.length} finding(s) in ${rel(todo)} — finished work still sitting in the live file (a section`,
    'holding only completed items, or a settled fact ticked `[x]`):',
    list + more,
    '',
    `Move each one: delete it from ${rel(todo)} and append it to ${rel(archive)} under a dated heading.`,
    'A live file that accumulates finished work has to be re-read in full to find what is left.',
    '',
    'If a flagged section actually has work still pending, mark that work `[ ]`/`[~]`/`[?]` rather than `[x]`',
    'so it reads as open. Check the prose too — an item whose body says "pending" while ticked, or a heading',
    'that contradicts its own body, is what this flag is really for.',
  ].join('\n');
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
} catch {
  process.exit(0); // fail open, always — never trap a session
}
